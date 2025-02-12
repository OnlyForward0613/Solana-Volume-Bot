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
  DEFAULT_COMMITMENT, 
  DEFAULT_FINALITY, 
  extendLut, 
  getAllAccountsForLUT, 
  getSPLBalance,
  initializeLUT, 
} from "../helper/util";
// import { Agent, setGlobalDispatcher } from "undici";
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
export const ixChunkLimit = 3; // instruction chunk limit is 3 if we don't use ALT, otherwise it's 5
export const extendLimt = 30; // address lookup table extend limit

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
    payer: Keypair, // payer
    mint: Keypair, 
    buyers: Keypair[], // [devAccount, buyAccount]
    tokenInfo: TokenMetadataType,
    buyAmountsSol: bigint[],
    jitoFee: number, 
    slippageBasisPoints: bigint = 300n,
    priorityFees?: PriorityFee, // set unitLimit and unitPrice
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      
      let [ createLutIx, lut ] = await initializeLUT(this.connection, payer.publicKey);
      if (!createLutIx) throw Error(lut as string);
      
      let newTx = new Transaction().add(createLutIx as TransactionInstruction);
      let accounts = getAllAccountsForLUT(mint.publicKey, payer.publicKey, buyers);
      
      let chunkAccounts = chunk(accounts, extendLimt);
      
      chunkAccounts.map(accounts => {
        newTx.add(extendLut(
          lut as PublicKey,
          payer.publicKey,
          accounts
        ));
      })
      
      let latestBlockhash = await this.connection.getLatestBlockhash();

      let createTx = await this.getCreateInstructions(
        payer.publicKey,
        tokenInfo.name,
        tokenInfo.symbol,
        tokenInfo.metadataUri,
        mint
      );

      newTx.add(createTx);

      let tipIx = jitoTipIx(payer.publicKey, jitoFee);

      newTx.add(tipIx);
      
      let createVersionedTx = await buildTx(
        this.connection,
        newTx,
        payer.publicKey,
        [payer, mint],
        latestBlockhash,
        priorityFees,
        commitment,
        finality
      );
      
      if (!createVersionedTx) throw Error("create transation was empty");

      let bundleTxs: VersionedTransaction[] = [createVersionedTx];
      let buySimulateAmountsSol = this.simulateBuys(buyAmountsSol);
      console.log(buySimulateAmountsSol);

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

          const buyVersionedTx = await buildTx(
            this.connection,
            buyTx,
            buyers[i].publicKey,
            [buyers[i]],
            latestBlockhash,
            priorityFees,
            commitment,
            finality
          );
          if (buyVersionedTx) bundleTxs.push(buyVersionedTx);
        }
      }

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash);
        if (result.confirmed) break;
        count++;
        if (count > 3) throw Error("SendBundle Count exceeded 3 times");
      }
      return result;
    } catch (err) {
      console.log(`Creating token bundle was failed, ${err}`);
      return { confirmed: false, content: `Creating token bundle was failed, ${err}`};
    }
  } 

  
  async firstBundleAfterCreation(
    payer: Keypair,
    sniperAccount: Keypair,
    commonAccounts: Keypair[],
    commonSolAmounts: bigint[],
    mintPubKey: PublicKey, // mint
    jitoFee: number,
    connection: Connection,
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

      let tokenAmount = await getSPLBalance(connection, mintPubKey, sniperAccount.publicKey);
      if (!tokenAmount) throw Error("Errors when getting token balance");
      let sniperTokenAmount = BigInt(Math.floor(tokenAmount * DEFAULT_POW));

      
      let simulateSniperSellSolAmount = bondingCurveAccount.simulateSell([sniperTokenAmount], globalAccount.feeBasisPoints)[0];
      console.log("feeBasicPoints", globalAccount.feeBasisPoints);
      console.log("sniperTokenAmount", sniperTokenAmount);
      console.log("simulateSniperSellSolAmount", simulateSniperSellSolAmount);
      
      let sniperSellIx = await this.getSellInstructionsBySimulateSellSolAmount(
        sniperAccount.publicKey,
        mintPubKey,
        sniperTokenAmount,
        simulateSniperSellSolAmount,
        globalAccount.feeRecipient,
        SLIPPAGE_BASIS_POINTS,
        commitment,
      );

      sniperSellTx.add(sniperSellIx);

      let tipIx = jitoTipIx(sniperAccount.publicKey, jitoFee);
      sniperSellTx.add(tipIx);

      let sniperSellVersionedTx = await buildTx(
        connection,
        sniperSellTx,
        sniperAccount.publicKey,
        [sniperAccount],
        latestBlockhash,      
      );

      if (!sniperSellVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
      bundleTxs.push(sniperSellVersionedTx);


      let simulateCommonBuyTokenAmounts = bondingCurveAccount.simulateBuy(commonSolAmounts);
      console.log("commonSolAmounts", commonSolAmounts);
      console.log("simulateCommonBuyTokenAmounts", simulateCommonBuyTokenAmounts);

      // let commonBuyIxs = await Promise.all(commonAccounts.map(async (buyer, index) => {
      //   return await this.getBuyInstructionsBySimulateBuyTokenAmount(
      //     buyer.publicKey,
      //     mintPubKey,
      //     simulateCommonBuyTokenAmounts[index],
      //     commonAmounts[index],
      //     globalAccount.feeRecipient,
      //     SLIPPAGE_BASIS_POINTS,
      //   );
      // }));

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

      // await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
      //   let newTx = (new Transaction).add(...buyIxs);
      //   let newVersionedTx = await buildTx(
      //     connection,
      //     newTx,
      //     payer.publicKey,
      //     [payer, ...chunkCommonAccounts[index]],
      //     latestBlockhash
      //   );
      //   if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
      //   bundleTxs.push(newVersionedTx);
      // }));
      for(let i = 0; i < chunkCommonBuyIxs.length; i++) {
        let newTx = (new Transaction).add(...chunkCommonBuyIxs[i]);
        let newVersionedTx = await buildTx(
          connection,
          newTx,
          payer.publicKey,
          [payer, ...chunkCommonAccounts[i]],
          latestBlockhash,
        );
        if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
        bundleTxs.push(newVersionedTx);
      }

      console.log(bundleTxs);
        
      let result;
      let count = 0;

      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash);
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
    connection: Connection,
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
      console.log(bondingCurveAccount);
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

      initialTx.add(sellIx);

      let tipIx = jitoTipIx(sellAccount.publicKey, jitoFee);
      initialTx.add(tipIx);

      let initialVersionedTx = await buildTx(
        connection,
        initialTx,
        sellAccount.publicKey,
        [sellAccount],
        latestBlockhash,      
      );

      if (!initialVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
      bundleTxs.push(initialVersionedTx);

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash);
        if (result.confirmed) break;
        count++;
        if (count > 3) throw Error("SendBundle count exceeded 3 times");
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
    connection: Connection,
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

      // let initialTx = new Transaction();
      const bundleTxs: VersionedTransaction[] = [];

      let tipIx = jitoTipIx(payer.publicKey, jitoFee);
      // initialTx.add(tipIx);
      
      // let initialVersionedTx = await buildTx(
      //   connection,
      //   initialTx,
      //   payer.publicKey,
      //   [payer],
      //   latestBlockhash,      
      // );
      
      
      // if (!initialVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
      // bundleTxs.push(initialVersionedTx);
      
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

      await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
        let newTx = (new Transaction).add(...buyIxs);
        if (index == chunkCommonBuyIxs.length - 1) newTx.add(tipIx);
        let newVersionedTx = await buildTx(
          connection,
          newTx,
          payer.publicKey,
          [payer, ...chunkCommonAccounts[index]],
          latestBlockhash,
        );
        if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
        bundleTxs.push(newVersionedTx);
      }));

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash);
        if (result.confirmed) break;
        count++;
        if (count > 3) throw Error("SendBundle count exceeded 3 times");
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

  // async createTokenMetadata(create: CreateTokenMetadata) {
  //   let formData = new FormData();
  //     formData.append("file", create.file),
  //     formData.append("name", create.name),
  //     formData.append("symbol", create.symbol),
  //     formData.append("description", create.description),
  //     formData.append("twitter", create.twitter || ""),
  //     formData.append("telegram", create.telegram || ""),
  //     formData.append("website", create.website || ""),
  //     formData.append("showName", "true");
    
  //   setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }))
  //   let request = await fetch("https://pump.fun/api/ipfs", {
  //     method: "POST",
  //     headers: {
  //       "Host": "www.pump.fun",
  //       "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  //       "Accept": "*/*",
  //       "Accept-Language": "en-US,en;q=0.5",
  //       "Accept-Encoding": "gzip, deflate, br, zstd",
  //       "Referer": "https://www.pump.fun/create",
  //       "Origin": "https://www.pump.fun",
  //       "Connection": "keep-alive",
  //       "Sec-Fetch-Dest": "empty",
  //       "Sec-Fetch-Mode": "cors",
  //       "Sec-Fetch-Site": "same-origin",
  //       "Priority": "u=1",
  //       "TE": "trailers"
  //     },
  //     body: formData,
  //   });
  //   return request.json();
  // }

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
      .instruction();
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

    console.log(buyAmountSol, "=> ", buyAmountWithSlippage);

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

    console.log(`global account PDA: ${globalAccountPDA.toBase58()}`);

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

