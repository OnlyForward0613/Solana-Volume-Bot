import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getAllWallets } from "../cache/repository/WalletCache";
import {
  addUser,
  addValueToArray,
  adminCheck,
  authKeyCheck,
  deleteArrayByIndex,
  deleteArrayByWalletKey,
  deleteKey,
  deleteUserByAuthKey,
  editUser,
  getAllUsers,
  getArray,
  getCommonWalletsCounts,
  getIdFromAuthKey,
  getJson,
  getValue,
  keyExists,
  setJson,
  setValue,
  storeArray,
} from "../cache/query";
import {Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { AmountType, Key, NetworkType, WalletKey } from "../cache/keys";
import { 
  configNetwork, 
  DEFAULT_JITO_FEE, 
  jitoFees, 
  MAX_COMMON_WALLETS_NUMS, 
  PRIVATE_RPC_ENDPOINT, 
  PRIVATE_RPC_WEBSOCKET_ENDPOINT, 
  pumpFunSDKs, 
} from "../config";
import {
  createNewPrivateKeyBasedonAssets,
  isValidSolanaPrivateKey,
} from "../helper/util";
import { ResponseStatus } from "../core/ApiResponse";
import { TokenMetadataType } from "../pumpfun/types";

// generate common wallets
export const generateCommonWallets = async (req: Request, res: Response) => {

  try {
    const nums = Number(req.query.nums); // wallet counts that should generate newly
    const authKey = req.headers.authorization as string;
    console.log(nums, authKey);
    const allWallets = await getAllWallets(authKey) ?? [];
    console.log("allWallets", allWallets);
    const existNums = (await getCommonWalletsCounts(authKey)) ?? 0;
    console.log(`existNums: ${existNums}`);

    // Check if wallet counts exists MAX wallet limits
    if (existNums + nums > MAX_COMMON_WALLETS_NUMS) {
      console.log(existNums + nums);
      throw Error(
        `generating num exceed MAX wallet numbers: ${MAX_COMMON_WALLETS_NUMS}`
      );
    }

    let newPrivateKeys = [];
    let count = 0;

    while (count < nums) {
      const newPrivateKey = createNewPrivateKeyBasedonAssets(
        allWallets
      ) as string;
      count++;
      newPrivateKeys.push(newPrivateKey);
      // Check if common wallet redis table already exists
      if (existNums) {
        await addValueToArray(WalletKey.COMMON, newPrivateKey, authKey);
        allWallets.push(newPrivateKey);
      }
    }
    if (!existNums) {
      // Create new redis table of common wallet
      await storeArray(WalletKey.COMMON, newPrivateKeys, authKey);
      console.log(
        "current wallets",
        (await getArray<string>(WalletKey.COMMON, authKey))?.length
      );
    }

    res.status(ResponseStatus.SUCCESS).send(JSON.stringify(newPrivateKeys));
  } catch (err) {
    console.log(
      `There were some errors when adding private key into redis, ${err}`
    );
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(
        `There were some errors when adding private key into redis, ${err}`
      );
  }
};

// generate dev wallet
export const generateDevWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const allWallets = await getAllWallets(authKey) ?? [];
    while (true) {
      const newPrivateKey = bs58.encode(Keypair.generate().secretKey);
      if (!allWallets.includes(newPrivateKey)) {
        await setValue(WalletKey.DEV, newPrivateKey, authKey);
        res.status(ResponseStatus.SUCCESS).send(newPrivateKey);
        return;
      }
    }
  } catch (err) {
    console.log(`Errors when generating dev wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when generating dev wallet, ${err}`);
  }
};

// generate sniper wallet
export const generateSniperWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const allWallets = await getAllWallets(authKey) ?? [];
    while (true) {
      const newPrivateKey = bs58.encode(Keypair.generate().secretKey);
      if (!allWallets.includes(newPrivateKey)) {
        await setValue(WalletKey.SNIPER, newPrivateKey, authKey);
        res.status(ResponseStatus.SUCCESS).send(newPrivateKey);
        return;
      }
    }
  } catch (err) {
    console.log(`Errors when generating sniper wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when generating sniper wallet, ${err}`);
  }
};

// generate mint wallet
export const generateMintWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const tokenPath = path.join(__dirname, "../../upload/.keys/vanity.json");
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    // console.log(`Generating ${tokenData} from ` + tokenPath)
    const keyPairs = tokenData.map((item: {secretKey: string, publicKey: string}) => (
      Keypair.fromSecretKey(bs58.decode(item.secretKey))
    ));

    console.log("generate mint address");
    const sdk = pumpFunSDKs[authKey];
    console.log("authKey when generating mint address", authKey);
    console.log("connection when generating mint address", pumpFunSDKs[authKey].connection);
    console.log("program when generating mint address", pumpFunSDKs[authKey].program.programId);
    
    while (keyPairs.length > 0) {
      const index = Math.floor(Math.random() * keyPairs.length);
      const selectedKeyPair = keyPairs[index];

      const newPrivateKey = bs58.encode(selectedKeyPair.secretKey);

      const existsInBondingCurve = await sdk.getBondingCurveAccount(selectedKeyPair.publicKey);
      
      if (!existsInBondingCurve) {
        res.status(ResponseStatus.SUCCESS).send(newPrivateKey);
        return;
      }

      keyPairs.splice(index, 1); // Remove the selected keypair from the array to avoid duplicates
    }

    // If no available wallet is found
    res.status(ResponseStatus.NOT_FOUND).send('No available address found');

  } catch (err) {
    console.log(`Errors when generating mint wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when generating mint wallet, ${err}`);
  }
};

// import dev, sniper and common wallets
export const setWallets = async (req: Request, res: Response) => {
  try {
    const devPrivateKey = req.body.dev ?? null;
    const sniperPrivateKey = req.body.sniper ?? null;
    const commonPrivateKeys = req.body.common ?? [];

    const authKey = req.headers.authorization as string;

    // Check if input addresses are valid solana addresses
    if (devPrivateKey && !isValidSolanaPrivateKey([devPrivateKey])) {
      throw Error("Invalid Input dev wallet");
    }
    if (sniperPrivateKey && !isValidSolanaPrivateKey([sniperPrivateKey])) {
      throw Error("Invalid Input sniper wallet");
    }
    if (
      commonPrivateKeys.length &&
      !isValidSolanaPrivateKey([commonPrivateKeys])
    ) {
      throw Error("Invalid Input common wallet");
    }

    // Check if input addresses already exists
    const allWallets = await getAllWallets(authKey) ?? [];
    if (devPrivateKey && allWallets.includes(devPrivateKey)) {
      throw Error("devWallet already exists");
    }
    if (sniperPrivateKey && allWallets.includes(sniperPrivateKey)) {
      throw Error("sniperWallet already exists");
    }

    for (let key of commonPrivateKeys) {
      if (allWallets.includes(key)) {
        throw Error("some common wallets already exists");
      }
    }
    if (devPrivateKey) await setValue(WalletKey.DEV, devPrivateKey, authKey);
    if (sniperPrivateKey) await setValue(WalletKey.SNIPER, sniperPrivateKey, authKey);
    if (commonPrivateKeys.length)
      await storeArray(WalletKey.COMMON, commonPrivateKeys, authKey);

    res.status(ResponseStatus.SUCCESS).send("Importing wallets is Ok");
  } catch (err) {
    console.log(
      `There were some errors when adding private key into redis, ${err}`
    );
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(
        `There were some errors when adding private key into redis, ${err}`
      );
  }
};

// import fund wallet
export const setFundWallet = async (req: Request, res: Response) => {
  try {
    const fundPrivateKey = req.body.fund;
    const authKey = req.headers.authorization as string;
    const id = await getIdFromAuthKey(authKey);
    if (!isValidSolanaPrivateKey([fundPrivateKey])) {
      throw Error("Invalid Fund Wallet");
    }
    if (await keyExists(`${id}:${WalletKey.FUND}`)) {
      throw Error("Fund Wallet already exists on database");
    }
    await setValue(WalletKey.FUND, fundPrivateKey, authKey);

    res.status(ResponseStatus.SUCCESS).send("Importing fund wallet is Ok");
  } catch (err) {
    console.error(
      `There are some errors when importing fund wallet into database, ${err}`
    );
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(
        `There are some errors when importing fund wallet into database, ${err}`
      );
  }
};

// export all wallets
export const getWallets = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = {
      fund: (await getValue(WalletKey.FUND, authKey)) ?? "",
      dev: (await getValue(WalletKey.DEV, authKey)) ?? "",
      sniper: (await getValue(WalletKey.SNIPER, authKey)) ?? "",
      common: (await getArray<string>(WalletKey.COMMON, authKey)) ?? [],
    };

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Error when getting address from database, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Error when getting address from database, ${err}`);
  }
};

// set RPC info
export const setNetwork = async (req: Request, res: Response) => {
  try {
    const { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, JITO_FEE } = req.body;
    const authKey = req.headers.authorization as string;
    if (RPC_ENDPOINT) {
      await setValue(NetworkType.RPC_ENDPOINT, RPC_ENDPOINT, authKey);
    }
    if (RPC_WEBSOCKET_ENDPOINT) {
      await setValue(
        NetworkType.RPC_WEBSOCKET_ENDPOINT,
        RPC_WEBSOCKET_ENDPOINT,
        authKey
      );
    }
    let jitoFee;
    if (JITO_FEE) {
      await setValue(
        NetworkType.JITO_FEE,
        JITO_FEE,
        authKey
      );
      jitoFees[authKey] = Number(jitoFee) * LAMPORTS_PER_SOL;
    } 

    if (RPC_ENDPOINT && RPC_WEBSOCKET_ENDPOINT) {
      configNetwork(RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, authKey);
    }

    res
      .status(ResponseStatus.SUCCESS)
      .send("Setting network configuration is OK");
  } catch (err) {
    console.log(`Errors when setting network configuration, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send("Errors when setting network configuration");
  }
};

// get RPC info
export const getNetwork = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = {
      RPC_ENDPOINT: (await getValue(NetworkType.RPC_ENDPOINT, authKey)) ?? "",
      RPC_WEBSOCKET_ENDPOINT:
        (await getValue(NetworkType.RPC_WEBSOCKET_ENDPOINT, authKey)) ?? "",
      JITO_FEE: (await getValue(NetworkType.JITO_FEE, authKey)) ?? 0,
    };

    if (data.JITO_FEE) data.JITO_FEE = Number(data.JITO_FEE);

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting network configuration, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when getting network configuration, ${err}`);
  }
};

// set buy options (buy amount)
export const setBuyAmounts = async (req: Request, res: Response) => {
  try {
    const {
      dev: devAmount,
      sniper: sniperAmount,
      common: commonAmounts,
    } = req.body;
    const authKey = req.headers.authorization as string;
    if (devAmount) {
      await setValue(AmountType.DEV, devAmount, authKey);
    }
    if (sniperAmount) {
      await setValue(AmountType.SNIPER, sniperAmount, authKey);
    }
    if (commonAmounts && commonAmounts.length) {
      await storeArray(AmountType.COMMON, commonAmounts, authKey);
    }

    res.status(ResponseStatus.SUCCESS).send("Setting buy options is Ok");
  } catch (err) {
    console.log(`Errors when setting buy options, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when setting buy options, ${err}`);
  }
};

// get buy options
export const getBuyAmounts = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = {
      dev: (await getValue(AmountType.DEV, authKey)) ?? 0,
      sniper: (await getValue(AmountType.SNIPER, authKey)) ?? 0,
      common: (await getArray<number>(AmountType.COMMON, authKey)) ?? [],
    };

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting buy amounts from database, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when getting buy amounts from database, ${err}`);
  }
};

// Set sell percentage
export const setSellPercentage = async (req: Request, res: Response) => {
  try {
    const { sellPercentage } = req.body;
    const authKey = req.headers.authorization as string;
    if (sellPercentage && sellPercentage.length)
      await storeArray(AmountType.SELL_PERCENTAGE, sellPercentage, authKey);
    res.status(ResponseStatus.SUCCESS).send("Setting sell percentage is OK");
  } catch (err) {
    console.log(`Errors when setting sell percentage, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when setting sell percentage, ${err}`);
  }
};

// get sell percentage
export const getSellPercentage = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = {
      setSellPercentage: (await getArray<number>(AmountType.SELL_PERCENTAGE, authKey)) ?? [],
    };

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting sell percentage, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send("Errors when getting sell percentage");
  }
};

// Set sell amount
export const setSellAmount = async (req: Request, res: Response) => {
  try {
    const { sellAmount } = req.body;
    const authKey = req.headers.authorization as string;

    await setValue(AmountType.SELL_AMOUNT, sellAmount, authKey);

    res.status(ResponseStatus.SUCCESS).send("Setting sell amount is OK");
  } catch (err) {
    console.log(`Errors when setting sell amount, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when setting sell amount, ${err}`);
  }
};

// get sell amount
export const getSellAmount = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = {
      sellAmount: (await getValue(AmountType.SELL_AMOUNT, authKey)) ?? 0,
    };

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting sell amount, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when getting sell amount, ${err}`);
  }
};

// set tokenMetadata info
export const setTokenMetadataInfo = async (req: Request, res: Response) => {
  try {
    const tokenInfo: TokenMetadataType = {
      name: req.body.name,
      symbol: req.body.symbol,
      metadataUri: req.body.metadataUri,
    };

    const authKey = req.headers.authorization as string;

    const mintPrivateKey = req.body.mintPrivateKey;

    if (!isValidSolanaPrivateKey([mintPrivateKey]))
      throw Error("Please insert valid solana address");

    await setJson(Key.TOKEN_METADATA, tokenInfo, authKey);
    await setValue(Key.MINT_PRIVATEKEY, mintPrivateKey, authKey);

    res.status(ResponseStatus.SUCCESS).send("Setting tokenMetadata is OK");
  } catch (err) {
    console.log(`Errors when managing token info, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when managing token info, ${err}`);
  }
};

// get createTokenMetadata info
export const getTokenMetadataInfo = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const data = await getJson<TokenMetadataType>(Key.TOKEN_METADATA, authKey);
    console.log(data);

    res.status(ResponseStatus.SUCCESS).send(data);
  } catch (err) {
    console.log(`Errors when getting tokenMetadata info, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when getting tokenMetadata info, ${err}`);
  }
};

// remote fund wallet
export const removeFundWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const fundWallet = (await getValue(WalletKey.FUND, authKey)) ?? null;
    if (!fundWallet) throw Error("fund wallet doesn't exist");

    await deleteKey(WalletKey.FUND, authKey);

    res.status(ResponseStatus.SUCCESS).send("Deleting fund wallet is success");
  } catch (err) {
    console.log(`Errors when removing fund wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when removing fund wallet, ${err}`);
  }
};

// remote Dev wallet
export const removeDevWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const devWallet = (await getValue(WalletKey.DEV, authKey)) ?? null;
    if (!devWallet) throw Error("dev wallet doesn't exist");

    await deleteKey(WalletKey.DEV, authKey);

    res.status(ResponseStatus.SUCCESS).send("Deleting dev wallet is success");
  } catch (err) {
    console.log(`Errors when removing dev wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when removing dev wallet, ${err}`);
  }
};

// remote sniper wallet
export const removeSniperWallet = async (req: Request, res: Response) => {
  try {
    const authKey = req.headers.authorization as string;
    const sniperWallet = (await getValue(WalletKey.SNIPER, authKey)) ?? null;
    if (!sniperWallet) throw Error("sniper wallet doesn't exist");

    await deleteKey(WalletKey.SNIPER, authKey);

    res
      .status(ResponseStatus.SUCCESS)
      .send("Deleting sniper wallet is success");
  } catch (err) {
    console.log(`Errors when removing sniper wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when removing sniper wallet, ${err}`);
  }
};

// remove common wallets
export const removeCommonWallet = async (req: Request, res: Response) => {
  try {
    const wallet = req.body.wallet;
    const authKey = req.headers.authorization as string;
    if (!wallet) throw Error("Please insert wallet address");
    await deleteArrayByWalletKey(WalletKey.COMMON, wallet, authKey);
    
    res.status(ResponseStatus.SUCCESS).send("Deleting common wallet is success");
  } catch (err) {
    console.log(`Errors when removing common wallet, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when removing common wallet, ${err}`);
  }
};

// set new user by admin
export const adminSetUser = async (req: Request, res: Response) => {
  try {
    const { name, authKey } = req.body;

    await addUser(name, authKey);

    res
      .status(ResponseStatus.SUCCESS)
      .send("User has been created successfully");
  } catch (err) {
    console.log(`Errors when setting new user, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when setting new user, ${err}`);
  }
};

// get all users by admin
export const adminGetAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();

    res.status(ResponseStatus.SUCCESS).send(users);
  } catch (err) {
    console.log(`Errors when getting all users, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when getting all users, ${err}`);
  }
};

// delete user by admin
export const adminDeleteUser = async (req: Request, res: Response) => {
  try {
    const { authKey } = req.body;

    await deleteUserByAuthKey(authKey);

    res
      .status(ResponseStatus.SUCCESS)
      .send("User has been deleted successfully");
  } catch (err) {
    console.log(`Errors when deleting user, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when deleting user, ${err}`);
  }
};

// edit username by admin
export const adminEditUsername = async (req: Request, res: Response) => {
  try {
    const { authKey, newUsername } = req.body;

    await editUser(authKey, newUsername);

    res
      .status(ResponseStatus.SUCCESS)
      .send("Username has been edited successfully");
  } catch (err) {
    console.log(`Errors when editing username, ${err}`);
    res
      .status(ResponseStatus.NOT_FOUND)
      .send(`Errors when editing username, ${err}`);
  }
};

// auth key check while entering
export const authKeyCheckWhileEntering = async (
  req: Request,
  res: Response
) => {
  try {
    const { authKey } = req.body;
    const result = await authKeyCheck(authKey);
    if (result) {
      
    //   const RPC_ENDPOINT = await getValue(NetworkType.RPC_ENDPOINT, authKey) ?? null;
    //   const RPC_WEBSOCKET_ENDPOINT = await getValue(NetworkType.RPC_WEBSOCKET_ENDPOINT, authKey) ?? null;
    //   const jitoFee = await getValue(NetworkType.JITO_FEE, authKey) ?? null;
    //   console.log("RPC_ENDPOINT", RPC_ENDPOINT);
    //   console.log("RPC_WEBSOCKET_ENDPOINT", RPC_WEBSOCKET_ENDPOINT);
    //   console.log("jitoFee", jitoFee);
    //   // inital setting of userConnections and pumpfunSDKs based on user authKey
    //   if (RPC_ENDPOINT && RPC_WEBSOCKET_ENDPOINT) {
    //     configNetwork(RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, authKey);
    //   }
    //   else {
    //     configNetwork(PRIVATE_RPC_ENDPOINT, PRIVATE_RPC_WEBSOCKET_ENDPOINT, authKey);
    //   }

      // if (jitoFee) {
      //   jitoFees[authKey] = Number(jitoFee) * LAMPORTS_PER_SOL;
      // } else {
      //   jitoFees[authKey] = DEFAULT_JITO_FEE;
      // }

      res.status(ResponseStatus.SUCCESS).send("Success");
    } else {
      res.status(ResponseStatus.UNAUTHORIZED).send("Unauthorized");
    }
  } catch (err) {
    console.log(`Errors when checking auth key, ${err}`);
    res
      .status(ResponseStatus.INTERNAL_ERROR)
      .send(`Errors when checking auth key, ${err}`);
  }
};

// admin check while entering dashboard
export const adminCheckWhileEnteringDashboard = async (
  req: Request,
  res: Response
) => {
  try {
    const { authKey } = req.body;
    const result = await adminCheck(authKey);
    if (result) {
      res.status(ResponseStatus.SUCCESS).send("Success");
    } else {
      res.status(ResponseStatus.UNAUTHORIZED).send("Unauthorized");
    }
  } catch (err) {
    console.log(`Errors when checking admin auth key, ${err}`);
    res
      .status(ResponseStatus.INTERNAL_ERROR)
      .send(`Errors when checking admin auth key, ${err}`);
  }
};
