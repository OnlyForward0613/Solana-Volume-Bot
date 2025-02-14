import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType, GatherType, sellType, SellDumpAllType } from "../types";
import { buildTx, printSOLBalance, printSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { JITO_FEE, lutProviders, sdk } from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";
import { TransactionInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { LookupTableProvider } from "../helper/lutProvider";

const SLIPPAGE_BASIS_POINTS = 500n;

// launch new token on solana based on mint address
export async function launchTokenService(
  {
    fundAccount,
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
    
    // configure lookup table
    lutProviders["first"] = new LookupTableProvider();
    await lutProviders["first"].getLookupTable(new PublicKey("3Q3epsDP64Z4YUr9u7UYBENzJLafwAnxRq41RmMf8X3R"));
    if (!boundingCurveAccount) {

      let globalAccount = await sdk.getGlobalAccount();
      if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");

      console.log("jito fee: ", jitoFee);
      console.log("global account: ", globalAccount);
      console.log("fundAccount", fundAccount.publicKey.toBase58());
      console.log("devAccount", devAccount.publicKey.toBase58());
      console.log("sniperAccount", sniperAccount.publicKey.toBase58());
      console.log("mint", mint.publicKey.toBase58());
      console.log("devAmount", devAmount);
      console.log("sniperAmount", sniperAmount);
      console.log("commonAccounts", commonAccounts.map(account => account.publicKey.toBase58()));
      console.log("commonAmounts", commonAmounts);
      console.log("tokenInfo", tokenInfo);
      
      let createResult = await sdk.launchToken(
        fundAccount, // payer
        mint,
        [devAccount, sniperAccount], // buyers
        tokenInfo,
        [devAmount, sniperAmount],
        jitoFee,
        SLIPPAGE_BASIS_POINTS,
      );

      if (createResult.confirmed) {
        console.log("Success creation:", `https://pump.fun/${mint.publicKey.toBase58()}`);
        console.log(`https://solscan.io/tx/${createResult.content}`)
      } else {
        throw Error(createResult.content);
      }

      await sleep(500);

      const secondResult = await sdk.firstBundleAfterCreation(
        fundAccount,
        sniperAccount,
        commonAccounts,
        commonAmounts,
        mint.publicKey, // mint
        jitoFee,
        connection,
        globalAccount,
        SLIPPAGE_BASIS_POINTS,
      );
      if (secondResult.confirmed) {
        console.log(`https://solscan.io/tx/${secondResult.content}`)
        console.log(secondResult.content);
      } 
      return secondResult;

    } else {

      let globalAccount = await sdk.getGlobalAccount();
      if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");

      console.log("only second bundle");

      const secondResult = await sdk.firstBundleAfterCreation(
        devAccount,
        sniperAccount,
        commonAccounts,
        commonAmounts,
        mint.publicKey, // mint
        jitoFee,
        connection,
        globalAccount,
        SLIPPAGE_BASIS_POINTS,
      );
      if (secondResult.confirmed) {
        console.log(`https://solscan.io/tx/${secondResult.content}`)
        console.log(secondResult.content);
      } 
      return secondResult;
      console.log("The token already exists:", `https://pump.fun/${mint.publicKey.toBase58()}`);
      printSPLBalance(connection, mint.publicKey, devAccount.publicKey);
      throw Error("the mint token already exists on Pumpfun");
    }
  } catch (err) {
    console.log(`Errors when launching new token on Pumpfun, ${err}`);
    return { confirmed: false, content: `Errors when launching new token on Pumpfun, ${err}` };
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
    const walletAccounts = walletSKs.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));
    console.log(walletSKs);
    console.log(`jito fee: ${jitoFee}`);

    let ixs: TransactionInstruction[] = [];
    await Promise.all(walletAccounts.map((account, index) => {
      console.log(`distribution, wallet${index}: ${account.publicKey.toBase58()}, ${BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index]))}`);
      if (solAmounts[index] > 0) {
        ixs.push(SystemProgram.transfer({
          fromPubkey: fundAccount.publicKey,
          toPubkey: account.publicKey,
          lamports: BigInt(Math.floor(LAMPORTS_PER_SOL * solAmounts[index])),
        }));
      }
    }));

    if (!ixs.length) throw Error("Not exist valuable transfer instruction");

    ixs.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: jitoFee,
      })
    );

    // we will include several tranfer instructions in one transaction, at least 5 insturctions
    const chunkIxs = chunk(ixs, 5);
    console.log(chunkIxs);

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
    // return { confirmed: simulateResult, content: "Distribution simulation is OK" };

    let result;
    let count = 0;

    while (true) { // We will try 3 times until bundle is success
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }
    if (result.confirmed) console.log(`https://solscan.io/tx/${result.content}`);

    return result;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return { confirmed: false, content: `Errors when distributing Sol to wallets, ${err}` };
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

    let solAmounts: bigint[] = [];
    const walletAccounts: Keypair[] = []; 
    await Promise.all(walletSKs.map(async (SK) => {
      const key = Keypair.fromSecretKey(base58.decode(SK));
      const solAmount = BigInt(await connection.getBalance(key.publicKey));
      if (solAmount > 0n) {
        solAmounts.push(solAmount);
        walletAccounts.push(key);
      }
    }));

    if (!walletAccounts.length) throw Error("All wallet don't have any fund");

    let ixs: TransactionInstruction[] = [];

    await Promise.all(walletAccounts.map((account, index) => {
      ixs.push(SystemProgram.transfer({
        fromPubkey: account.publicKey,
        toPubkey: fundAccount.publicKey,
        lamports: solAmounts[index]
      }));
    }));
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: fundAccount.publicKey,
        toPubkey: getJitoTipWallet(),
        lamports: jitoFee,
      })
    );
    

    const chunkIxs = chunk(ixs, 5);
    const chunkAccounts = chunk(walletAccounts, 5);
  
    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkIxs.map(async (ixs, index) => {
      const tx = new Transaction().add(...ixs as TransactionInstruction[]);
      console.log(chunkAccounts[index]);
      const versionedTx = await buildTx(
        connection,
        tx,
        fundAccount.publicKey,
        [fundAccount, ...chunkAccounts[index]],
        latestBlockhash
      )
      if (!versionedTx) throw Error(`Errors when gathering funds of wallet to fund wallet, ${index}`);
      return versionedTx;
    }));

    bundleTxs.map((bundle, index) => {
      console.log(`txsize${index}: `, bundle.serialize().length);
    });

    const simulateResult = await simulateTxBeforeSendBundle(connection, bundleTxs);
    console.log(simulateResult);
    if (!simulateResult) throw Error("Simulation errors when distributiong fund  to wallets");
    // return { confirmed: simulateResult, content: "GatherFund simulation is OK" };

    let result;
    let count = 0;

    while (true) {
      result = await jitoWithAxios(bundleTxs, latestBlockhash);
      if (result.confirmed) break;
      count++;
      if (count > 3) throw Error("Bundle failed");
    }

    if (result.confirmed) console.log(`https://solscan.io/tx/${result.content}`);

    return result;

  } catch (err) {
    console.log(`Errors when distributing Sol to wallets, ${err}`);
    return { confirmed: false, content: `Errors when distributing Sol to wallets, ${err}` };
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

    if (result.confirmed) {
      console.log("Success creation:", `https://pump.fun/${mintPubKey.toBase58()}`);
      console.log(`https://solscan.io/tx/${result.content}`);
    }

    return result;

  } catch (err) {
    console.log(`Errors when sell token in sellSevice, ${err}`);
    return { confirmed: false, content: `Errors when sell token in sellSevice, ${err}` };
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
    
    lutProviders["first"] = new LookupTableProvider();
    
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
      console.log("sellDumpAll bundle is success:", `https://pump.fun/${mintPubKey.toBase58()}`);
      console.log(`https://solscan.io/tx/${result.content}`);
    }

    return result;

  } catch (err) {
    console.log(`Error when selling dump all in sellDumpAllService, ${err}`);
    return { confirmed: false, content: `Error when selling dump all in sellDumpAllService, ${err}` };
  }
}