import { Program, Provider } from "@coral-xyz/anchor";
import { PumpFun, IDL } from "./IDL";
import {
  Commitment, 
  Connection, 
  Finality, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  VersionedTransaction,
} from "@solana/web3.js";
import { TokenMetadataType, PriorityFee } from "./types";
import { 
  buildTx, 
  calculateWithSlippageBuy, 
  calculateWithSlippageSell, 
  chunkArrayByCondition, 
  DEFAULT_COMMITMENT, 
  DEFAULT_FINALITY, 
  extendLut, 
  getAllAccountsForLUT, 
  getSPLBalance,
  initializeLUT,
} from "../helper/util";
import { 
  createAssociatedTokenAccountInstruction, 
  getAccount, 
  getAssociatedTokenAddress 
} from "@solana/spl-token";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { GlobalAccount } from "./globalAccount";
import { BN } from "bn.js";
import { jitoTipIx, jitoWithAxios } from "../helper/jitoWithAxios";
import { chunk } from "lodash";
import { lutProviders } from "../config";
import { getValue, setValue } from "../cache/query";
import { isKeyObject } from "node:util/types";
import { Key } from "../cache/keys";


export const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"; // pumpfun program
export const MPL_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"; 
export const FEE_RECIPICEMT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"); // global.fee_repicient
export const EVENT_AUTHORITY = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
export const GLOBAL_ACCOUNT = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"); // pumpfun global account
export const MINT_AUTHORITY = new PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM");


export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";
export const ixChunkLimit = 5; // instruction chunk limit is 3 if we don't use ALT, otherwise it's 5
export const extendLimt = 15; // address lookup table extend limit

export const DEFAULT_DECIMALS = 6;
export const DEFAULT_POW = Math.pow(10, DEFAULT_DECIMALS);

export class PumpFunSDK {
  public program: Program<PumpFun>;
  public connection: Connection;
  constructor(provider?: Provider) {
    this.program = new Program<PumpFun>(IDL as PumpFun, provider);
    this.connection = this.program.provider.connection;
  }

  async launchToken(
    payer: Keypair, // payer is fundAccount
    mint: Keypair, 
    buyers: Keypair[], // [devAccount, buyAccount]
    commonAccounts: Keypair[],
    tokenInfo: TokenMetadataType,
    buyAmountsSol: bigint[],
    jitoFee: number,
    authKey: string,
    slippageBasisPoints: bigint = 300n,
    priorityFees?: PriorityFee, // set unitLimit and unitPrice
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      
      let [ createLutIx, lut ] = await initializeLUT(this.connection, payer.publicKey);
      if (!createLutIx) throw Error(lut as string);
      
      let lutTx = new Transaction();
      lutTx.add(createLutIx as TransactionInstruction); // add creating address lookup table instruction
      let accounts = getAllAccountsForLUT(
        mint.publicKey, 
        payer.publicKey, 
        [...buyers, ...commonAccounts]
      );
      
      lutTx.instructions.forEach((ix) => {
        ix.keys.forEach((key) => {
          accounts.push(key.pubkey);
        });
      });

      // console.log("========> lut account <=========");
      // accounts.map((account, index) => console.log(`account:${index} => ${account.toBase58()}`));

      let accountSet: Set<PublicKey> = new Set(accounts); // remove duplicate accounts
      // console.log("========> account set <=========");
      // accountSet.forEach((account) => {
      //   console.log(`account => ${account.toBase58()}`);
      // })
      console.log(`account Set length, ${accountSet.size}`);

      let chunkAccounts = chunkArrayByCondition(Array.from(accountSet), [15, 10, 10, 25]);
       // move Set to Array
      // chunkAccounts.map((element, index) => {
      //   console.log(`accountAccount:${index}, length:${element.length} =>`, element.map((e) => e.toBase58()));

      // })
      
      let extendLutIxs: TransactionInstruction[] = [];
      chunkAccounts.map(element => {
        extendLutIxs.push(extendLut( // add extend instruction
          lut as PublicKey,
          payer.publicKey,
          element
        ));
      });
      console.log("extendLutIxs", extendLutIxs);

      lutTx.add(extendLutIxs[0]); // add 1nd extend lut instruction
      
      let tipIx = jitoTipIx(payer.publicKey, jitoFee);
      lutTx.add(tipIx); // add jito fee instruction

      let latestBlockhash = await this.connection.getLatestBlockhash();

      let lutVersionedTx = await buildTx(
        lutTx,
        payer.publicKey,
        [payer],
        latestBlockhash,
        priorityFees,
        commitment,
        finality
      );
      
      if (!lutVersionedTx) throw Error("lut transation was empty");
      
      let createTx = new Transaction();
      let creatorAccount = buyers[0];
      let createIx = await this.getCreateInstructions(
        creatorAccount.publicKey, // creator is dev
        tokenInfo.name,
        tokenInfo.symbol,
        tokenInfo.metadataUri,
        mint
      );
      createTx.add(createIx);
      
      let createVersionedTx = await buildTx(
        createTx,
        creatorAccount.publicKey,
        [creatorAccount, mint],
        latestBlockhash,
        priorityFees,
        commitment,
        finality,
        // lutAccount ? [lutAccount]: null
      );

      if (!createVersionedTx) throw Error("create transation was empty");

      let bundleTxs: VersionedTransaction[] = [lutVersionedTx, createVersionedTx];
      let buySimulateAmountsSol = this.simulateBuys(buyAmountsSol);

      if (buyAmountsSol.length > 0) {
        for (let i = 0; i < buyers.length; i++) {
          let buyTx = await this.getBuyInstructionsBySolAmount( // using slippage buy
            buyers[i].publicKey,
            mint.publicKey,
            buySimulateAmountsSol[i].tokenAmount,
            buySimulateAmountsSol[i].solAmount,
            slippageBasisPoints,
            commitment
          );

          let signers: Keypair[] = [buyers[i]];
          if (extendLutIxs.length > i + 1) {
            buyTx.add(extendLutIxs[i+1]); // add 2th, 3th extend lut instruction
            signers.push(payer);
          }

          const buyVersionedTx = await buildTx(
            buyTx,
            buyers[i].publicKey,
            signers,
            latestBlockhash,
            priorityFees,
            commitment,
            finality,
            // lutAccount ? [lutAccount]: null
          );
          if (buyVersionedTx) bundleTxs.push(buyVersionedTx);
        }
      }

      if (extendLutIxs.length >= 4) {
        let lastExtLutTx = new Transaction().add(extendLutIxs[3]); // add 5th extend lut instruction
        let lastExtLutVersionedTx = await buildTx(
          lastExtLutTx,
          payer.publicKey,
          [payer],
          latestBlockhash,
          priorityFees,
          commitment,
          finality,
        );
        if (lastExtLutVersionedTx) bundleTxs.push(lastExtLutVersionedTx);
      }

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) {
          lutProviders[authKey] = lut as PublicKey;
          console.log("lutAddress => ", lutProviders[authKey].toBase58());
          await setValue(Key.LUT_ADDRESS, (lut as PublicKey).toBase58(), authKey);
          break;
        }
        count++;
        if (count > 0) throw Error("SendBundle Count exceeded 3 times");
      }
      return result;
    } catch (err) {
      console.log(`Creating token bundle was failed, ${err}`);
      return { confirmed: false, content: `Creating token bundle was failed, ${err}`};
    }
  } 

  async firstBundleAfterCreation(
    payer: Keypair, // fundAccount
    sniperAccount: Keypair,
    commonAccounts: Keypair[],
    commonSolAmounts: bigint[],
    mintPubKey: PublicKey, // mint
    jitoFee: number,
    authKey: string,
    globalAccount: GlobalAccount,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      let bondingCurveAccount = await this.getBondingCurveAccount(
        mintPubKey,
        commitment
      );
      if (!bondingCurveAccount) throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");

      let latestBlockhash = await this.connection.getLatestBlockhash();

      let sniperSellTx = new Transaction();
      const bundleTxs: VersionedTransaction[] = [];

      let tokenAmount = await getSPLBalance(this.connection, mintPubKey, sniperAccount.publicKey);
      if (!tokenAmount) throw Error("Errors when getting token balance");
      let sniperTokenAmount = BigInt(Math.floor(tokenAmount * DEFAULT_POW));

      
      let simulateSniperSellSolAmount = bondingCurveAccount.simulateSell([sniperTokenAmount], globalAccount.feeBasisPoints)[0];
      
      let sniperSellIx = await this.getSellInstructionsBySimulateSellSolAmount(
        sniperAccount.publicKey,
        mintPubKey,
        sniperTokenAmount,
        simulateSniperSellSolAmount,
        globalAccount.feeRecipient,
        SLIPPAGE_BASIS_POINTS,
        commitment,
      );

      sniperSellTx.add(sniperSellIx); // add sniper sell instruction

      let tipIx = jitoTipIx(sniperAccount.publicKey, jitoFee); 
      sniperSellTx.add(tipIx); // add jito fee instruction

      let sniperSellVersionedTx = await buildTx(
        sniperSellTx,
        sniperAccount.publicKey,
        [sniperAccount],
        latestBlockhash,      
      );

      if (!sniperSellVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
      bundleTxs.push(sniperSellVersionedTx);

      let simulateCommonBuyTokenAmounts = bondingCurveAccount.simulateBuy(commonSolAmounts);

      let commonBuyIxs: Transaction[] = [];
      for (let i = 0; i < commonAccounts.length; i++) {
        let buyIx = await this.getBuyInstructionsBySimulateBuyTokenAmount(
          commonAccounts[i].publicKey,
          mintPubKey,
          simulateCommonBuyTokenAmounts[i],
          commonSolAmounts[i],
          globalAccount.feeRecipient,
          SLIPPAGE_BASIS_POINTS,
        );
        commonBuyIxs.push(buyIx);
      }

      let chunkCommonBuyIxs = chunk(commonBuyIxs, ixChunkLimit);
      let chunkCommonAccounts = chunk(commonAccounts, ixChunkLimit);
    
      let lutAccount = null;
      let lut = await getValue(Key.LUT_ADDRESS, authKey) ?? null;
      console.log("lut in first bundle => ", lut);
      if (lut) {
        lutAccount = (await this.connection.getAddressLookupTable(
          new PublicKey(lut), 
          { commitment: "processed" }
        )).value;
      }
      console.log("lutAccount => ", lutAccount?.state.addresses.length);
      // if (lutProviders[authKey]) lutAccount = (await this.connection.getAddressLookupTable(lutProviders[authKey])).value

      for(let i = 0; i < chunkCommonBuyIxs.length; i++) {
        let newTx = (new Transaction).add(...chunkCommonBuyIxs[i]);
        let newVersionedTx = await buildTx(
          newTx,
          payer.publicKey,
          [payer, ...chunkCommonAccounts[i]],
          latestBlockhash,
          priorityFees,
          commitment,
          finality,
          lutAccount ? [lutAccount] : undefined,
        );
        if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
        bundleTxs.push(newVersionedTx);
      }

      let result;
      let count = 0;

      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) break;
        count++;
        if (count > 0) throw Error("Bundle failed");
      }

      return result;

    } catch (err) {
      console.log(`Second bundle  was failed after creation bundle, ${err}`);
      return { confirmed: false, content: `Second bundle  was failed after creation bundle was success, ${err}`};
    }
  }

  async sellOne(
    payer: Keypair,
    sellAccount: Keypair,
    sellTokenAmount: bigint,
    mintPubKey: PublicKey,
    jitoFee: number,
    globalAccount: GlobalAccount,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      let bondingCurveAccount = await this.getBondingCurveAccount(
        mintPubKey,
        commitment
      );
      if (!bondingCurveAccount) throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");

      let latestBlockhash = await this.connection.getLatestBlockhash();

      let initialTx = new Transaction();
      const bundleTxs: VersionedTransaction[] = [];

      let minSolOutput = bondingCurveAccount.getSellPrice(sellTokenAmount, globalAccount.feeBasisPoints);
      
      let sellIx = await this.getSellInstructionsBySimulateSellSolAmount(
        sellAccount.publicKey,
        mintPubKey,
        sellTokenAmount,
        minSolOutput,
        globalAccount.feeRecipient,
        SLIPPAGE_BASIS_POINTS,
      );

      initialTx.add(sellIx); // add sell instruction

      let tipIx = jitoTipIx(payer.publicKey, jitoFee);
      initialTx.add(tipIx); // add jito fee instruction

      let initialVersionedTx = await buildTx(
        initialTx,
        payer.publicKey,
        [sellAccount, payer],
        latestBlockhash,      
      );

      if (!initialVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
      bundleTxs.push(initialVersionedTx);

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) break;
        count++;
        if (count > 0) throw Error("SendBundle count exceeded 3 times");
      }
      return result;

    } catch (err) {
      console.log(`SellOneBunlde was failed, ${err}`);
      return { confirmed: false, content: `SellOneBunlde was failed, ${err}` };
    }
  }
  
  async sellDumpAll(
    payer: Keypair,
    sellAccounts: Keypair[],
    sellTokenAmounts: bigint[],
    mintPubKey: PublicKey,
    jitoFee: number,
    authKey: string,
    globalAccount: GlobalAccount,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      let bondingCurveAccount = await this.getBondingCurveAccount(
        mintPubKey,
        commitment
      );
      if (!bondingCurveAccount) throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");

      let latestBlockhash = await this.connection.getLatestBlockhash();

      const bundleTxs: VersionedTransaction[] = [];

      let tipIx = jitoTipIx(payer.publicKey, jitoFee); // add jito fee instruction
      
      let simulateSniperSellSolAmounts = bondingCurveAccount.simulateSell(sellTokenAmounts, globalAccount.feeBasisPoints);
     
      let sellIxs = await Promise.all(sellAccounts.map(async (seller, index) => {
        return await this.getSellInstructionsBySimulateSellSolAmount(
          seller.publicKey,
          mintPubKey,
          sellTokenAmounts[index],
          simulateSniperSellSolAmounts[index],
          globalAccount.feeRecipient,
          SLIPPAGE_BASIS_POINTS,
        );
      }));

      let chunkCommonBuyIxs = chunk(sellIxs, ixChunkLimit);
      let chunkCommonAccounts = chunk(sellAccounts, ixChunkLimit);

      let lutAccount = null;      
      // if (lutProviders[authKey]) lutAccount = (await this.connection.getAddressLookupTable(lutProviders[authKey])).value
      let lut = await getValue(Key.LUT_ADDRESS, authKey) ?? null;
      console.log("lut in first bundle => ", lut);
      if (lut) lutAccount = (await this.connection.getAddressLookupTable(new PublicKey(lut))).value;
      console.log("lutAccount => ", lutAccount?.state.addresses.length);

      await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
        let sellTx = (new Transaction).add(...buyIxs);
        if (index == chunkCommonBuyIxs.length - 1) sellTx.add(tipIx); // add jito fee instruction to first transaction of jito bundle
        let newVersionedTx = await buildTx(
          sellTx,
          payer.publicKey,
          [payer, ...chunkCommonAccounts[index]],
          latestBlockhash,
          priorityFees,
          commitment,
          finality,
          lutAccount ? [lutAccount] : undefined
        );
        if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
        bundleTxs.push(newVersionedTx);  // add sell instruction
      }));

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) break;
        count++;
        if (count > 0) throw Error("SendBundle count exceeded 3 times");
      }
      return result;

    } catch (err) {
      console.log(`DumpSell bundle was failed, ${err}`);
      return { confirmed: false, content: `DumpSell bundle was failed, ${err}` }
    }
  }

  async getSellInstructionsBySimulateSellSolAmount(
    seller: PublicKey,
    mint: PublicKey,
    sellTokenAmount: bigint,
    minSolOutput: bigint,
    feeRecipient: PublicKey,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {

    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );

    return await this.getSellInstructions(
      seller,
      mint,
      feeRecipient,
      sellTokenAmount,
      0n, //sellAmountWithSlippage
    );
  }

  async getSellInstructions(
    seller: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    tokneAmount: bigint, // input token amount
    minSolOutput: bigint // out minimal sol amount
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, seller, false);

    let transaction = new Transaction();

    transaction.add(
      await this.program.methods
        .sell(new BN(tokneAmount.toString()), new BN(minSolOutput.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: seller,
        })
        .transaction()
    );

    return transaction;
  }

  // create token instructions
  async getCreateInstructions(
    creator: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    mint: Keypair
  ) {
    const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        mplTokenMetadata.toBuffer(),
        mint.publicKey.toBuffer()
      ],
      mplTokenMetadata
    );

    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint.publicKey,
      this.getBondingCurvePDA(mint.publicKey),
      true // allow owner account to be PDA
    );

    return this.program.methods
      .create(name, symbol, uri)
      .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
      })
      .signers([mint])
      .transaction();
  }

  async getBuyInstructionsBySimulateBuyTokenAmount(
    buyer: PublicKey,
    mint: PublicKey,
    buyAmountToken: bigint,
    buyAmountSol: bigint,
    feeRecipient: PublicKey,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    return await this.getBuyInstructions(
      buyer,
      mint,
      feeRecipient,
      buyAmountToken,
      buyAmountWithSlippage,
    );
  }

  async getBuyInstructionsBySolAmount(
    buyer: PublicKey,
    mint: PublicKey,
    buyAmountToken: bigint,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
   
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    return await this.getBuyInstructions(
      buyer,
      mint,
      FEE_RECIPICEMT,
      buyAmountToken,
      buyAmountWithSlippage,
      commitment,
    );
  }

  async getBuyInstructions(
    buyer: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    tokenAmount: bigint,
    solAmount: bigint,
    commitment: Commitment = DEFAULT_COMMITMENT,
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, buyer, false);

    let transaction = new Transaction();

    try {
      await getAccount(this.connection, associatedUser, commitment);
    } catch (e) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer, // payer of initialization fees
          associatedUser, // new associated token account
          buyer, // new account's owner
          mint // token mint account
        )
      );
    }

    transaction.add(
      await this.program.methods
        .buy(new BN(tokenAmount.toString()), new BN(solAmount.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: buyer,
        })
        .transaction()
    );

    return transaction;
  }

  // Simulate buy amounts based on inital reserves
  simulateBuys(amounts: bigint[]) { 
    
    // const tokenTotalSupply = 1000000000 * tokenDecimals;
    let initialRealSolReserves = 0;
    let initialVirtualTokenReserves = 1073000000 * DEFAULT_POW;
    let initialRealTokenReserves = 793100000 * DEFAULT_POW;
    let totalTokensBought = 0;

    const buys = [];

    for (let solAmount of amounts) {
      const e = new BN(solAmount.toString());
      const initialVirtualSolReserves = 30 * LAMPORTS_PER_SOL + initialRealSolReserves;
      const a = new BN(initialVirtualSolReserves).mul(new BN(initialVirtualTokenReserves)); // k = x * y
      const i = new BN(initialVirtualSolReserves).add(e);
      const l = a.div(i).add(new BN(1));
      let tokensToBuy = new BN(initialVirtualTokenReserves).sub(l);

      tokensToBuy = BN.min(tokensToBuy, new BN(initialRealTokenReserves));

      const tokensBought = tokensToBuy.toNumber();
      buys.push({ solAmount: solAmount, tokenAmount: BigInt(tokensToBuy.toString()) });
      initialRealSolReserves += e.toNumber();
      initialRealTokenReserves -= tokensBought;
      initialVirtualTokenReserves -= tokensBought;
      totalTokensBought += tokensBought;
    }

    return buys;
  }

  async getGlobalAccount(commitment: Commitment = DEFAULT_COMMITMENT) {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_ACCOUNT_SEED)],
      new PublicKey(PROGRAM_ID)
    );

    const tokenAccount = await this.connection.getAccountInfo(
      globalAccountPDA,
      commitment
    );

    return GlobalAccount.fromBuffer(tokenAccount!.data);
  }

  async getBondingCurveAccount(
    mint: PublicKey,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    const tokenAccount = await this.connection.getAccountInfo(
      this.getBondingCurvePDA(mint),
      commitment
    );
    if (!tokenAccount) {
      return null;
    }
    return BondingCurveAccount.fromBuffer(tokenAccount!.data);
  }

  getBondingCurvePDA(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
      this.program.programId
    )[0];
  }
}

