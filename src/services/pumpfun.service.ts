import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType } from "../types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { buildVersionedTx, getSPLBalance, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { connection, JITO_FEE, sdk } from "../config";
import { DEFAULT_DECIMALS } from "../pumpfun/sdk";
import { TokenMetadataType, MARKETActionType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";
import { TransactionInstruction } from "@solana/web3.js";

const SLIPPAGE_BASIS_POINTS = 200n;


export async function launchTokenService(
  {
    devSK,
    sniperSK,
    commonSKs,
    devSolAmount,
    sniperSolAmount,
    commonSolAmounts,
    jitoFee
  }: LaunchTokenType,
  tokenInfo: TokenMetadataType,
  mintSK: string,
) {

  const devAccount = Keypair.fromSecretKey(bs58.decode(devSK)); 
  console.log(`devAccount: ${devAccount.publicKey.toBase58()}`);

  const sniperAccount = Keypair.fromSecretKey(bs58.decode(sniperSK));
  console.log(`sniperAccount: ${sniperAccount.publicKey.toBase58()}`);

  const mint = Keypair.fromSecretKey(bs58.decode(mintSK));
  console.log(`mint: ${mint.publicKey.toBase58()}`);

  await printSOLBalance(
    connection,
    devAccount.publicKey,
    "devAccount keypair"
  );

  let currentSolBalance = await connection.getBalance(devAccount.publicKey);
  if (currentSolBalance == 0) {
    console.log(
      "Please send some SOL to the test-account:",
      devAccount.publicKey.toBase58()
    );
    return;
  }

  let boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
  console.log(boundingCurveAccount);

  if (!boundingCurveAccount) {

    let createResults = await sdk.launchToken(
      devAccount,
      mint,
      [devAccount, sniperAccount], // buyers
      tokenInfo,
      [BigInt(0.06 * LAMPORTS_PER_SOL), BigInt(0.07 * LAMPORTS_PER_SOL)],
      SLIPPAGE_BASIS_POINTS,
    );

    if (createResults && createResults.confirmed) {
      console.log("Success creation:", `https://pump.fun/${mint.publicKey.toBase58()}`);
      console.log(createResults.jitoTxsignature);
    }
  } else {
    console.log(boundingCurveAccount);
    console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
  }

  // optional buy and sell
    let buyCurrentSPLBalance = await getSPLBalance(
      connection,
      mint.publicKey,
      sniperAccount.publicKey
    );
    let devCurrentSPLBalance = await getSPLBalance(
      connection,
      mint.publicKey,
      devAccount.publicKey
    );
   
    console.log(`devCurrentSPLBalance: ${buyCurrentSPLBalance}`);
    if (devCurrentSPLBalance && buyCurrentSPLBalance) {
      // await sleep(500); // await 500ms
      const devBalance = BigInt(Math.floor(devCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      const buyBalance = BigInt(Math.floor(buyCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      const results = await sdk.optionalBuyAndSell(
        devAccount, // payer
        [MARKETActionType.SELL, MARKETActionType.SELL], // actions
        [devAccount, sniperAccount], // accounts
        mint.publicKey, // mint
        [devBalance, buyBalance], // one is buy, other is sell
        [SLIPPAGE_BASIS_POINTS, SLIPPAGE_BASIS_POINTS],
      )
      if (results && results.confirmed) {
        console.log(results.jitoTxsignature);
        printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
      }
    }
}

export const distributionService = async (
  { 
    fundWalletPrivateKey,
    walletPrivateKeys,
    solAmounts
  }: DistributionType,
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
    let instructions = walletAccounts.map((account, index) => {
      console.log(`${index}: `, BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index])));
      if (solAmounts[index] > 0) {
        return SystemProgram.transfer({
          fromPubkey: fundAccount.publicKey,
          toPubkey: account.publicKey,
          lamports: BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index]))
        });
      }
    })
    if (!instructions.length) {
      console.log("Not exist valuable transfer instruction");
      return false;
    } 
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: JITO_FEE,
      })
    );

    const chunkInstrunctions = chunk(instructions, 5);
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