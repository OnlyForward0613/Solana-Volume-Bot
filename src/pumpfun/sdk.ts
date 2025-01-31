import { Program, Provider } from "@coral-xyz/anchor";
import { PumpFun, IDL } from "./IDL";
import { Commitment, Connection, Finality, Keypair, PublicKey, Transaction, TransactionInstruction, Version, VersionedTransaction } from "@solana/web3.js";
import { CreateTokenMetadata, MARKETActionType, PriorityFee } from "./types";
import { buildTx, calculateWithSlippageBuy, calculateWithSlippageSell, DEFAULT_COMMITMENT, DEFAULT_FINALITY, getRandomInt, sendTx } from "../helper/util";
import { Agent, setGlobalDispatcher } from "undici";
import { createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { global_mint } from "../config";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { GlobalAccount } from "./globalAccount";
import { BN } from "bn.js";
import { jitoWithAxios } from "../helper/jitoWithAxios";
import { Key } from "readline";

const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const MPL_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

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
    console.log(latestBlockhash);

    let tokenMetadata = await this.createTokenMetadata(createTokenMetadata); // get ipfs url from pumpfun ipfs api

    let createTx = await this.getCreateInstructions(
      creator.publicKey,
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );

    let newTx = new Transaction().add(createTx); 
    
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

    if (buyAmountsSol.length > 0) {
      for (let i = 0; i < buyers.length; i++) {
        const randomPercent = getRandomInt(10, 25);
        const buyAmountSolWithRandom = buyAmountsSol[i] / BigInt(100) * BigInt(randomPercent % 2 ? (100 + randomPercent) : (100 - randomPercent))
        // const buyAmountSolWithRandom = buyAmountsSol[i];

        let buyTx = await this.getBuyInstructionsBySolAmount(
          buyers[i].publicKey,
          mint.publicKey,
          buyAmountSolWithRandom,
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
        buyTxs.push(buyVersionedTx);
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

    let result;
    let count = 0;
    while(1) {
      result = await jitoWithAxios([...buyTxs], creator, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) return result;
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
      if (actions[i] == MARKETActionType.BUY) {
        tx = await this.buy(
          accounts[i], // buyer
          mint,
          amounts[i], 
          slippageBasisPoints[i],
          priorityFees,
          commitment,
          finality
        );
      } else {
        tx = await this.sell(
          accounts[i],
          mint,
          amounts[i],
          slippageBasisPoints[i],
          priorityFees,
          commitment,
          finality
        )
      }
      versionedTxs.push(await buildTx(
        this.connection,
        tx,
        accounts[i].publicKey,
        [accounts[i]],
        latestBlockhash,
        priorityFees,
        commitment,
        finality
      ));
    }

    let result;
    let count = 0;
    while(1) {
      result = await jitoWithAxios([...versionedTxs], creator, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) return result;
    }
    return result;
  }

async buy(
    buyer: Keypair,
    mint: PublicKey,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<Transaction> {
    let buyTx = await this.getBuyInstructionsBySolAmount(
      buyer.publicKey,
      mint,
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
      .signers([mint])
      .transaction();
  }

  async getBuyInstructionsBySolAmount(
    buyer: PublicKey,
    mint: PublicKey,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount( // Getting bonding curve account info updated 
      global_mint,
      commitment
    ); 
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let buyAmount = bondingCurveAccount.getBuyPrice(buyAmountSol);
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );
    let globalAccount = await this.getGlobalAccount(commitment);

    return await this.getBuyInstructions(
      buyer,
      mint,
      globalAccount.feeRecipient,
      BigInt(0), //buyAmount,
      buyAmountWithSlippage,
    );
  }

  async getBuyInstructions(
    buyer: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    amount: bigint,
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
        .buy(new BN(amount.toString()), new BN(solAmount.toString()))
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

