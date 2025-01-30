import { Request, Response } from "express";
import { CreateAndBuyInput } from "../types";
import { createAndBuyService } from "../services/pumpfun.service";

export async function createAndBuy(req: Request, res: Response) {
  const data: CreateAndBuyInput = {
    devPrivateKey: req.body.devPrivateKey,
    buyerPrivateKey: req.body.buyerPrivateKey,
    amount: Number(req.body.amount)
  }

  await createAndBuyService(data);
  res.status(201).json("Ok");
}