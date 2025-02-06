import { Request, Response } from "express";
import { DistributionType } from "../types";
import { launchTokenService, distributionService } from "../services/pumpfun.service";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ResponseStatus } from "../core/ApiResponse";
import { AmountType, Key, NetworkType, WalletKey, WalletType } from "../cache/keys";
import { getJson, getListRange, getValue } from "../cache/query";
import { JITO_FEE } from "../config";
import { TokenMetadataType } from "../pumpfun/types";

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

    // const result = await launchTokenService(
    //   {
    //     devSK,
    //     sniperSK,
    //     commonSKs,
    //     devSolAmount,
    //     sniperSolAmount,
    //     commonSolAmounts,
    //     jitoFee
    //   }, 
    //   tokenInfo,
    //   mintSK,
    // );

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
    const fundPrivateKey = await getValue(WalletKey.FUND);
    const sniperPrivateKey = await getValue(WalletKey.SNIPER) ?? "";
    const commonPrivateKeys: string[] = await getListRange(WalletKey.COMMON) ?? [];
    if (commonAmounts.length != commonPrivateKeys?.length) {
      res.status(ResponseStatus.NOT_FOUND).send("Insufficent input of common wallets");
      return;
    }
    if (!fundPrivateKey) {
      res.status(ResponseStatus.NOT_FOUND).send("Doesn't exist fund wallet, please import fund wallet info");
      return;
    }
    if (sniperAmount > 0 && !sniperAmount) {
      res.status(ResponseStatus.NOT_FOUND).send("Doesn't exist sniper wallet, please import sniper wallet");
    }

    await distributionService({ 
      fundWalletPrivateKey: fundPrivateKey, 
      walletPrivateKeys: [sniperPrivateKey, ...commonPrivateKeys],
      solAmounts: [sniperAmount, ...commonAmounts] 
    });

    res.status(ResponseStatus.SUCCESS).send("Distribution sol is Ok");

  } catch (err) {
    console.log(`Errors when getting data in distributionSol endpoint, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors in distribution endpoint");
  }
}