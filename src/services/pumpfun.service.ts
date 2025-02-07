import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType, GatherType, sellType, SellDumpAllType } from "../types";
import { buildTx, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle } from "../helper/util";
import { JITO_FEE, sdk } from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";
import { TransactionInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

const SLIPPAGE_BASIS_POINTS = 500n;

// launch new token on solana based on mint address
export async function launchTokenService(
  {
    devAccount,
    sniperAccount,
    commonAccounts,
    devAmount,
    sniperAmount,
    commonAmounts,
  }: LaunchTokenType, 
  tokenInfo: TokenMetadataType,
  mint: Keypair,
  connection: Connection,
  jitoFee: number = JITO_FEE,
) {

  try {
    let boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    console.log(boundingCurveAccount);

    if (!boundingCurveAccount) {
      let globalAccount = await sdk.getGlobalAccount();
      if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");

      let createResult = await sdk.launchToken(
        devAccount,
        mint,
        [devAccount, sniperAccount], // buyers
        tokenInfo,
        [devAmount, sniperAmount],
        jitoFee,
        SLIPPAGE_BASIS_POINTS,
      );

      if (createResult && createResult.confirmed) {
        console.log("Success creation:", `https://pump.fun/${mint.publicKey.toBase58()}`);
        console.log(`https://explorer.jito.wtf/bundle/${createResult.jitoTxsignature}`)
        console.log(`jitoTxSignature: ${createResult.jitoTxsignature}`);
      } else {
        throw Error("Error when creating new token");
      }

      const secondResult = await sdk.firstBundleAfterCreation(
        devAccount,
        sniperAccount,
        commonAccounts,
        sniperAmount,
        commonAmounts,
        mint.publicKey, // mint
        jitoFee,
        connection,
        globalAccount,
        SLIPPAGE_BASIS_POINTS,
      );
      if (secondResult && secondResult.confirmed) {
        console.log(`https://explorer.jito.wtf/bundle/${secondResult?.jitoTxsignature}`)
        console.log(secondResult.jitoTxsignature);
      }
      return secondResult?.jitoTxsignature;

    } else {
      console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
      printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
      throw Error("the mint token already exists on Pumpfun");
    }
  } catch (err) {
    console.log(`Errors when launching new token on Pumpfun, ${err}`);
    return null;
  }
}


// distribute fund from fund wallet to others
export const distributionService = async (
  { 
    fundWalletSK,
    walletSKs,
    solAmounts,
  }: DistributionType,
  connection: Connection,
  jitoFee: number = JITO_FEE,
) => {

  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletSK));

    console.log(fundAccount.publicKey);

    const walletAccounts = walletSKs.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));
    
    let ixs = walletAccounts.map((account, index) => {
      if (solAmounts[index] > 0) {
        return SystemProgram.transfer({
          fromPubkey: fundAccount.publicKey,
          toPubkey: account.publicKey,
          lamports: BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index]))
        });
      }
    })
    if (!ixs.length) {
      console.log("Not exist valuable transfer instruction");
      return null;
    }

    ixs.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: jitoFee,
      })
    );

    // we will include several tranfer instructions in one transaction, at least 5 insturctions
    const chunkIxs = chunk(ixs, 5);

    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkIxs.map(async (ixs) => {
      const tx = new Transaction().add(...ixs as TransactionInstruction[]);
      const versionedTx = await buildTx(
        connection,
        tx,
        fundAccount.publicKey,
        [fundAccount],
        latestBlockhash
      );
      if (!versionedTx) throw Error("Errors when distributing fund to wallets");
      return versionedTx;
    }));

    // Output each bundle transaction's size
    bundleTxs.map((bundle, index) => {
      console.log(`txsize${index}: `, bundle.serialize().length);
    });

    const simulateResult = await simulateTxBeforeSendBundle(connection, bundleTxs);
    console.log(simulateResult);
    if (!simulateResult) throw Error("Simulation errors when distributiong fund  to wallets");
    // return simulateResult;

    let result;
    let count = 0;
    while (true) { // We will try 3 times until bundle is success
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }
    console.log(`https://explorer.jito.wtf/bundle/${result?.jitoTxsignature}`)
    return result?.jitoTxsignature;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return null;
  }
}

export const gatherService = async (
  { 
    fundWalletSK,
    walletSKs,
  }: GatherType,
  connection: Connection,
  jitoFee: number = JITO_FEE
) => {

  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletSK));
    console.log(fundAccount.publicKey);
    console.log(fundWalletSK);
    printSOLBalance(connection, fundAccount.publicKey, "Sol info");

    let solAmounts: bigint[] = [];
    const walletAccounts: Keypair[] = []; 
    await Promise.all(walletSKs.map(async (SK) => {
      const key = Keypair.fromSecretKey(base58.decode(SK));
      const solAmount = BigInt(await connection.getBalance(key.publicKey));
      if (solAmount > 0n) {
        solAmounts.push(solAmount);
        walletAccounts.push(key);
        return key;
      }
    }));

    if (!walletAccounts.length) throw Error("All wallet don't have any fund");

    let ixs: TransactionInstruction[] = [];
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: jitoFee,
      })
    );
    await Promise.all(walletAccounts.map((account, index) => {
      ixs.push(SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: account.publicKey,
        lamports: solAmounts[index]
      }));
    }))
    

    const chunkInstrunctions = chunk(ixs, 5);
  
    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkInstrunctions.map(async (instructions) => {
      const tx = new Transaction().add(...instructions as TransactionInstruction[]);
      const accounts: any[] = [];
      tx.instructions.map((ix) => {
        accounts.push(...ix.keys);
      });
      const versionedTx = await buildTx(
        connection,
        tx,
        fundAccount.publicKey,
        [fundAccount],
        latestBlockhash
      )
      if (!versionedTx) throw Error("Errors when distributing fund to wallets");
      return versionedTx;
    }));

    bundleTxs.map((bundle, index) => {
      console.log(`txsize${index}: `, bundle.serialize().length);
    });

    const simulateResult = await simulateTxBeforeSendBundle(connection, bundleTxs);
    console.log(simulateResult);
    if (!simulateResult) throw Error("Simulation errors when distributiong fund  to wallets");
    // return simulateResult;

    let result;
    let count = 0;

    while (true) {
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }

    if (result && result.confirmed) {
      console.log(`https://explorer.jito.wtf/bundle/${result.jitoTxsignature}`);
    }
    
    return result?.jitoTxsignature;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return null;
  }
}

export const sellService = async (
  {
    walletAccount,
    mintPubKey,
    tokenAmount
  }: sellType,
  connection: Connection,
  jitoFee: number = JITO_FEE,
) => {
  try {
    let globalAccount = await sdk.getGlobalAccount();
    if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
    
    const result = await sdk.sellOne(
      walletAccount,
      walletAccount,
      tokenAmount, // sell token amount
      mintPubKey,
      jitoFee,
      connection,
      globalAccount,
      SLIPPAGE_BASIS_POINTS
    );

    if (result && result.confirmed) {
      console.log("Success creation:", `https://pump.fun/${mintPubKey.toBase58()}`);
      console.log(`https://explorer.jito.wtf/bundle/${result?.jitoTxsignature}`);
    }

    return result?.jitoTxsignature;

  } catch (err) {
    console.log(`Errors when sell token in sellSevice, ${err}`);
    return null;
  }
}

// Sell dump all 
export const sellDumpAllService = async (
  {
    payer,
    sellAccounts,
    sellTokenAmounts,
    mintPubKey,
  }: SellDumpAllType,
  connection: Connection,
  jitoFee: number = JITO_FEE,
) => {
  try {
    let globalAccount = await sdk.getGlobalAccount();
    if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
    
    const result =  await sdk.sellDumpAll(
      payer,
      sellAccounts,
      sellTokenAmounts,
      mintPubKey,
      jitoFee,
      connection,
      globalAccount,
      SLIPPAGE_BASIS_POINTS,
    );

    if (result && result.confirmed) {
      console.log("Success creation:", `https://pump.fun/${mintPubKey.toBase58()}`);
      console.log(`https://explorer.jito.wtf/bundle/${result?.jitoTxsignature}`);
    }

    return result?.jitoTxsignature;

  } catch (err) {
    console.log(`Error when selling dump all in sellDumpAllService, ${err}`);
    return null;
  }
}