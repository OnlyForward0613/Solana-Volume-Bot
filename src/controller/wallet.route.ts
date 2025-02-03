import { Request, Response } from "express";
import { getAllWallets } from "../cache/repository/WalletCache";
import { addToList, getCommonWalletsCounts, getListRange, getValue, keyExists, setList, setValue } from "../cache/query";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { WalletKey } from "../cache/keys";
import { MAX_COMMON_WALLETS_NUMS } from "../config";
import { createNewPrivateKeyBasedonAssets, isValidSolanaPrivateKey } from "../helper/util";


export const generateCommonWallets = async (req: Request, res: Response) => {

  const nums = Number(req.query.nums);  // wallet counts that should generate newly
  
  const allWallets = await getAllWallets();
  const existNums = await getCommonWalletsCounts() ?? 0;
  console.log(`existNums: ${existNums}`);

  // Check if wallet counts exists MAX wallet limits
  if (existNums + nums > MAX_COMMON_WALLETS_NUMS) {
    console.log(existNums + nums);
    res.status(404).send(`generating num exceed MAX wallet numbers: ${MAX_COMMON_WALLETS_NUMS}`);
    return;
  }

  let newPrivateKeys = [];
  let count = 0;

  while (count < nums) {
    const newPrivateKey = createNewPrivateKeyBasedonAssets(allWallets) as string;
    count++;
    newPrivateKeys.push(newPrivateKey);
    // Check if common wallet redis table already exists
    if (existNums) {
      await addToList(WalletKey.COMMON, newPrivateKey);
      allWallets.push(newPrivateKey);
    }
  }

  try {
    if (!existNums) { // Create new redis table of common wallet 
      await setList(WalletKey.COMMON, newPrivateKeys);
      console.log('current wallets', (await getListRange<string>(WalletKey.COMMON))?.length);
    }
    res.status(200).send(JSON.stringify(newPrivateKeys));
  } catch (err) {
    console.log(`There were some errors when adding private key into redis, ${err}`);
    res.status(404).send("Errors in adding address into redis");
  }
  
}


export const generateDevWallet = async (req: Request, res: Response) => {
  const allWallets = await getAllWallets();
  while (1) {
    const newPrivateKey = bs58.encode(Keypair.generate().secretKey);
    if (!allWallets.includes(newPrivateKey)) {
      await setValue(WalletKey.DEV, newPrivateKey);
      res.status(200).send(newPrivateKey);
      return;
    }
  }
}


export const generateSniperWallet = async (req: Request, res: Response) => {
  const allWallets = await getAllWallets();
  while (1) {
    const newPrivateKey = bs58.encode(Keypair.generate().secretKey);
    if (!allWallets.includes(newPrivateKey)) {
      await setValue(WalletKey.SNIPER, newPrivateKey);
      res.status(200).send(newPrivateKey);
      return;
    }
  }
}

// import dev, sniper and common wallets
export const importWallets = async (req: Request, res: Response) => {
  const devPrivateKey = req.body.dev ?? "";
  const sniperPrivateKey = req.body.sniper ?? "";
  const commonPrivateKeys = req.body.common ?? [];
  
  // Check if input addresses are valid solana addresses 
  if (!isValidSolanaPrivateKey([devPrivateKey, sniperPrivateKey, ...commonPrivateKeys])) {
    res.status(404).send("Invalid Input");
    return;
  }

  // Check if input addresses already exists
  const allWallets = await getAllWallets();
  if (devPrivateKey && allWallets.includes(devPrivateKey)) {
    res.status(404).send("devWallet already exists");
    console.log("devWallet already exists");
    return;
  }
  if (sniperPrivateKey && allWallets.includes(sniperPrivateKey)) {
    res.status(404).send("sniperWallet already exists");
    console.log("devWallet already exists");
    return;
  }

  for (let key of commonPrivateKeys) {
    if (allWallets.includes(key)) {
      res.status(404).send("some common wallets already exists");
      console.log("some common wallets already exists");
      return;
    }
  }

  try {
    if (devPrivateKey) await setValue(WalletKey.DEV, devPrivateKey);
    if (sniperPrivateKey)  await setValue(WalletKey.SNIPER, sniperPrivateKey);
    if (commonPrivateKeys.length) await setList(WalletKey.COMMON, commonPrivateKeys);
    res.status(200).send("Importing wallets is Ok");
  } catch (err) {
    console.log(`There were some errors when adding private key into redis, ${err}`);
    res.status(404).send("Errors in adding address into redis");
  }
}

// import fund wallet
export const importFundWallet = async (req: Request, res: Response) => {
  const fundPrivateKey = req.body.fund;
  if (!isValidSolanaPrivateKey([fundPrivateKey])) {
    console.log("Invalid Fund Wallet");
    res.status(404).send("Invalid Fund Wallet");
    return;
  }

  try {
    if (await keyExists(WalletKey.FUND)) {
      console.log("fund wallet already exists on database");
      res.status(404).send("Fund Wallet already exists on database");
      return;
    }
    await setValue(WalletKey.FUND, fundPrivateKey);
    res.status(200).send("Importing fund wallet is Ok");
  } catch (err) {
    console.error(`There are some errors when importing fund wallet into database`);
    res.status(404).send("Errors when importing fund wallet into database");
  }
}

// export all wallets
export const exportWallets = async (req: Request, res: Response) => {
  try {
    const data = {
      fund: await getValue(WalletKey.FUND) ?? "",
      dev: await getValue(WalletKey.DEV) ?? "",
      sniper: await getValue(WalletKey.SNIPER) ?? "",
      common: await getListRange(WalletKey.COMMON) ?? []
    }
    res.status(200).json(data);
  } catch (err) {
    console.log(`Error when getting address from database, ${err}`);
    res.status(404).send("Error when getting address from database");
  }
}




