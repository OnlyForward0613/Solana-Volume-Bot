import { Program, Provider } from "@coral-xyz/anchor";
import { PumpFun, IDL } from "./IDL";
import { Commitment, Connection, Finality, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction, Version, VersionedTransaction } from "@solana/web3.js";
import { CreateTokenMetadata, MARKETActionType, PriorityFee } from "./types";
import { buildTx, calculateWithSlippageBuy, calculateWithSlippageSell, DEFAULT_COMMITMENT, DEFAULT_FINALITY, getRandomInt, sendTx } from "../helper/util";
import { Agent, setGlobalDispatcher } from "undici";
import { createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { global_mint, JITO_FEE } from "../config";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { GlobalAccount } from "./globalAccount";
import { BN } from "bn.js";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import { Key } from "readline";
import { SystemProgram } from "@solana/web3.js";
import { create } from "lodash";
import { sendBundle } from "../helper/jito";

const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const MPL_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const GLOBAL_ACCOUNT = "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf";
const FEE_RECIPICEMT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";

export const DEFAULT_DECIMALS = 6;

export class PumpFunSDK {
  public program: Program<PumpFun>;
  public connection: Connection;
  constructor(provider?: Provider) {
    this.program = new Program<PumpFun>(IDL as PumpFun, provider);
    this.connection = this.program.provider.connection;
  }

  async createAndBuyJitoClient(
    creator: Keypair,
    mint: Keypair,
    buyers: Keypair[],
    createTokenMetadata: CreateTokenMetadata, // tokenMetadata
    buyAmountsSol: bigint[], 
    slippageBasisPoints: bigint = 300n,
    priorityFees?: PriorityFee, // set unitLimit and unitPrice
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {

    try {
      let latestBlockhash = await this.connection.getLatestBlockhash();

      // Getting toke metadataUrl from Pumpfun Ipfs
      let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);
      console.log(tokenMetadata);
      
      // Getting createTx
      let createIx = await this.getCreateInstructions(
        creator.publicKey,
        createTokenMetadata.name,
        createTokenMetadata.symbol,
        tokenMetadata.metadataUri,
        mint
      );

      const buySimulateAmountsSol = this.simulateBuys(buyAmountsSol);
      console.log(buySimulateAmountsSol);

      let devbuyTx = await this.getBuyInstructions(
        creator.publicKey,
        mint.publicKey,
        FEE_RECIPICEMT,
        buySimulateAmountsSol[0].tokenAmount,
        buySimulateAmountsSol[0].solAmount,
        commitment
      );

      const tipIx = SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: JITO_FEE,
      });

      const initTx = (new Transaction).add(...[createIx, devbuyTx, tipIx,]);

      let initVersionedTx = await buildTx(
        this.connection,
        initTx,
        creator.publicKey,
        [creator, mint], // signers
        latestBlockhash,
        priorityFees,
        commitment,
        finality
      );

      console.log("initVersionedTx is ok");

      const bundledTxns: VersionedTransaction[] = [];
      if (initVersionedTx) bundledTxns.push(initVersionedTx);
      else return false;
      
      // get address lookup table
      for (let i = 1; i < buySimulateAmountsSol.length; i++) {
        let buyerTx = await this.getBuyInstructions(
          creator.publicKey,
          mint.publicKey,
          FEE_RECIPICEMT,
          buySimulateAmountsSol[i].tokenAmount,
          buySimulateAmountsSol[i].solAmount,
          commitment
        );
        let buyerVersionedTx = await buildTx(
          this.connection,
          buyerTx,
          buyers[1].publicKey,
          [buyers[1]],
          latestBlockhash,
          priorityFees,
          commitment,
          finality
        );
        if (buyerVersionedTx) bundledTxns.push(buyerVersionedTx);
        else return false;
      }

      console.log(bundledTxns);

      return await sendBundle(bundledTxns, latestBlockhash);
    } catch (err) {
      console.log(`Errors when creating token, ${err}`);
      return false;
    }
    
  }

  async createAndBuy(
    creator: Keypair, // devAccount
    mint: Keypair, 
    buyers: Keypair[], // [devAccount, buyAccount]
    createTokenMetadata: CreateTokenMetadata, // tokenMetadata
    buyAmountsSol: bigint[], 
    slippageBasisPoints: bigint = 300n,
    priorityFees?: PriorityFee, // set unitLimit and unitPrice
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    
    let latestBlockhash = await this.connection.getLatestBlockhash();

    let tokenMetadata = await this.createTokenMetadata(createTokenMetadata); // get ipfs url from pumpfun ipfs api

    let createTx = await this.getCreateInstructions(
      creator.publicKey,
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );

    let newTx = new Transaction().add(createTx);

    let tipIx = SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: getJitoTipWallet(),
      lamports: JITO_FEE,
    });

    newTx.add(tipIx);
    
    let createVersionedTx = await buildTx(
      this.connection,
      newTx,
      creator.publicKey,
      [creator, mint],
      latestBlockhash,
      priorityFees,
      commitment,
      finality
    );

    let buyTxs: VersionedTransaction[] = [];
    let buySimulateAmountsSol = this.simulateBuys(buyAmountsSol);
    console.log(buySimulateAmountsSol);

    if (buyAmountsSol.length > 0) {
      for (let i = 0; i < buyers.length; i++) {
        // const randomPercent = getRandomInt(10, 25);
        // const buyAmountSolWithRandom = buyAmountsSol[i] / BigInt(100) * BigInt(randomPercent % 2 ? (100 + randomPercent) : (100 - randomPercent))
        // const buyAmountSolWithRandom = buyAmountsSol[i];

        let buyTx = await this.getBuyInstructionsBySolAmount(
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
        if (buyVersionedTx) buyTxs.push(buyVersionedTx);
      }
    }

    // await sendTx(
    //   this.connection,
    //   newTx,
    //   creator.publicKey,
    //   [creator, mint],
    //   priorityFees,
    //   commitment,
    //   finality
    // );

    let result
    let count = 0;
    if (createVersionedTx) {
      while(1) {
        result = await jitoWithAxios([createVersionedTx, ...buyTxs], latestBlockhash);
        if (result.confirmed) break;
        count++;
        if (count > 3) return result;
      }
    }
    

    return result;
  }

  async optionalBuyAndSell(
    creator: Keypair,
    actions: MARKETActionType[],
    accounts: Keypair[],
    mint: PublicKey,
    amounts: bigint[],
    slippageBasisPoints: bigint[],
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    let latestBlockhash = await this.connection.getLatestBlockhash();
    console.log(latestBlockhash);

    const versionedTxs: VersionedTransaction[] = [];
    for (let i = 0; i < actions.length; i++) {
      let tx: Transaction;
      tx = await this.sell(
        accounts[i],
        mint,
        amounts[i],
        slippageBasisPoints[i],
        priorityFees,
        commitment,
        finality
      );
      if (i == 0) {
        tx.add(SystemProgram.transfer({
          fromPubkey: accounts[i].publicKey,
          toPubkey: getJitoTipWallet(),
          lamports: JITO_FEE,
        }))
      }
      let versionedTx = await buildTx(
        this.connection,
        tx,
        accounts[i].publicKey,
        [accounts[i]],
        latestBlockhash,
        priorityFees,
        commitment,
        finality
      )
      if (versionedTx) {
        versionedTxs.push(versionedTx);
      } else return false;
    }

    let result;
    let count = 0;
    while(1) {
      result = await jitoWithAxios([...versionedTxs], latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) return result;
    }
    return result;
  }

async buy(
    buyer: Keypair,
    mint: PublicKey,
    buyAmountToken: bigint,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<Transaction> {
    let buyTx = await this.getBuyInstructionsBySolAmount(
      buyer.publicKey,
      mint,
      buyAmountToken,
      buyAmountSol,
      slippageBasisPoints,
      commitment
    );

    return buyTx;
  }

  async sell(
    seller: Keypair,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<Transaction> {
    let sellTx = await this.getSellInstructionsByTokenAmount(
      seller.publicKey,
      mint,
      sellTokenAmount,
      slippageBasisPoints,
      commitment
    );

    return sellTx;
  }

  async getSellInstructionsByTokenAmount(
    seller: PublicKey,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let globalAccount = await this.getGlobalAccount(commitment);
    if (!globalAccount) {
      throw new Error(`globalAccount account not found: ${mint.toBase58()}`);
    }

    let minSolOutput = bondingCurveAccount.getSellPrice(
      sellTokenAmount,
      globalAccount.feeBasisPoints
    );

    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );

    return await this.getSellInstructions(
      seller,
      mint,
      globalAccount.feeRecipient,
      sellTokenAmount,
      sellAmountWithSlippage
    );
  }

  async getSellInstructions(
    seller: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    amount: bigint,
    minSolOutput: bigint
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
        .sell(new BN(amount.toString()), new BN(minSolOutput.toString()))
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

  async createTokenMetadata(create: CreateTokenMetadata) {
    let formData = new FormData();
      formData.append("file", create.file),
      formData.append("name", create.name),
      formData.append("symbol", create.symbol),
      formData.append("description", create.description),
      formData.append("twitter", create.twitter || ""),
      formData.append("telegram", create.telegram || ""),
      formData.append("website", create.website || ""),
      formData.append("showName", "true");
    
    setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }))
    let request = await fetch("https://pump.fun/api/ipfs", {
      method: "POST",
      headers: {
        "Host": "www.pump.fun",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Referer": "https://www.pump.fun/create",
        "Origin": "https://www.pump.fun",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=1",
        "TE": "trailers"
      },
      body: formData,
    });
    return request.json();
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
      .instruction();
  }

  async getBuyInstructionsBySolAmount(
    buyer: PublicKey,
    mint: PublicKey,
    buyAmountToken: bigint,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    // let bondingCurveAccount = await this.getBondingCurveAccount( // Getting bonding curve account info updated 
    //   global_mint,
    //   commitment
    // ); 
    // if (!bondingCurveAccount) {
    //   throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    // }

    // let buyAmount = bondingCurveAccount.getBuyPrice(buyAmountSol);
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );
    // let globalAccount = await this.getGlobalAccount(commitment);
    // console.log(globalAccount);

    return await this.getBuyInstructions(
      buyer,
      mint,
      FEE_RECIPICEMT,
      buyAmountToken,
      buyAmountWithSlippage,
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
    
    const tokenDecimals = 10 ** DEFAULT_DECIMALS;
    // const tokenTotalSupply = 1000000000 * tokenDecimals;
    let initialRealSolReserves = 0;
    let initialVirtualTokenReserves = 1073000000 * tokenDecimals;
    let initialRealTokenReserves = 793100000 * tokenDecimals;
    let totalTokensBought = 0;

    const buys = [];

    for (let solAmount of amounts) {
      const e = new BN(solAmount.toString());
      const initialVirtualSolReserves = 30 * LAMPORTS_PER_SOL + initialRealSolReserves;
      const a = new BN(initialVirtualSolReserves).mul(new BN(initialVirtualTokenReserves));
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

