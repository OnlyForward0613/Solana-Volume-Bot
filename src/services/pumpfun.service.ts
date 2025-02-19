import { Commitment, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { LaunchTokenType, DistributionType, GatherType, sellType, SellDumpAllType } from "../types";
import { buildTx, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { DEFAULT_JITO_FEE, private_connection, pumpFunSDKs} from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { Transaction } from "@solana/web3.js";
import { TransactionInstruction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { getValue } from "../cache/query";
import { Key } from "../cache/keys";
import { BondingCurveAccount } from "../pumpfun/bondingCurveAccount";

const SLIPPAGE_BASIS_POINTS = 200n;

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
  authKey: string,
  jitoFee: number = DEFAULT_JITO_FEE,
) {
  try {

    let sdk = pumpFunSDKs[authKey];
    let boundingCurveAccount = await sdk.getBondingCurveAccount(mint.publicKey);
    // console.log(boundingCurveAccount);
    let lutAccount;
    let lut = await getValue(Key.LUT_ADDRESS, authKey) ?? null;
    console.log("lut in first bundle => ", lut);
    if (lut) lutAccount = (await private_connection.getAddressLookupTable(new PublicKey(lut))).value;
    console.log("lutAccount => ", lutAccount?.state.addresses.length);
    
    // configure lookup table
    if (!boundingCurveAccount) {

      let globalAccount = await sdk.getGlobalAccount();
      if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
      // console.log(globalAccount);

      let createResult = await sdk.launchToken(
        fundAccount, // payer
        mint,
        [devAccount, sniperAccount], // buyers
        commonAccounts,
        tokenInfo,
        [devAmount, sniperAmount],
        jitoFee,
        authKey,
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
        authKey,
        globalAccount,
        SLIPPAGE_BASIS_POINTS
      );
      if (secondResult.confirmed) {
        console.log(`https://solscan.io/tx/${secondResult.content}`)
        console.log(secondResult.content);
      } 
      return secondResult;

    } else {

      // let globalAccount = await sdk.getGlobalAccount();
      // if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
      // console.log(globalAccount);
      
      // const secondResult = await sdk.firstBundleAfterCreation(
      //   fundAccount,
      //   sniperAccount,
      //   commonAccounts,
      //   commonAmounts,
      //   mint.publicKey, // mint
      //   jitoFee,
      //   authKey,
      //   globalAccount,
      //   SLIPPAGE_BASIS_POINTS
      // );
      // if (secondResult.confirmed) {
      //   console.log(`https://solscan.io/tx/${secondResult.content}`)
      //   console.log(secondResult.content);
      // } 
      // return secondResult;
      console.log("The token already exists:", `https://pump.fun/${mint.publicKey.toBase58()}`);
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
  jitoFee: number = DEFAULT_JITO_FEE,
) => {
  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletSK));
    const walletAccounts = walletSKs.map(privateKey => Keypair.fromSecretKey(base58.decode(privateKey)));

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

    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkIxs.map(async (ixs) => {
      const tx = new Transaction().add(...ixs as TransactionInstruction[]);
      const versionedTx = await buildTx(
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

    // const simulateResult = await simulateTxBeforeSendBundle(connection, bundleTxs);
    // console.log(simulateResult);
    // if (!simulateResult) throw Error("Simulation errors when distributiong fund  to wallets");
    // return { confirmed: simulateResult, content: "Distribution simulation is OK" };

    let result;
    let count = 0;

    while (true) { // We will try 3 times until bundle is success
      result = await jitoWithAxios(bundleTxs, latestBlockhash, connection);
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
  jitoFee: number = DEFAULT_JITO_FEE
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
      const versionedTx = await buildTx(
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

    // const simulateResult = await simulateTxBeforeSendBundle(connection, bundleTxs);
    // console.log(simulateResult);
    // if (!simulateResult) throw Error("Simulation errors when distributiong fund  to wallets");
    // return { confirmed: simulateResult, content: "GatherFund simulation is OK" };

    let result;
    let count = 0;

    while (true) {
      result = await jitoWithAxios(bundleTxs, latestBlockhash, connection);
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
  authKey: string,
  jitoFee: number = DEFAULT_JITO_FEE,
) => {
  try {
    let sdk = pumpFunSDKs[authKey];
    let globalAccount = await sdk.getGlobalAccount();
    if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
    
    const result = await sdk.sellOne(
      walletAccount,
      walletAccount,
      tokenAmount, // sell token amount
      mintPubKey,
      jitoFee,
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
  authKey: string,
  jitoFee: number = DEFAULT_JITO_FEE,
) => {
  try {
    let sdk = pumpFunSDKs[authKey];
    let globalAccount = await sdk.getGlobalAccount();
    if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");
    
    const result =  await sdk.sellDumpAll(
      payer,
      sellAccounts,
      sellTokenAmounts,
      mintPubKey,
      jitoFee,
      authKey,
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