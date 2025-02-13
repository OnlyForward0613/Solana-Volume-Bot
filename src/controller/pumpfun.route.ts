import { Request, Response } from "express";
import { launchTokenService, distributionService, gatherService, sellService, sellDumpAllService } from "../services/pumpfun.service";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ResponseStatus } from "../core/ApiResponse";
import { AmountType, Key, NetworkType, WalletKey, WalletType } from "../cache/keys";
import { getJson, getListRange, getValue } from "../cache/query";
import { connection, JITO_FEE } from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import { getSPLBalance, isFundSufficent, isValidSolanaPrivateKey } from "../helper/util";
import { DEFAULT_POW } from "../pumpfun/sdk";
import { getAllWallets } from "../cache/repository/WalletCache";

export async function launchToken(req: Request, res: Response) {
  try {
    const devSK = await getValue(WalletKey.DEV) ?? null
    const sniperSK = await getValue(WalletKey.SNIPER) ?? null
    const commonSKs = await getListRange<string>(WalletKey.COMMON) ?? [];
    const mintSK = await getValue(Key.MINT_PRIVATEKEY) ?? null;

    const devSolAmount = Number(await getValue(AmountType.DEV)) ?? 0;
    const sniperSolAmount = Number(await getValue(AmountType.SNIPER)) ?? 0; 
    const commonSolAmounts = await getListRange<number>(AmountType.COMMON) ?? [];

    const tokenInfo = await getJson<TokenMetadataType>(Key.TOKEN_METADATA) ?? null;
    if (!tokenInfo) throw Error("token metadata doesn't exist"); 
    console.log(tokenInfo);
    
    if (!mintSK) throw Error("Mint addresss doen't exist");

    if (!devSolAmount) throw Error("Dev solAmount doesn't exist");
    if (!devSK) throw Error("Dev wallet doesn't exist");

    if (!sniperSolAmount) throw Error("sniper solAmount doesn't exist");
    if (!sniperSK) throw Error("sniper wallet doesn't exist");

    const jitoFee =  Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;
    
    const checkers = commonSolAmounts.map(value => value > 0);
    
    let realCommonSKs = commonSKs.filter((_, index) => checkers[index]);
    let realCommonAccounts = realCommonSKs.map(account => Keypair.fromSecretKey(bs58.decode(account)));
    
    let realCommonSolAmounts = commonSolAmounts.filter((_, index) => checkers[index]);
    let realCommonAmounts = realCommonSolAmounts.map(value => BigInt(value * LAMPORTS_PER_SOL));
    let devAmount = BigInt(devSolAmount * LAMPORTS_PER_SOL);
    let sniperAmount = BigInt(sniperSolAmount * LAMPORTS_PER_SOL);

    const devAccount = Keypair.fromSecretKey(bs58.decode(devSK)); 
    const sniperAccount = Keypair.fromSecretKey(bs58.decode(sniperSK));
    const mint = Keypair.fromSecretKey(bs58.decode(mintSK));

    if (!isFundSufficent(devAccount.publicKey, devAmount, connection)) 
      throw Error("Dev wallet doesn' have enough fund");

    if (!isFundSufficent(sniperAccount.publicKey, sniperAmount, connection))
      throw Error("Sniper wallet doesn' have enough fund");

    for (let i = 0; i < realCommonAccounts.length; i++) {
      if (!isFundSufficent(realCommonAccounts[i].publicKey, realCommonAmounts[i], connection))
        throw Error("Sniper wallet doesn' have enough fund");
    }

    const result = await launchTokenService(
      {
        devAccount,
        sniperAccount,
        commonAccounts: realCommonAccounts,
        devAmount,
        sniperAmount,
        commonAmounts: realCommonAmounts,
      }, 
      tokenInfo,
      mint,
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when launch new token on Pumpfun, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when launch  new token on Pumpfun, ${err}`);
  }
}

export async function distributionSol(req: Request, res: Response) {
  try {
    const {
      sniperAmount,
      commonAmounts
    } = req.body;
    const fundWalletSK = await getValue(WalletKey.FUND) ?? "";
    const sniperWalletSK = await getValue(WalletKey.SNIPER) ?? "";
    const commonWalletSKs: string[] = await getListRange(WalletKey.COMMON) ?? [];
    const walletSKs: string[] = [];
    const solAmounts: number[] = [];
    console.log(commonAmounts);
    console.log(commonWalletSKs);
    if (commonAmounts.length > 0 && commonAmounts.length != commonWalletSKs?.length) {
      console.log("commonWallets PUSH -> commonAmounts: ", commonAmounts);
      throw Error("Insufficent input of common wallets");
    }
    if (!fundWalletSK) throw Error("Doesn't exist fund wallet, please import fund wallet info");
    if (sniperAmount > 0 && !sniperWalletSK) throw Error("Doesn't exist sniper wallet, please import sniper wallet");
    else if (sniperAmount > 0) {
      solAmounts.push(sniperAmount);
      walletSKs.push(sniperWalletSK);
    }
    solAmounts.push(...commonAmounts);
    walletSKs.push(...commonWalletSKs);

    if (!solAmounts.length) throw Error("Any wallet doesn't exsit to fund");
    const jitoFee =  Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;

    const result = await distributionService(
      { 
        fundWalletSK,
        walletSKs,
        solAmounts, 
      }, 
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when getting data in distributionSol endpoint, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when getting data in distributionSol endpoint, ${err}`);
  }
}

export const gatherFund = async (req: Request, res: Response) => {
  try {
    const fundWalletSK = await getValue(WalletKey.FUND) ?? null;
    if (!fundWalletSK) throw Error("fund wallet doesn't exist");

    const walletSKs: string[] = [];

    // const devWalletSK = await getValue(WalletKey.DEV) ?? null;
    // if (devWalletSK) walletSKs.push(devWalletSK);

    const sniperWalletSK = await getValue(WalletKey.SNIPER) ?? null;
    if (sniperWalletSK) walletSKs.push(sniperWalletSK);

    const commonWalletSKs = await getListRange<string>(WalletKey.COMMON);
    if (commonWalletSKs?.length) walletSKs.push(...commonWalletSKs);
    
    if (!walletSKs?.length) throw Error("There isn't any wallet to fund");
    
    const jitoFee =  Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;

    const result = await gatherService(
      { 
        fundWalletSK, 
        walletSKs 
      },
      connection,
      jitoFee,
    );;

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when gathering all wallet fund to fund wallet, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when gathering all wallet fund to fund wallet, ${err}`);
  }
}

// sell percentage
export const sellByPercentage = async (req: Request, res: Response) => {
  try {
    const walletSK = req.body.walletSK;
    if (!isValidSolanaPrivateKey([walletSK])) throw Error("Invalid solana address");
    const percentage = req.body.percentage;
    const walletSKs = await getAllWallets(); 
    console.log(walletSKs);
    if (!walletSKs?.length || !walletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in our wallets");
    const mintSK = await getValue(Key.MINT_PRIVATEKEY) ?? null;
    if (!mintSK) throw Error("Mint address doesn't exist");
    const mintAccount = Keypair.fromSecretKey(bs58.decode(mintSK));
    const walletAccount = Keypair.fromSecretKey(bs58.decode(walletSK));
    const tokenFloatAmount = await getSPLBalance(
      connection,
      mintAccount.publicKey,
      walletAccount.publicKey,
    );

    const jitoFee = Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;
    
    if (!tokenFloatAmount) throw Error("Don't have any token in the wallet");
    let tokenAmount = BigInt(Math.floor(DEFAULT_POW * tokenFloatAmount * percentage / 100));

    const result = await sellService(
      {
        walletAccount,
        mintPubKey: mintAccount.publicKey,
        tokenAmount
      }, 
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when selling percentage, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling percentage, ${err}`);
  }
}

// sell tokens by amount
export const sellByAmount = async (req: Request, res: Response) => {
  try {
    const walletSK = req.body.walletSK;
    if (!isValidSolanaPrivateKey([walletSK])) throw Error("Invalid solana address");
    const tokenAmount = req.body.tokenAmount;
    const walletSKs = await getAllWallets(); 
    console.log(walletSKs);
    if (!walletSKs?.length || !walletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in our wallets");
    const mintSK = await getValue(Key.MINT_PRIVATEKEY) ?? null;
    if (!mintSK) throw Error("Mint address doesn't exist");
    const mintAccount = Keypair.fromSecretKey(bs58.decode(mintSK));
    const walletAccount = Keypair.fromSecretKey(bs58.decode(walletSK));
    const tokenFloatAmount = await getSPLBalance(
      connection,
      mintAccount.publicKey,
      walletAccount.publicKey,
    );

    console.log(`realAmount: ${tokenFloatAmount}, tokenAmount: ${tokenAmount}`);

    if (!tokenFloatAmount || tokenFloatAmount < tokenAmount) throw Error("Don't have sufficent token in the wallet");
   
    const jitoFee = Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;
    
    const result = await sellService(
      {
        walletAccount,
        mintPubKey: mintAccount.publicKey,
        tokenAmount: BigInt(Math.floor(DEFAULT_POW * tokenAmount)),
      }, 
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when selling token by amount, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling token by amount, ${err}`);
  }
}

// sell all tokens in wallets
export const sellDumpAll = async (req: Request, res: Response) => {
  try {
    const devSK = await getValue(WalletKey.DEV) ?? null
    const sniperSK = await getValue(WalletKey.SNIPER) ?? null
    const fundSK = await getValue(WalletKey.FUND) ?? null;
    const commonSKs = await getListRange<string>(WalletKey.COMMON) ?? [];
    const mintSK = await getValue(Key.MINT_PRIVATEKEY) ?? null;

    if (!mintSK) throw Error("Mint addresss doen't exist");
    if (!devSK) throw Error("Dev wallet doesn't exist");
    if (!sniperSK) throw Error("sniper wallet doesn't exist");
    if (!fundSK) throw Error("sniper wallet doesn't exist");

    let commonAccounts = commonSKs.map(account => Keypair.fromSecretKey(bs58.decode(account)));
    const devAccount = Keypair.fromSecretKey(bs58.decode(devSK)); 
    const sniperAccount = Keypair.fromSecretKey(bs58.decode(sniperSK));
    const mint = Keypair.fromSecretKey(bs58.decode(mintSK));
    const fundAccount = Keypair.fromSecretKey(bs58.decode(fundSK));

    let walletAccounts: Keypair[] = [devAccount, sniperAccount, ...commonAccounts];

    let sellTokenAmounts: bigint[] = []
    let sellAccounts: Keypair[] = []
    await Promise.all(walletAccounts.map(async (account, index) => {
      let amount = await getSPLBalance(connection, mint.publicKey, account.publicKey);
      if (amount && amount > 0) {
        sellAccounts.push(account);
        sellTokenAmounts.push(BigInt(Math.floor(DEFAULT_POW * amount)));
      }
    }));

    if (!sellAccounts.length) throw Error("Any wallet dosn't have any token");
    
    const jitoFee = Number(await getValue(NetworkType.JITO_FEE)) ?? JITO_FEE;

    const result = await sellDumpAllService(
      {
        payer: fundAccount,
        sellAccounts,
        sellTokenAmounts,
        mintPubKey: mint.publicKey
      },
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when selling dump all, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling dump all, ${err}`);
  }
}