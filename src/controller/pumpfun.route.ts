import { Request, Response } from "express";
import { CreateAndBuyInputType, DistributionType } from "../types";
import { createAndBuyService, distributionService } from "../services/pumpfun.service";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ResponseStatus } from "../core/ApiResponse";
import { WalletKey, WalletType } from "../cache/keys";
import { getListRange, getValue } from "../cache/query";

export async function createAndBuy(req: Request, res: Response) {
  const data: CreateAndBuyInputType = {
    devPrivateKey: req.body.devPrivateKey,
    buyerPrivateKey: req.body.buyerPrivateKey,
    amount: Number(req.body.amount)
  }

  await createAndBuyService(data);
  res.status(201).json("Ok");
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