import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType } from "../types";
import { buildTx, buildVersionedTx, getSPLBalance, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { JITO_FEE, sdk } from "../config";
import { DEFAULT_DECIMALS } from "../pumpfun/sdk";
import { TokenMetadataType, MARKETActionType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";
import { TransactionInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

const SLIPPAGE_BASIS_POINTS = 500n;

export async function launchTokenService(
  {
    devAccount,
    sniperAccount,
    commonAccounts,
    devAmount,
    sniperAmount,
    commonAmounts,
    jitoFee
  }: LaunchTokenType, 
  tokenInfo: TokenMetadataType,
  mint: Keypair,
  connection: Connection,
) {

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
      console.log(createResult.jitoTxsignature);
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
      console.log(secondResult.jitoTxsignature);
    }

  } else {
    console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
  }
}

export const distributionService = async (
  { 
    fundWalletSK,
    walletSKs,
    solAmounts
  }: DistributionType,
  connection: Connection,
) => {

  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletSK));

    console.log(fundAccount.publicKey);
    console.log(walletSKs);
    console.log(solAmounts);
    printSOLBalance(connection, fundAccount.publicKey, "Sol info");

    const walletAccounts = walletSKs.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));
    walletAccounts.forEach((account, index) => {
      console.log(`${index} `, account.publicKey);
    });
    let ixs = walletAccounts.map((account, index) => {
      console.log(`${index}: `, BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index])));
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
      return false;
    } 
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: JITO_FEE,
      })
    );

    const chunkInstrunctions = chunk(ixs, 5);
    console.log(chunkInstrunctions);

    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkInstrunctions.map(async (instructions) => {
      const tx = new Transaction().add(...instructions as TransactionInstruction[]);
      const accounts: any[] = [];
      tx.instructions.map((ix) => {
        accounts.push(...ix.keys);
      })
      console.log(accounts);
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
    return simulateResult;

    let result;
    let count = 0;
    while (true) {
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }
    return result;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return false;
  }
}

export const gatherService = async (
  { 
    fundWalletSK,
    walletSKs,
  }: DistributionType,
  connection: Connection,
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
        lamports: JITO_FEE,
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
    console.log(chunkInstrunctions);

    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkInstrunctions.map(async (instructions) => {
      const tx = new Transaction().add(...instructions as TransactionInstruction[]);
      const accounts: any[] = [];
      tx.instructions.map((ix) => {
        accounts.push(...ix.keys);
      })
      console.log(accounts);
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
    return simulateResult;

    let result;
    let count = 0;
    while (true) {
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }
    return result;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return false;
  }
}