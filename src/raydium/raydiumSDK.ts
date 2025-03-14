import { 
  Commitment, 
  Connection, 
  Finality, 
  Keypair, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
  VersionedTransaction
} from "@solana/web3.js";
import { 
  buildTx,
  chunkArrayByCondition,
  DEFAULT_COMMITMENT, 
  DEFAULT_FINALITY, 
  extendLut,
  getAllAccountsForLUT,
  getOwnerTokenAccounts,
  initializeLUT,
  photonTipIx
} from "../helper/util";
import { PriorityFee } from "../pumpfun/types";
import { Currency, Liquidity, LiquidityPoolKeys, Percent, Token, TOKEN_PROGRAM_ID, TokenAmount, TxVersion } from "@raydium-io/raydium-sdk";
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import { jitoTipIx, jitoWithAxios } from "../helper/jitoWithAxios";
import { chunk } from "lodash";
import { ixChunkLimit } from "../pumpfun/sdk";
import { getValue, setValue } from "../cache/query";
import { Key } from "../cache/keys";
import { PHOTON_FEE, PHOTON_FEE_RECIPIENT } from "../config";

export class RaydiumSDK {
  public connection: Connection;
  constructor (connection: Connection) {
    this.connection = connection;
  }

  async sellOne(
    sellAccount: Keypair,
    sellTokenAmount: bigint,
    poolKeys: LiquidityPoolKeys,
    mintPubKey: PublicKey,
    jitoFee: number,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      const tokenIn = new Token(TOKEN_PROGRAM_ID, mintPubKey, 6);
      const tokenOut = new Token(TOKEN_PROGRAM_ID, NATIVE_MINT, 9);
      const tokenAmountIn = new TokenAmount(tokenIn, sellTokenAmount, true);

      let latestBlockhash = await this.connection.getLatestBlockhash();

      let initialTx = new Transaction();
      const bundleTxs: VersionedTransaction[] = [];
      const sellIx = await this.getSellInstruction(
        poolKeys,
        sellAccount.publicKey,
        tokenAmountIn,
        mintPubKey,
        tokenIn,
        tokenOut,
        SLIPPAGE_BASIS_POINTS,
      );
      if (!sellIx) throw Error("Sell instruction is empty");
      initialTx.add(sellIx);

      let tipIx = jitoTipIx(sellAccount.publicKey, jitoFee);
      initialTx.add(tipIx); // add jito fee instruction

      const photonIx = photonTipIx(
        sellAccount.publicKey,
        PHOTON_FEE_RECIPIENT,
        PHOTON_FEE
      );
      initialTx.add(photonIx); // add photon fee instruction

      let initialVersionedTx = await buildTx(
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
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) break;
        count++;
        if (count > 0) throw Error("SendBundle count exceeded 3 times");
      }
      return result;

      
    } catch (err) {
      console.log(`Errors when one selling in Raydium, ${err}`);
      return {
        confirmed: false,
        content: `Errors when one selling in Raydium, ${err}`
      };
    }
  }

  async sellDumpAll(
    sellAccounts: Keypair[],
    sellTokenAmounts: bigint[],
    poolKeys: LiquidityPoolKeys,
    mintPubKey: PublicKey,
    authKey: string,
    jitoFee: number,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      const tokenIn = new Token(TOKEN_PROGRAM_ID, mintPubKey, 6);
      const tokenOut = new Token(TOKEN_PROGRAM_ID, NATIVE_MINT, 9);
      const tokenAmountIns = sellTokenAmounts.map(sellTokenAmount => new TokenAmount(tokenIn, sellTokenAmount, true));

      const sellIxs = await Promise.all(sellAccounts.map(async (account, index) => {
        const sellIx = await this.getSellInstruction(
          poolKeys,
          account.publicKey,
          tokenAmountIns[index],
          mintPubKey,
          tokenIn,
          tokenOut,
          SLIPPAGE_BASIS_POINTS,
        );
        if (!sellIx) throw Error("Sell instruction is empty");
        return sellIx;
      }));

      let latestBlockhash = await this.connection.getLatestBlockhash();

      // let tipIx = jitoTipIx(sellAccounts[sellAccounts.length - 1].publicKey, jitoFee); // add jito fee instruction
      
      let chunkCommonBuyIxs = chunk(sellIxs, 2);
      let chunkCommonAccounts = chunk(sellAccounts, 2);

      let lutAccount = null;      
      let lut = await getValue(Key.LUT_ADDRESS, authKey) ?? null;
      console.log("lut in first bundle => ", lut);
      if (lut) lutAccount = (await this.connection.getAddressLookupTable(new PublicKey(lut))).value;
      console.log("lutAccount => ", lutAccount?.state.addresses.length);

      const bundleTxs: VersionedTransaction[][] = [];

      await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
        let sellTx = (new Transaction).add(...buyIxs);
        if (index % 5 == 0) {
          let tipIx = jitoTipIx(chunkCommonAccounts[index][0].publicKey, jitoFee);
          sellTx.add(tipIx); // add jito fee instruction to first transaction of jito bundle
        }

        const photonIx = photonTipIx(
          chunkCommonAccounts[index][0].publicKey,
          PHOTON_FEE_RECIPIENT,
          PHOTON_FEE
        );
        sellTx.add(photonIx); // add photon fee instruction

        let newVersionedTx = await buildTx(
          sellTx,
          chunkCommonAccounts[index][0].publicKey,
          chunkCommonAccounts[index],
          latestBlockhash,
          priorityFees,
          commitment,
          finality,
          lutAccount ? [lutAccount] : undefined
        );
        if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
        let num = Math.floor(index / 5);
        console.log("num => ", num);
        if (!bundleTxs[num]) {
          bundleTxs[num] = [];
        }
        bundleTxs[num].push(newVersionedTx);  // add sell instruction
      }));

      console.log("length => ", bundleTxs.length);
     
      let results = await Promise.all(bundleTxs.map(async (bundleTx) => {
        let result
        let count = 0;
        while (true) {
          result = await jitoWithAxios(bundleTx, latestBlockhash, this.connection);
          if (result.confirmed) break;
          count++;
          if (count > 0) throw Error("SendBundle count exceeded 3 times");
        }
        return result;
      }));
      return results[0];   

    } catch (err) {
      console.log(`Errors when dump selling in Raydium, ${err}`);
      return {
        confirmed: false,
        content: `Errors when dump selling in Raydium, ${err}`
      };
    }
  }

  async createLUT(
    payer: Keypair,
    sellAccounts: Keypair[],
    mintPubKey: PublicKey,
    authKey: string,
    jitoFee: number,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {
    try {
      let [ createLutIx, lut ] = await initializeLUT(this.connection, payer.publicKey);
      if (!createLutIx) throw Error(lut as string);
      
      let lutTx = new Transaction();
      lutTx.add(createLutIx as TransactionInstruction); // add creating address lookup table instruction
      let accounts = getAllAccountsForLUT(
        mintPubKey, 
        payer.publicKey, 
        sellAccounts
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

      let chunkAccounts = chunkArrayByCondition(Array.from(accountSet), [10, 30, 30]);
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
      let bundleTxs: VersionedTransaction[] = [lutVersionedTx];

      for (let i = 1; i < extendLutIxs.length; i++) {
        let lastExtLutTx = new Transaction().add(extendLutIxs[i]); // add 5th extend lut instruction
        let lastExtLutVersionedTx = await buildTx(
          lastExtLutTx,
          payer.publicKey,
          [payer],
          latestBlockhash,
          priorityFees,
          commitment,
          finality,
        );
        if (!lastExtLutVersionedTx) throw Error("extendLut transation was empty")
        bundleTxs.push(lastExtLutVersionedTx);
      }

      let result
      let count = 0;
      while (true) {
        result = await jitoWithAxios(bundleTxs, latestBlockhash, this.connection);
        if (result.confirmed) {
          await setValue(Key.LUT_ADDRESS, (lut as PublicKey).toBase58(), authKey);
          break;
        }
        count++;
        if (count > 0) throw Error("SendBundle Count exceeded 3 times");
      }
      return result;
    } catch (err) {
      console.log(`Errors when dump selling in Raydium, ${err}`);
      return {
        confirmed: false,
        content: `Errors when dump selling in Raydium, ${err}`
      };
    }
  }

  async getSellInstruction(
    poolKeys: LiquidityPoolKeys,
    sellerPK: PublicKey,
    amountIn: TokenAmount,
    mintPK: PublicKey,
    tokenIn: Token,
    tokenOut: Token,
    SLIPPAGE_BASIS_POINTS: bigint,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ) {

    const slippagePercent = new Percent(2000, 10_000); // 20%
    const poolInfo = await Liquidity.fetchInfo({
      connection: this.connection,
      poolKeys,
    });

    const computedAmountOut = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut: tokenOut,
      slippage: slippagePercent,
    });
    const ataIn = await getAssociatedTokenAddress(tokenIn.mint, sellerPK, false);
    const ataOut = await getAssociatedTokenAddress(tokenOut.mint, sellerPK, false);

    let transaction = new Transaction();
    
    try {
      await getAccount(this.connection, ataOut, commitment);
    } catch (e) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          sellerPK, // payer of initialization fees
          ataOut, // new associated token account
          sellerPK, // new account's owner
          NATIVE_MINT // token mint account
        )
      );
    }
    // const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
    //   {
    //     poolKeys: poolKeys,
    //     userKeys: {
    //       tokenAccountIn: ataIn,
    //       tokenAccountOut: ataOut,
    //       owner: sellerPK,
    //     },
    //     amountIn: amountIn.raw,
    //     minAmountOut: 0n,
    //   },
    //   TxVersion.V0, 
    // );
    const sellTokenATAs = await getOwnerTokenAccounts(this.connection, sellerPK);
    const innerTransaction = await Liquidity.makeSwapInstructionSimple({
      connection: this.connection,
      makeTxVersion: 0,
      poolKeys: {
        ...poolKeys,
      },
      userKeys: {
        tokenAccounts: sellTokenATAs,
        owner: sellerPK,
      },
      amountIn: amountIn,
      amountOut: computedAmountOut.amountOut,
      fixedSide: "out",
      config: {
        bypassAssociatedCheck: false,
      },
    })
    if (!innerTransaction) return null;
    const instructions = innerTransaction.innerTransactions[0].instructions.filter(Boolean)
    transaction.add(...instructions);
    // transaction.add(...innerTransaction.instructions);
    return transaction;
  }
}