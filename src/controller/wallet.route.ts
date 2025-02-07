import { Request, Response } from "express";
import { getAllWallets } from "../cache/repository/WalletCache";
import { addToList, getCommonWalletsCounts, getHash, getJson, getListRange, getValue, keyExists, setHash, setJson, setList, setValue } from "../cache/query";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { AmountType, Key, NetworkType, WalletKey } from "../cache/keys";
import { MAX_COMMON_WALLETS_NUMS} from "../config";
import { createNewPrivateKeyBasedonAssets, isValidSolanaPrivateKey } from "../helper/util";
import { ResponseStatus } from "../core/ApiResponse";
import { TokenMetadataType } from "../pumpfun/types";


export const generateCommonWallets = async (req: Request, res: Response) => {

  const nums = Number(req.query.nums);  // wallet counts that should generate newly
  
  const allWallets = await getAllWallets();
  const existNums = await getCommonWalletsCounts() ?? 0;
  console.log(`existNums: ${existNums}`);

  // Check if wallet counts exists MAX wallet limits
  if (existNums + nums > MAX_COMMON_WALLETS_NUMS) {
    console.log(existNums + nums);
    res.status(ResponseStatus.NOT_FOUND).send(`generating num exceed MAX wallet numbers: ${MAX_COMMON_WALLETS_NUMS}`);
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
    res.status(ResponseStatus.SUCCESS).send(JSON.stringify(newPrivateKeys));
  } catch (err) {
    console.log(`There were some errors when adding private key into redis, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors in adding address into redis");
  }
  
}


export const generateDevWallet = async (req: Request, res: Response) => {
  const allWallets = await getAllWallets();
  while (1) {
    const newPrivateKey = bs58.encode(Keypair.generate().secretKey);
    if (!allWallets.includes(newPrivateKey)) {
      await setValue(WalletKey.DEV, newPrivateKey);
      res.status(ResponseStatus.SUCCESS).send(newPrivateKey);
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
      res.status(ResponseStatus.SUCCESS).send(newPrivateKey);
      return;
    }
  }
}

// import dev, sniper and common wallets
export const setWallets = async (req: Request, res: Response) => {
  

  try {
    const devPrivateKey = req.body.dev ?? null;
    const sniperPrivateKey = req.body.sniper ?? null;
    const commonPrivateKeys = req.body.common ?? [];
    
    // Check if input addresses are valid solana addresses
    if (devPrivateKey && !isValidSolanaPrivateKey([devPrivateKey])) {
      res.status(ResponseStatus.NOT_FOUND).send("Invalid Input dev wallet");
      return;
    }
    if (sniperPrivateKey && !isValidSolanaPrivateKey([sniperPrivateKey])) {
      res.status(ResponseStatus.NOT_FOUND).send("Invalid Input sniper wallet");
      return;
    }
    if (commonPrivateKeys.length && !isValidSolanaPrivateKey([commonPrivateKeys])) {
      res.status(ResponseStatus.NOT_FOUND).send("Invalid Input");
      return;
    }

    // Check if input addresses already exists
    const allWallets = await getAllWallets();
    if (devPrivateKey && allWallets.includes(devPrivateKey)) {
      res.status(ResponseStatus.NOT_FOUND).send("devWallet already exists");
      console.log("devWallet already exists");
      return;
    }
    if (sniperPrivateKey && allWallets.includes(sniperPrivateKey)) {
      res.status(ResponseStatus.NOT_FOUND).send("sniperWallet already exists");
      console.log("devWallet already exists");
      return;
    }

    for (let key of commonPrivateKeys) {
      if (allWallets.includes(key)) {
        res.status(ResponseStatus.NOT_FOUND).send("some common wallets already exists");
        console.log("some common wallets already exists");
        return;
      }
    }
    if (devPrivateKey) await setValue(WalletKey.DEV, devPrivateKey);
    if (sniperPrivateKey)  await setValue(WalletKey.SNIPER, sniperPrivateKey);
    if (commonPrivateKeys.length) await setList(WalletKey.COMMON, commonPrivateKeys);
    res.status(ResponseStatus.SUCCESS).send("Importing wallets is Ok");
  } catch (err) {
    console.log(`There were some errors when adding private key into redis, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors in adding address into redis");
  }
}

// import fund wallet
export const setFundWallet = async (req: Request, res: Response) => {
  const fundPrivateKey = req.body.fund;
  if (!isValidSolanaPrivateKey([fundPrivateKey])) {
    console.log("Invalid Fund Wallet");
    res.status(ResponseStatus.NOT_FOUND).send("Invalid Fund Wallet");
    return;
  }

  try {
    if (await keyExists(WalletKey.FUND)) {
      console.log("fund wallet already exists on database");
      res.status(ResponseStatus.NOT_FOUND).send("Fund Wallet already exists on database");
      return;
    }
    await setValue(WalletKey.FUND, fundPrivateKey);
    res.status(ResponseStatus.SUCCESS).send("Importing fund wallet is Ok");
  } catch (err) {
    console.error(`There are some errors when importing fund wallet into database`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when importing fund wallet into database");
  }
}

// export all wallets
export const getWallets = async (req: Request, res: Response) => {
  try {
    const data = {
      fund: await getValue(WalletKey.FUND) ?? "",
      dev: await getValue(WalletKey.DEV) ?? "",
      sniper: await getValue(WalletKey.SNIPER) ?? "",
      common: await getListRange(WalletKey.COMMON) ?? []
    }
    res.status(ResponseStatus.SUCCESS).json(data);
  } catch (err) {
    console.log(`Error when getting address from database, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Error when getting address from database");
  }
}

// set RPC info 
export const setNetwork = async (req: Request, res: Response) => {
  try {
    const {
      RPC_ENDPOINT,
      RPC_WEBSOCKET_ENDPOINT,
      JITO_FEE
    } = req.body;
    if (RPC_ENDPOINT) {
      await setValue(NetworkType.RPC_ENDPOINT, RPC_ENDPOINT);
    }
    if (RPC_WEBSOCKET_ENDPOINT) {
      await setValue(NetworkType.RPC_WEBSOCKET_ENDPOINT, RPC_WEBSOCKET_ENDPOINT);
    }
    if (JITO_FEE) {
      await setValue(NetworkType.JITO_FEE, JITO_FEE);
    }
    res.status(ResponseStatus.SUCCESS).send("Setting network configuration is OK");
  } catch (err) {
    console.log(`Errors when setting network configuration, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when setting network configuration");
  }
}

// get RPC info
export const getNetwork = async (req: Request, res: Response) => {
  try {
    const data = {
      RPC_ENDPOINT: await getValue(NetworkType.RPC_ENDPOINT) ?? "",
      RPC_WEBSOCKET_ENDPOINT: await getValue(NetworkType.RPC_WEBSOCKET_ENDPOINT) ?? "",
      JITO_FEE: await getValue(NetworkType.JITO_FEE) ?? 0,
    }
    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting network configuration, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when getting network configuration");
  }
}

// set buy options (buy amount)
export const setBuyAmounts = async (req: Request, res: Response) => {
  try {
    const {
      dev: devAmount,
      sniper: sniperAmount,
      common: commonAmounts
    } = req.body;
    if (devAmount) {
      await setValue(AmountType.DEV, devAmount);
    }
    if (sniperAmount) {
      await setValue(AmountType.SNIPER, sniperAmount);
    }
    if (commonAmounts && commonAmounts.length) {
      await setList(AmountType.COMMON, commonAmounts);
    }
    res.status(ResponseStatus.SUCCESS).send("Setting buy options is Ok");
  } catch (err) {
    console.log(`Errors when setting buy options, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when setting buy options");
  }
}

// get buy options 
export const getBuyAmounts = async (req: Request, res: Response) => {
  try {
    const data = {
      dev: await getValue(AmountType.DEV) ?? 0,
      sniper: await getValue(AmountType.SNIPER) ?? 0,
      common: await getListRange(AmountType.COMMON) ?? [],
    }
    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting buy amounts from database, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when getting buy amounts from database");
  }
 }

 // Set sell percentage
 export const setSellPercentage = async (req: Request, res: Response) => {
  try {
    const {
      sellPercentage
    } = req.body;
    if (sellPercentage && sellPercentage.length) await setList(AmountType.SELL_PERCENTAGE, sellPercentage);  
    res.status(ResponseStatus.SUCCESS).send("Setting sell percentage is OK");
  } catch (err) {
    console.log(`Errors when setting sell percentage, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when setting sell percentage");
  }
 }

 // get sell percentage
 export const getSellPercentage = async (req: Request, res: Response) => {
  try {
    const data = {
      setSellPercentage: await getListRange(AmountType.SELL_PERCENTAGE) ?? []
    }
    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting sell percentage, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when getting sell percentage");
  }
}

// Set sell amount
export const setSellAmount = async (req: Request, res: Response) => {
  try {
    const {
      sellAmount
    } = req.body;
    if (sellAmount) {
      await setValue(AmountType.SELL_AMOUNT, sellAmount);
    }
    res.status(ResponseStatus.SUCCESS).send("Setting sell amount is OK");
  } catch (err) {
    console.log(`Errors when setting sell amount, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when setting sell amount");
  }
}

export const getSellAmount = async (req: Request, res: Response) => {
  try {
    const data = {
      sellAmount: await getValue(AmountType.SELL_AMOUNT) ?? 0
    }
    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting sell amount, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when getting sell amount");
  }
}

// set tokenMetadata info
export const setTokenMetadataInfo = async (req: Request, res: Response) => {
  try {
    const tokenInfo: TokenMetadataType = {
      name: req.body.name,
      symbol: req.body.symbol,
      metadataUri: req.body.metadataUri,
    };
    const mintPrivateKey = req.body.mintPrivateKey;

    if (!isValidSolanaPrivateKey([mintPrivateKey])) throw Error("Please insert valid solana address");

    await setJson(Key.TOKEN_METADATA, tokenInfo);
    await setValue(Key.MINT_PRIVATEKEY, mintPrivateKey);

    res.status(ResponseStatus.SUCCESS).send("Setting tokenMetadata is OK");
  } catch (err) {
    console.log(`Errors when managing token info, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send(`Errors when managing token info, ${err}`);
  } 
}

// get createTokenMetadata info
export const getTokenMetadataInfo = async (req: Request, res: Response) => {
  try {
    const data = await getJson<TokenMetadataType>(Key.TOKEN_METADATA);
    console.log(data);
    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting tokenMetadata info, ${err}`);
    res.status(ResponseStatus.NOT_FOUND).send("Errors when getting tokenMetadata info");
  }
}

