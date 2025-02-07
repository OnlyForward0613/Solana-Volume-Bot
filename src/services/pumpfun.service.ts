import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType } from "../types";
import { buildVersionedTx, getSPLBalance, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { JITO_FEE, sdk } from "../config";
import { DEFAULT_DECIMALS } from "../pumpfun/sdk";
import { TokenMetadataType, MARKETActionType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet } from "../helper/jitoWithAxios";
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
    fundWalletPrivateKey,
    walletPrivateKeys,
    solAmounts
  }: DistributionType,
  connection: Connection,
) => {

  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletPrivateKey));

    console.log(fundAccount.publicKey);
    console.log(walletPrivateKeys);
    console.log(solAmounts);
    printSOLBalance(connection, fundAccount.publicKey, "Sol info");

    const walletAccounts = walletPrivateKeys.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));
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

    const lastestBlockhash = await connection.getLatestBlockhash();

    const versionedTxs = await Promise.all(chunkInstrunctions.map(async (instructions) => {
      const tx = new Transaction().add(...instructions as TransactionInstruction[]);
      const accounts: any[] = [];
      tx.instructions.map((ix) => {
        accounts.push(...ix.keys);
      })
      console.log(accounts);
      const versionedTx = await buildVersionedTx(connection, fundAccount.publicKey, tx, lastestBlockhash);
      versionedTx.sign([fundAccount]);
      return versionedTx;
    }));

    versionedTxs.map((versionedTx, index) => {
      console.log(`txsize${index}: `, versionedTx.serialize().length);
    });

    const result = await simulateTxBeforeSendBundle(connection, versionedTxs);
    console.log(result);
    return result;
  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return false;
  }
}