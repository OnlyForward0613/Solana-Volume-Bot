import { Request, Response } from "express";
import { CreateAndBuyInputType, DistributionType } from "../types";
import { createAndBuyService, distributionService } from "../services/pumpfun.service";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export async function createAndBuy(req: Request, res: Response) {
  const data: CreateAndBuyInputType = {
    devPrivateKey: req.body.devPrivateKey,
    buyerPrivateKey: req.body.buyerPrivateKey,
    amount: Number(req.body.amount)
  }

  await createAndBuyService(data);
  res.status(201).json("Ok");
}

export async function distribution(req: Request, res: Response) {
  const data: DistributionType = {
    fundWalletPrivateKey: req.body.fundWalletPrivateKey,
    walletPrivateKeys: req.body.walletPrivateKeys,
    solAmounts: req.body.solAmounts,
  }
  console.log(data);
  for (let i = 0; i < 18; i++) {
    data.walletPrivateKeys.push(bs58.encode(Keypair.generate().secretKey));
    data.solAmounts.push(0.001);
  }
  await distributionService(data);
  res.status(201).json("Ok");
}