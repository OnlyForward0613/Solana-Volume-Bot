import { 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey, 
  SystemProgram,
  Transaction, 
  TransactionInstruction,
  Connection,
} from "@solana/web3.js";
import { LaunchTokenType, DistributionType, GatherType, sellType, SellDumpAllType } from "../types";
import { buildTx, getSPLBalance, simulateTxBeforeSendBundle, sleep } from "../helper/util";
import { DEFAULT_JITO_FEE, private_connection, pumpFunSDKs, userConnections} from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import base58 from "bs58";
import { getJitoTipWallet, jitoWithAxios } from "../helper/jitoWithAxios";
import chunk from 'lodash/chunk';
import { getValue } from "../cache/query";
import { Key } from "../cache/keys";
import { PoolKeys } from "../raydium/getPoolKeys";
import { NATIVE_MINT, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { RaydiumSDK } from "../raydium/raydiumSDK";
import { LiquidityPoolKeys } from "@raydium-io/raydium-sdk";

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
        devAccount, // payer
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

export const gatherSolService = async (
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
    
    let jitoIx = SystemProgram.transfer({
      fromPubkey: fundAccount.publicKey,
      toPubkey: getJitoTipWallet(),
      lamports: jitoFee,
    });
    

    const chunkIxs = chunk(ixs, 5);
    const chunkAccounts = chunk(walletAccounts, 5);
  
    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkIxs.map(async (ixs, index) => {
      const tx = new Transaction().add(...ixs as TransactionInstruction[]);
      if (index == chunkIxs.length - 1) tx.add(jitoIx);
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
    console.log(`Errors when gathering Sol to wallets, ${err}`);
    return { confirmed: false, content: `Errors when gathering Sol to wallets, ${err}` };
  }
}

export const gatherWSolService = async (
  { 
    fundWalletSK,
    walletSKs,
  }: GatherType,
  connection: Connection,
  jitoFee: number = DEFAULT_JITO_FEE
) => {
  try {
    const fundAccount = Keypair.fromSecretKey(base58.decode(fundWalletSK));

    let wsolAmounts: bigint[] = [];
    const walletAccounts: Keypair[] = []; 
    await Promise.all(walletSKs.map(async (SK) => {
      const key = Keypair.fromSecretKey(base58.decode(SK));
      const wsolAmount = await getSPLBalance(connection, NATIVE_MINT, key.publicKey);
      if (wsolAmount && wsolAmount > 0) {
        wsolAmounts.push(BigInt(Math.floor(wsolAmount * LAMPORTS_PER_SOL)));
        walletAccounts.push(key);
      }
    }));

    if (!walletAccounts.length) throw Error("All wallet don't have any fund");

    let ixs: TransactionInstruction[] = [];

    let createAtaIx = null;
    let fundWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, fundAccount.publicKey);
    try {
      await getAccount(connection, fundWsolAta);
    } catch (e) {
      createAtaIx = createAssociatedTokenAccountInstruction(
        fundAccount.publicKey, // payer of initialization fees
        fundWsolAta, // new associated token account
        fundAccount.publicKey, // new account's owner
        NATIVE_MINT // token mint account
      );
    }
    await Promise.all(walletAccounts.map(async (account, index) => {
      let fromWsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, account.publicKey);
      let transferIx = createTransferInstruction(
        fromWsolAta,
        fundWsolAta,
        account.publicKey,
        wsolAmounts[index],
      )
      ixs.push(transferIx);
    }));

    console.log("transfer instruction length => ", ixs?.length);

    let jitoIx = SystemProgram.transfer({
      fromPubkey: fundAccount.publicKey,
      toPubkey: getJitoTipWallet(),
      lamports: jitoFee,
    });
    
    const chunkIxs = chunk(ixs, 6);
    const chunkAccounts = chunk(walletAccounts, 6);
  
    const latestBlockhash = await connection.getLatestBlockhash();

    const bundleTxs = await Promise.all(chunkIxs.map(async (ixs, index) => {
      const tx = new Transaction();
      if (index == 0 && createAtaIx) tx.add(createAtaIx);
      tx.add(...ixs as TransactionInstruction[]);
      if (index == chunkIxs.length - 1) tx.add(jitoIx);
      const versionedTx = await buildTx(
        tx,
        fundAccount.publicKey,
        [fundAccount, ...chunkAccounts[index]],
        latestBlockhash
      )
      if (!versionedTx) throw Error(`Errors when gathering funds of wallet to fund wallet, ${index}`);
      return versionedTx;
    }));

    const closeWsolAtaIx = createCloseAccountInstruction(
      fundWsolAta,
      fundAccount.publicKey,
      fundAccount.publicKey
    )
    const unwrapSolTx = new Transaction().add(closeWsolAtaIx);
    const unwrapSolVersionedTx = await buildTx(
      unwrapSolTx,
      fundAccount.publicKey,
      [fundAccount],
      latestBlockhash
    );
    if (!unwrapSolVersionedTx) throw Error("unwrapSolVersionedTx is empty");
    bundleTxs.push(unwrapSolVersionedTx);

    bundleTxs.map((bundle, index) => {
      console.log(`txsize${index}: `, bundle.serialize().length);
    });

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
    console.log(`Errors when gathering WSOL to wallets, ${err}`);
    return { confirmed: false, content: `Errors when gathering WSOL to wallets, ${err}` };
  }
}

export const sellOneService = async (
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
    let bondingCurveAccount = await sdk.getBondingCurveAccount(
      mintPubKey,
    );
    if (!bondingCurveAccount) throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");

    let result;
    if (bondingCurveAccount.complete) { // SELL in Raydium
      const poolKeys = await PoolKeys.fetchPoolKeyInfo(
        userConnections[authKey], 
        NATIVE_MINT,
        mintPubKey,
      );
      if (!poolKeys) throw Error("Errors when getting fetPoolKeyInfo");
      const raydiumSDK = new RaydiumSDK(userConnections[authKey]);
      result = await raydiumSDK.sellOne(
        walletAccount,
        tokenAmount, // sell token amount
        poolKeys as LiquidityPoolKeys,
        mintPubKey,
        jitoFee,
        SLIPPAGE_BASIS_POINTS
      );
    } else { // SELL in Pumpfun
      let globalAccount = await sdk.getGlobalAccount();
      if (!globalAccount) throw Error("It seems like there are some errors in rpc or network, plz try again");

      result = await sdk.sellOne(
        walletAccount,
        walletAccount,
        tokenAmount, // sell token amount
        mintPubKey,
        jitoFee,
        globalAccount,
        bondingCurveAccount,
        SLIPPAGE_BASIS_POINTS
      );
    }
    if (result?.confirmed) {
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
    
    let bondingCurveAccount = await sdk.getBondingCurveAccount(
      mintPubKey,
    );
    if (!bondingCurveAccount) throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");

    let result;
    if (bondingCurveAccount.complete) {
      const poolKeys = await PoolKeys.fetchPoolKeyInfo(
        userConnections[authKey], 
        NATIVE_MINT,
        mintPubKey,
      );
      if (!poolKeys) throw Error("Errors when getting fetPoolKeyInfo");
      const raydiumSDK = new RaydiumSDK(userConnections[authKey]);
      // result = await raydiumSDK.createLUT(
      //   payer,
      //   sellAccounts,
      //   mintPubKey,
      //   authKey,
      //   jitoFee,
      //   SLIPPAGE_BASIS_POINTS
      // )
      sellAccounts.map((account, index) => {
        console.log(`account:${index}, ${account.publicKey.toBase58()}, ${sellTokenAmounts[index]}`);
      })
      result = await raydiumSDK.sellDumpAll(
        sellAccounts,
        sellTokenAmounts,
        poolKeys as LiquidityPoolKeys,
        mintPubKey,
        authKey,
        jitoFee,
        SLIPPAGE_BASIS_POINTS
      );
    } else {
      result = await sdk.sellDumpAll(
        payer,
        sellAccounts,
        sellTokenAmounts,
        mintPubKey,
        jitoFee,
        authKey,
        globalAccount,
        bondingCurveAccount,
        SLIPPAGE_BASIS_POINTS,
      );
    }

    if (result?.confirmed) {
      console.log("sellDumpAll bundle is success:", `https://pump.fun/${mintPubKey.toBase58()}`);
      console.log(`https://solscan.io/tx/${result.content}`);
    }

    return result;

  } catch (err) {
    console.log(`Error when selling dump all in sellDumpAllService, ${err}`);
    return { confirmed: false, content: `Error when selling dump all in sellDumpAllService, ${err}` };
  }
}