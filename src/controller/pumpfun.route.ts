import { Request, Response } from "express";
import { 
  launchTokenService, 
  distributionService, 
  gatherSolService, 
  sellOneService, 
  sellDumpAllService, 
  gatherWSolService
} from "../services/pumpfun.service";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ResponseStatus } from "../core/ApiResponse";
import { AmountType, Key, NetworkType, WalletKey } from "../cache/keys";
import { addValueToArray, getArray, getJson, getValue } from "../cache/query";
import { DEFAULT_JITO_FEE, jitoFees, userConnections } from "../config";
import { TokenMetadataType } from "../pumpfun/types";
import { getSPLBalance, isFundSufficent, isValidSolanaPrivateKey } from "../helper/util";
import { DEFAULT_POW } from "../pumpfun/sdk";
import { getAllWallets } from "../cache/repository/WalletCache";

export async function launchToken(req: Request, res: Response) {
  try {
    const authKey = req.headers.authorization as string;
    const devSK = await getValue(WalletKey.DEV, authKey) ?? null
    const sniperSK = await getValue(WalletKey.SNIPER, authKey) ?? null
    const commonSKs = await getArray<string>(WalletKey.COMMON, authKey) ?? [];
    const fundPK = await getValue(WalletKey.FUND, authKey) ?? null
    
    const mintSK = await getValue(Key.MINT_PRIVATEKEY, authKey) ?? null;

    const devSolAmount = Number(await getValue(AmountType.DEV, authKey)) ?? 0;
    const sniperSolAmount = Number(await getValue(AmountType.SNIPER, authKey)) ?? 0; 
    const commonSolAmounts = await getArray<number>(AmountType.COMMON, authKey) ?? [];

    const tokenInfo = await getJson<TokenMetadataType>(Key.TOKEN_METADATA, authKey) ?? null;
    if (!tokenInfo) throw Error("token metadata doesn't exist"); 
    console.log(tokenInfo);
    
    if (!mintSK) throw Error("Mint addresss doen't exist");
    if (!fundPK) throw Error("Fund wallet doesn't exist"); 
    if (!devSolAmount) throw Error("Dev solAmount doesn't exist");
    if (!devSK) throw Error("Dev wallet doesn't exist");

    if (!sniperSolAmount) throw Error("sniper solAmount doesn't exist");
    if (!sniperSK) throw Error("sniper wallet doesn't exist");

    const jitoFee =  jitoFees[authKey];
    
    const checkers = commonSolAmounts.map(value => value > 0);
    
    let realCommonSKs = commonSKs.filter((_, index) => checkers[index]);
    let realCommonAccounts = realCommonSKs.map(account => Keypair.fromSecretKey(bs58.decode(account)));
    
    let realCommonSolAmounts = commonSolAmounts.filter((_, index) => checkers[index]);
    let realCommonAmounts = realCommonSolAmounts.map(value => BigInt(value * LAMPORTS_PER_SOL));
    let devAmount = BigInt(devSolAmount * LAMPORTS_PER_SOL);
    let sniperAmount = BigInt(sniperSolAmount * LAMPORTS_PER_SOL);

    const devAccount = Keypair.fromSecretKey(bs58.decode(devSK)); 
    const fundAccount = Keypair.fromSecretKey(bs58.decode(fundPK)); 
    const sniperAccount = Keypair.fromSecretKey(bs58.decode(sniperSK));
    const mint = Keypair.fromSecretKey(bs58.decode(mintSK));

    const connection = userConnections[authKey]

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
        fundAccount,
        devAccount,
        sniperAccount,
        commonAccounts: realCommonAccounts,
        devAmount,
        sniperAmount,
        commonAmounts: realCommonAmounts,
      }, 
      tokenInfo,
      mint,
      authKey,
      jitoFee,
    );

    if (result.confirmed) {
      await addValueToArray(Key.MINT_LIST, authKey, mint.publicKey.toBase58());
      console.log("token mint address was successfully saved");
      res.status(ResponseStatus.SUCCESS).send(result.content);
    }
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
    const authKey = req.headers.authorization as string;
    const fundWalletSK = await getValue(WalletKey.FUND, authKey) ?? "";
    const sniperWalletSK = await getValue(WalletKey.SNIPER, authKey) ?? "";
    const commonWalletSKs: string[] = await getArray<string>(WalletKey.COMMON, authKey) ?? [];
    const walletSKs: string[] = [];
    const solAmounts: number[] = [];
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
    const jitoFee =  jitoFees[authKey];

    const connection = userConnections[authKey];
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
    const authKey = req.headers.authorization as string;
    const fundWalletSK = await getValue(WalletKey.FUND, authKey) ?? null;
    if (!fundWalletSK) throw Error("fund wallet doesn't exist");

    const walletSKs: string[] = [];

    // const devWalletSK = await getValue(WalletKey.DEV) ?? null;
    // if (devWalletSK) walletSKs.push(devWalletSK);

    const sniperWalletSK = await getValue(WalletKey.SNIPER, authKey) ?? null;
    if (sniperWalletSK) walletSKs.push(sniperWalletSK);

    const commonWalletSKs = await getArray<string>(WalletKey.COMMON, authKey);
    if (commonWalletSKs?.length) walletSKs.push(...commonWalletSKs);
    
    if (!walletSKs?.length) throw Error("There isn't any wallet to fund");
    
    const jitoFee =  jitoFees[authKey];

    const connection = userConnections[authKey];
    const result = await gatherSolService(
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

export const gatherWsol = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const fundWalletSK = await getValue(WalletKey.FUND, authKey) ?? null;
    if (!fundWalletSK) throw Error("fund wallet doesn't exist");

    const walletSKs: string[] = [];

    const devWalletSK = await getValue(WalletKey.DEV, authKey) ?? null;
    if (devWalletSK) walletSKs.push(devWalletSK);

    const sniperWalletSK = await getValue(WalletKey.SNIPER, authKey) ?? null;
    if (sniperWalletSK) walletSKs.push(sniperWalletSK);

    const commonWalletSKs = await getArray<string>(WalletKey.COMMON, authKey);
    if (commonWalletSKs?.length) walletSKs.push(...commonWalletSKs);
    
    if (!walletSKs?.length) throw Error("There isn't any wallet to fund");
    
    const jitoFee =  jitoFees[authKey];

    const connection = userConnections[authKey];
    const result = await gatherWSolService(
      { 
        fundWalletSK, 
        walletSKs 
      },
      connection,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when gathering WSOL from all wallets to fund wallet, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when gathering WSOL from all wallets to fund wallet, ${err}`);
  }
}

// sell percentage
export const sellByPercentage = async (req: Request, res: Response) => {
  try {
    const walletSK = req.body.walletSK;
    const authKey = req.headers.authorization as string;
    if (!isValidSolanaPrivateKey([walletSK])) throw Error("Invalid solana address");
    const percentage = req.body.percentage;
    const walletSKs = await getAllWallets(authKey); 
    if (!walletSKs?.length || !walletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in our wallets");
    const mintSK = await getValue(Key.MINT_PRIVATEKEY, authKey) ?? null;
    if (!mintSK) throw Error("Mint address doesn't exist");
    const mintAccount = Keypair.fromSecretKey(bs58.decode(mintSK));
    const walletAccount = Keypair.fromSecretKey(bs58.decode(walletSK));

    const connection = userConnections[authKey];
    const tokenFloatAmount = await getSPLBalance(
      connection,
      mintAccount.publicKey,
      walletAccount.publicKey,
    );

    const jitoFee = jitoFees[authKey];
    
    if (!tokenFloatAmount) throw Error("Don't have any token in the wallet");
    let tokenAmount = BigInt(Math.floor(DEFAULT_POW * tokenFloatAmount * percentage / 100));
    // let tokenAmount = BigInt(Math.floor(DEFAULT_POW * 100 * percentage/ 100));

    const result = await sellOneService(
      {
        walletAccount,
        mintPubKey: mintAccount.publicKey,
        tokenAmount
      },
      authKey, 
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
    const authKey = req.headers.authorization as string;
    if (!isValidSolanaPrivateKey([walletSK])) throw Error("Invalid solana address");
    const tokenAmount = req.body.tokenAmount;
    const walletSKs = await getAllWallets(authKey); 
    if (!walletSKs?.length || !walletSKs.includes(walletSK)) throw Error("the wallet doesn't exsit in our wallets");
    const mintSK = await getValue(Key.MINT_PRIVATEKEY, authKey) ?? null;
    if (!mintSK) throw Error("Mint address doesn't exist");
    const mintAccount = Keypair.fromSecretKey(bs58.decode(mintSK));
    const walletAccount = Keypair.fromSecretKey(bs58.decode(walletSK));

    const connection = userConnections[authKey];
    const tokenFloatAmount = await getSPLBalance(
      connection,
      mintAccount.publicKey,
      walletAccount.publicKey,
    );

    console.log(`realAmount: ${tokenFloatAmount}, tokenAmount: ${tokenAmount}`);

    if (!tokenFloatAmount || tokenFloatAmount < tokenAmount) throw Error("Don't have sufficent token in the wallet");
   
    const jitoFee = jitoFees[authKey];
    
    const result = await sellOneService(
      {
        walletAccount,
        mintPubKey: mintAccount.publicKey,
        tokenAmount: BigInt(Math.floor(DEFAULT_POW * tokenAmount)),
      }, 
      authKey,
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
    const authKey = req.headers.authorization as string;
    const devSK = await getValue(WalletKey.DEV, authKey) ?? null
    const sniperSK = await getValue(WalletKey.SNIPER, authKey) ?? null
    const fundSK = await getValue(WalletKey.FUND, authKey) ?? null;
    const commonSKs = await getArray<string>(WalletKey.COMMON, authKey) ?? [];
    const mintSK = await getValue(Key.MINT_PRIVATEKEY, authKey) ?? null;

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

    let sellTokenAmounts: bigint[] = [];
    let sellAccounts: Keypair[] = [];
    const connection = userConnections[authKey];
    // let mintPubKey = new PublicKey("G748DbPu713PkumVJo4nXcXuyCTBYbhNQtMjjgzxpump");
    await Promise.all(walletAccounts.map(async (account, index) => {
      // let amount = await getSPLBalance(connection, mintPubKey, account.publicKey);
      let amount = await getSPLBalance(connection, mint.publicKey, account.publicKey);
      if (amount && amount > 0) {
        sellAccounts.push(account);
        sellTokenAmounts.push(BigInt(Math.floor(DEFAULT_POW * amount)));
      }
    }));

    if (!sellAccounts.length) throw Error("Any wallet dosn't have any token");
    
    const jitoFee = jitoFees[authKey];
    
    const result = await sellDumpAllService(
      {
        payer: fundAccount,
        sellAccounts,
        sellTokenAmounts,
        mintPubKey: mint.publicKey
      },
      authKey,
      jitoFee,
    );

    if (result.confirmed) res.status(ResponseStatus.SUCCESS).send(result.content);
    else throw Error(result.content);

  } catch (err) {
    console.log(`Errors when selling dump all, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when selling dump all, ${err}`);
  }
}