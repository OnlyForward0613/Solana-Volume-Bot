import { Request, Response } from "express";
import { launchTokenService, distributionService, gatherService, sellService } from "../services/pumpfun.service";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ResponseStatus } from "../core/ApiResponse";
import { AmountType, Key, NetworkType, WalletKey } from "../cache/keys";
import { getJson, getListRange, getValue } from "../cache/query";
import { connection, JITO_FEE } from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import { getSPLBalance, isFundSufficent, isValidSolanaPrivateKey } from "../helper/util";
import { DEFAULT_POW } from "../pumpfun/sdk";

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
        jitoFee
      }, 
      tokenInfo,
      mint,
      connection,
    );

    res.status(ResponseStatus.SUCCESS).send("Token launch is success");

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
    const fundWalletSK = await getValue(WalletKey.FUND) ?? null;
    const sniperWalletSK = await getValue(WalletKey.SNIPER) ?? null;
    const commonWalletSKs: string[] = await getListRange(WalletKey.COMMON) ?? [];

    const walletSKs: string[] = [];
    const solAmounts: number[] = [];
    if (commonAmounts.length > 0 && commonAmounts.length != commonWalletSKs?.length) throw Error("Insufficent input of common wallets");
    if (!fundWalletSK) throw Error("Doesn't exist fund wallet, please import fund wallet info");
    if (!sniperWalletSK) throw Error("Doesn't exist sniper wallet, please import sniper wallet");
    else {
      solAmounts.push(sniperAmount);
    }
    solAmounts.push(...commonAmounts);

    if (!solAmounts.length) throw Error("Any wallet doesn't exsit to fund");

    await distributionService({ 
      fundWalletSK,
      walletSKs,
      solAmounts, 
    }, connection);

    res.status(ResponseStatus.SUCCESS).send("Distribution sol is Ok");

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

    const devWalletSK = await getValue(WalletKey.DEV) ?? null;
    if (devWalletSK) walletSKs.push(devWalletSK);

    const sniperWalletSK = await getValue(WalletKey.SNIPER) ?? null;
    if (sniperWalletSK) walletSKs.push(sniperWalletSK);

    const commonWalletSKs = await getListRange<string>(WalletKey.COMMON);
    if (commonWalletSKs?.length) walletSKs.push(...commonWalletSKs);
    
    if (!walletSKs?.length) throw Error("There isn't any wallet to fund");

    const result = await gatherService(
      { 
        fundWalletSK, 
        walletSKs 
      },
      connection
    );;

    res.status(ResponseStatus.SUCCESS).send("Gathering fund to fund wallet is success");

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
    const commonWalletSKs = await getListRange(WalletKey.COMMON) ?? [];
    if (!commonWalletSKs?.length || commonWalletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in common wallets");
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

  } catch (err) {
    console.log(`Errors when selling percentage, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling percentage, ${err}`);
  }
}

export const sellByAmount = async (req: Request, res: Response) => {
  try {
    const walletSK = req.body.walletSK;
    if (!isValidSolanaPrivateKey([walletSK])) throw Error("Invalid solana address");
    const tokenAmount = req.body.tokenAmount;
    const commonWalletSKs = await getListRange(WalletKey.COMMON) ?? [];
    if (!commonWalletSKs?.length || commonWalletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in common wallets");
    const mintSK = await getValue(Key.MINT_PRIVATEKEY) ?? null;
    if (!mintSK) throw Error("Mint address doesn't exist");
    const mintAccount = Keypair.fromSecretKey(bs58.decode(mintSK));
    const walletAccount = Keypair.fromSecretKey(bs58.decode(walletSK));
    const tokenFloatAmount = await getSPLBalance(
      connection,
      mintAccount.publicKey,
      walletAccount.publicKey,
    );
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
  } catch (err) {
    console.log(`Errors when selling token by amount, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling token by amount, ${err}`);
  }
}