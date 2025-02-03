import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CreateAndBuyInputType, DistributionType } from "../types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { buildVersionedTx, getOrCreateKeypair, getSPLBalance, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { connection, JITO_FEE, sdk } from "../config";
import metadata from "../helper/metadata";
import { openAsBlob } from "fs";
import { DEFAULT_DECIMALS } from "../pumpfun/sdk";
import { MARKETActionType } from "../pumpfun/types";
import base58 from "bs58";
import { SystemProgram } from "@solana/web3.js";
import { getJitoTipWallet } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 100n;

export async function createAndBuyService(
  { 
    devPrivateKey,
    buyerPrivateKey,
    amount 
  }: CreateAndBuyInputType) {

  const devAccount = Keypair.fromSecretKey(bs58.decode(devPrivateKey)); 
  console.log(`devAccount: ${devAccount.publicKey.toBase58()}`);

  const buyAccount = Keypair.fromSecretKey(bs58.decode(buyerPrivateKey));
  console.log(`buyAccoount: ${buyAccount.publicKey.toBase58()}`);

  const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");
  console.log(`mintAccount: ${mint.publicKey.toBase58()}`);

  // let globalAccount = await sdk.getGlobalAccount();
  // console.log(globalAccount);

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
    let tokenMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      showName: metadata.showName,
      createOn: metadata.createdOn,
      twitter: metadata.twitter,
      telegram: metadata.telegram,
      website: metadata.website,
      file: await openAsBlob("./upload/bolt.jpg"),
    };

    let createResults = await sdk.createAndBuy(
      devAccount,
      mint,
      [buyAccount], // buyers
      tokenMetadata,
      [BigInt(0.02 * LAMPORTS_PER_SOL)],
      SLIPPAGE_BASIS_POINTS,
      // {
      //   unitLimit: 1000_000,
      //   unitPrice: 10,
      // },
    );

    if (createResults && createResults.confirmed) {
      console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
      console.log(createResults.jitoTxsignature);
      boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
      console.log("Bonding curve after create and buy", boundingCurveAccount);
      printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
    }
  } else {

    let tokenMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      showName: metadata.showName,
      createOn: metadata.createdOn,
      twitter: metadata.twitter,
      telegram: metadata.telegram,
      website: metadata.website,
      file: await openAsBlob("./upload/bolt.jpg"),
    };

    let createResults = await sdk.createAndBuy(
      devAccount,
      mint,
      [devAccount, buyAccount], // buyers
      tokenMetadata,
      [BigInt(0.05 * LAMPORTS_PER_SOL), BigInt(0.05 * LAMPORTS_PER_SOL)],
      SLIPPAGE_BASIS_POINTS,
      // {
      //   unitLimit: 1000_000,
      //   unitPrice: 7,
      // },
    );

    if (createResults && createResults.confirmed) {
      console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
      console.log(createResults.jitoTxsignature);
      // boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
      // console.log("Bonding curve after create and buy", boundingCurveAccount);
      printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
    }
    // console.log(boundingCurveAccount);
    // console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    // printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
  }

  // optional buy and sell
  if (boundingCurveAccount) {
    let buyCurrentSPLBalance = await getSPLBalance(
      connection,
      mint.publicKey,
      buyAccount.publicKey
    );
    let devCurrentSPLBalance = await getSPLBalance(
      connection,
      mint.publicKey,
      devAccount.publicKey
    );
   
    console.log(`devCurrentSPLBalance: ${buyCurrentSPLBalance}`);
    if (devCurrentSPLBalance) {
      await sleep(500); // await 500ms
      const devBalance = BigInt(Math.floor(devCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      // const buyBalance = BigInt(Math.floor(buyCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      const results = await sdk.optionalBuyAndSell(
        devAccount, // payer
        [MARKETActionType.SELL], // actions
        [devAccount, buyAccount], // accounts
        mint.publicKey, // mint
        [devBalance], // one is buy, other is sell
        [SLIPPAGE_BASIS_POINTS, SLIPPAGE_BASIS_POINTS],
        // {
        //   unitLimit: 100_000,
        //   unitPrice: 7,
        // },
      )
      if (results && results.confirmed) {
        console.log(results.jitoTxsignature);
        printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
      }
    }
  }
}

export const distributionService = async (
  { 
    fundWalletPrivateKey,
    walletPrivateKeys,
    solAmounts
  }: DistributionType) => {

  const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletPrivateKey));

  console.log(fundAccount.publicKey);
  printSOLBalance(connection, fundAccount.publicKey, "Sol info");

  const walletAccounts = walletPrivateKeys.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));
  walletAccounts.forEach((account, index) => {
    console.log(`${index} `, account.publicKey);
  });
  let instructions = walletAccounts.map((account, index) => {
    console.log(`${index}: `, BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index])));
    return SystemProgram.transfer({
      fromPubkey: fundAccount.publicKey,
      toPubkey: account.publicKey,
      lamports: BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index]))
    });
  })
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: fundAccount.publicKey,
      toPubkey: getJitoTipWallet(),
      lamports: JITO_FEE,
    })
  )

  const chunkInstrunctions = chunk(instructions, 5);
  console.log(chunkInstrunctions);

  const lastestBlockhash = await connection.getLatestBlockhash();

  const versionedTxs = await Promise.all(chunkInstrunctions.map(async (instructions) => {
    const tx = new Transaction().add(...instructions);
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
  
}