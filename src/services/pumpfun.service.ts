import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CreateAndBuyInput } from "../types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getOrCreateKeypair, getSPLBalance, printSOLBalance, printSPLBalance } from "../helper/util";
import { connection, sdk } from "../config";
import metadata from "../helper/metadata";
import { openAsBlob } from "fs";
import { DEFAULT_DECIMALS } from "../pumpfun/sdk";
import { MARKETActionType } from "../pumpfun/types";

const KEYS_FOLDER = __dirname + "/.keys";
const SLIPPAGE_BASIS_POINTS = 100n;

export async function createAndBuyService(
  { 
    devPrivateKey,
    buyerPrivateKey,
    amount: bigint 
  }: CreateAndBuyInput) {

  const devAccount = Keypair.fromSecretKey(bs58.decode(devPrivateKey)); 
  console.log(`devAccount: ${devAccount.publicKey.toBase58()}`);

  const buyAccount = Keypair.fromSecretKey(bs58.decode(buyerPrivateKey));
  console.log(`buyAccoount: ${buyAccount.publicKey.toBase58()}`);

  const mint = getOrCreateKeypair(KEYS_FOLDER, "mint");
  console.log(`mintAccount: ${mint.publicKey.toBase58()}`);

  let globalAccount = await sdk.getGlobalAccount();
  console.log(globalAccount);

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
      [devAccount, buyAccount], // buyers
      tokenMetadata,
      [BigInt(0.0001 * LAMPORTS_PER_SOL), BigInt(0.0001 * LAMPORTS_PER_SOL)],
      SLIPPAGE_BASIS_POINTS,
      {
        unitLimit: 1000_000,
        unitPrice: 10,
      },
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

    // let createResults = await sdk.createAndBuy(
    //   devAccount,
    //   mint,
    //   [devAccount, buyAccount], // buyers
    //   tokenMetadata,
    //   [BigInt(0.009 * LAMPORTS_PER_SOL), BigInt(0.009 * LAMPORTS_PER_SOL)],
    //   SLIPPAGE_BASIS_POINTS,
    //   // {
    //   //   unitLimit: 1000_000,
    //   //   unitPrice: 7,
    //   // },
    // );

    // if (createResults && createResults.confirmed) {
    //   console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
    //   console.log(createResults.jitoTxsignature);
    //   boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    //   console.log("Bonding curve after create and buy", boundingCurveAccount);
    //   printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
    // }
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
   
    console.log(`buyCurrentSPLBalance: ${buyCurrentSPLBalance}`);
    if (devCurrentSPLBalance && buyCurrentSPLBalance) {
      const devBalance = BigInt(Math.floor(devCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      const buyBalance = BigInt(Math.floor(buyCurrentSPLBalance * Math.pow(10, DEFAULT_DECIMALS)));
      const results = await sdk.optionalBuyAndSell(
        devAccount, // payer
        [MARKETActionType.SELL, MARKETActionType.SELL],
        [devAccount, buyAccount],
        mint.publicKey,
        [devBalance, buyBalance], // one is buy, other is sell
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