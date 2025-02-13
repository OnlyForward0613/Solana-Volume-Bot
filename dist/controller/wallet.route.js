"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCheckWhileEnteringDashboard = exports.authKeyCheckWhileEntering = exports.adminEditUsername = exports.adminDeleteUser = exports.adminGetAllUsers = exports.adminSetUser = exports.removeCommonWallet = exports.removeSniperWallet = exports.removeDevWallet = exports.removeFundWallet = exports.getTokenMetadataInfo = exports.setTokenMetadataInfo = exports.getSellAmount = exports.setSellAmount = exports.getSellPercentage = exports.setSellPercentage = exports.getBuyAmounts = exports.setBuyAmounts = exports.getNetwork = exports.setNetwork = exports.getWallets = exports.setFundWallet = exports.setWallets = exports.generateMintWallet = exports.generateSniperWallet = exports.generateDevWallet = exports.generateCommonWallets = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const WalletCache_1 = require("../cache/repository/WalletCache");
const query_1 = require("../cache/query");
const web3_js_1 = require("@solana/web3.js");
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const keys_1 = require("../cache/keys");
const config_1 = require("../config");
const util_1 = require("../helper/util");
const ApiResponse_1 = require("../core/ApiResponse");
// generate common wallets
const generateCommonWallets = async (req, res) => {
    try {
        const nums = Number(req.query.nums); // wallet counts that should generate newly
        const allWallets = await (0, WalletCache_1.getAllWallets)();
        const existNums = (await (0, query_1.getCommonWalletsCounts)()) ?? 0;
        console.log(`existNums: ${existNums}`);
        // Check if wallet counts exists MAX wallet limits
        if (existNums + nums > config_1.MAX_COMMON_WALLETS_NUMS) {
            console.log(existNums + nums);
            throw Error(`generating num exceed MAX wallet numbers: ${config_1.MAX_COMMON_WALLETS_NUMS}`);
        }
        let newPrivateKeys = [];
        let count = 0;
        while (count < nums) {
            const newPrivateKey = (0, util_1.createNewPrivateKeyBasedonAssets)(allWallets);
            count++;
            newPrivateKeys.push(newPrivateKey);
            // Check if common wallet redis table already exists
            if (existNums) {
                await (0, query_1.addToList)(keys_1.WalletKey.COMMON, newPrivateKey);
                allWallets.push(newPrivateKey);
            }
        }
        if (!existNums) {
            // Create new redis table of common wallet
            await (0, query_1.setList)(keys_1.WalletKey.COMMON, newPrivateKeys);
            console.log("current wallets", (await (0, query_1.getListRange)(keys_1.WalletKey.COMMON))?.length);
        }
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(JSON.stringify(newPrivateKeys));
    }
    catch (err) {
        console.log(`There were some errors when adding private key into redis, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`There were some errors when adding private key into redis, ${err}`);
    }
};
exports.generateCommonWallets = generateCommonWallets;
// generate dev wallet
const generateDevWallet = async (req, res) => {
    try {
        const allWallets = await (0, WalletCache_1.getAllWallets)();
        while (true) {
            const newPrivateKey = bytes_1.bs58.encode(web3_js_1.Keypair.generate().secretKey);
            if (!allWallets.includes(newPrivateKey)) {
                await (0, query_1.setValue)(keys_1.WalletKey.DEV, newPrivateKey);
                res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(newPrivateKey);
                return;
            }
        }
    }
    catch (err) {
        console.log(`Errors when generating dev wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when generating dev wallet, ${err}`);
    }
};
exports.generateDevWallet = generateDevWallet;
// generate sniper wallet
const generateSniperWallet = async (req, res) => {
    try {
        const allWallets = await (0, WalletCache_1.getAllWallets)();
        while (true) {
            const newPrivateKey = bytes_1.bs58.encode(web3_js_1.Keypair.generate().secretKey);
            if (!allWallets.includes(newPrivateKey)) {
                await (0, query_1.setValue)(keys_1.WalletKey.SNIPER, newPrivateKey);
                res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(newPrivateKey);
                return;
            }
        }
    }
    catch (err) {
        console.log(`Errors when generating sniper wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when generating sniper wallet, ${err}`);
    }
};
exports.generateSniperWallet = generateSniperWallet;
// generate mint wallet
const generateMintWallet = async (req, res) => {
    try {
        const tokenPath = path_1.default.join(__dirname, "../../upload/.keys/vanity.json");
        const tokenData = JSON.parse(fs_1.default.readFileSync(tokenPath, "utf8"));
        console.log(`Generating ${tokenData} from ` + tokenPath);
        const keyPairs = tokenData.map((item) => (web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(item.secretKey))));
        while (keyPairs.length > 0) {
            const index = Math.floor(Math.random() * keyPairs.length);
            const selectedKeyPair = keyPairs[index];
            const newPrivateKey = bytes_1.bs58.encode(selectedKeyPair.secretKey);
            const existsInBondingCurve = await config_1.sdk.getBondingCurveAccount(selectedKeyPair.publicKey);
            if (!existsInBondingCurve) {
                res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(newPrivateKey);
                return;
            }
            keyPairs.splice(index, 1); // Remove the selected keypair from the array to avoid duplicates
        }
        // If no available wallet is found
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send('No available address found');
    }
    catch (err) {
        console.log(`Errors when generating mint wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when generating mint wallet, ${err}`);
    }
};
exports.generateMintWallet = generateMintWallet;
// import dev, sniper and common wallets
const setWallets = async (req, res) => {
    try {
        const devPrivateKey = req.body.dev ?? null;
        const sniperPrivateKey = req.body.sniper ?? null;
        const commonPrivateKeys = req.body.common ?? [];
        // Check if input addresses are valid solana addresses
        if (devPrivateKey && !(0, util_1.isValidSolanaPrivateKey)([devPrivateKey])) {
            throw Error("Invalid Input dev wallet");
        }
        if (sniperPrivateKey && !(0, util_1.isValidSolanaPrivateKey)([sniperPrivateKey])) {
            throw Error("Invalid Input sniper wallet");
        }
        if (commonPrivateKeys.length &&
            !(0, util_1.isValidSolanaPrivateKey)([commonPrivateKeys])) {
            throw Error("Invalid Input common wallet");
        }
        // Check if input addresses already exists
        const allWallets = await (0, WalletCache_1.getAllWallets)();
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
        if (devPrivateKey)
            await (0, query_1.setValue)(keys_1.WalletKey.DEV, devPrivateKey);
        if (sniperPrivateKey)
            await (0, query_1.setValue)(keys_1.WalletKey.SNIPER, sniperPrivateKey);
        if (commonPrivateKeys.length)
            await (0, query_1.setList)(keys_1.WalletKey.COMMON, commonPrivateKeys);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Importing wallets is Ok");
    }
    catch (err) {
        console.log(`There were some errors when adding private key into redis, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`There were some errors when adding private key into redis, ${err}`);
    }
};
exports.setWallets = setWallets;
// import fund wallet
const setFundWallet = async (req, res) => {
    try {
        const fundPrivateKey = req.body.fund;
        if (!(0, util_1.isValidSolanaPrivateKey)([fundPrivateKey])) {
            throw Error("Invalid Fund Wallet");
        }
        if (await (0, query_1.keyExists)(keys_1.WalletKey.FUND)) {
            throw Error("Fund Wallet already exists on database");
        }
        await (0, query_1.setValue)(keys_1.WalletKey.FUND, fundPrivateKey);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Importing fund wallet is Ok");
    }
    catch (err) {
        console.error(`There are some errors when importing fund wallet into database, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`There are some errors when importing fund wallet into database, ${err}`);
    }
};
exports.setFundWallet = setFundWallet;
// export all wallets
const getWallets = async (req, res) => {
    try {
        const data = {
            fund: (await (0, query_1.getValue)(keys_1.WalletKey.FUND)) ?? "",
            dev: (await (0, query_1.getValue)(keys_1.WalletKey.DEV)) ?? "",
            sniper: (await (0, query_1.getValue)(keys_1.WalletKey.SNIPER)) ?? "",
            common: (await (0, query_1.getListRange)(keys_1.WalletKey.COMMON)) ?? [],
        };
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Error when getting address from database, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Error when getting address from database, ${err}`);
    }
};
exports.getWallets = getWallets;
// set RPC info
const setNetwork = async (req, res) => {
    try {
        const { RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, JITO_FEE } = req.body;
        if (RPC_ENDPOINT) {
            await (0, query_1.setValue)(keys_1.NetworkType.RPC_ENDPOINT, RPC_ENDPOINT);
        }
        if (RPC_WEBSOCKET_ENDPOINT) {
            await (0, query_1.setValue)(keys_1.NetworkType.RPC_WEBSOCKET_ENDPOINT, RPC_WEBSOCKET_ENDPOINT);
        }
        if (JITO_FEE) {
            await (0, query_1.setValue)(keys_1.NetworkType.JITO_FEE, Math.floor(JITO_FEE * web3_js_1.LAMPORTS_PER_SOL));
        }
        if (RPC_ENDPOINT && RPC_WEBSOCKET_ENDPOINT) {
            (0, config_1.configNetwork)(RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT);
        }
        res
            .status(ApiResponse_1.ResponseStatus.SUCCESS)
            .send("Setting network configuration is OK");
    }
    catch (err) {
        console.log(`Errors when setting network configuration, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send("Errors when setting network configuration");
    }
};
exports.setNetwork = setNetwork;
// get RPC info
const getNetwork = async (req, res) => {
    try {
        const data = {
            RPC_ENDPOINT: (await (0, query_1.getValue)(keys_1.NetworkType.RPC_ENDPOINT)) ?? "",
            RPC_WEBSOCKET_ENDPOINT: (await (0, query_1.getValue)(keys_1.NetworkType.RPC_WEBSOCKET_ENDPOINT)) ?? "",
            JITO_FEE: (await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? 0,
        };
        if (data.JITO_FEE)
            data.JITO_FEE = Number(data.JITO_FEE) / web3_js_1.LAMPORTS_PER_SOL;
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Errors when getting network configuration, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when getting network configuration, ${err}`);
    }
};
exports.getNetwork = getNetwork;
// set buy options (buy amount)
const setBuyAmounts = async (req, res) => {
    try {
        const { dev: devAmount, sniper: sniperAmount, common: commonAmounts, } = req.body;
        if (devAmount) {
            await (0, query_1.setValue)(keys_1.AmountType.DEV, devAmount);
        }
        if (sniperAmount) {
            await (0, query_1.setValue)(keys_1.AmountType.SNIPER, sniperAmount);
        }
        if (commonAmounts && commonAmounts.length) {
            await (0, query_1.setList)(keys_1.AmountType.COMMON, commonAmounts);
        }
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Setting buy options is Ok");
    }
    catch (err) {
        console.log(`Errors when setting buy options, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when setting buy options, ${err}`);
    }
};
exports.setBuyAmounts = setBuyAmounts;
// get buy options
const getBuyAmounts = async (req, res) => {
    try {
        const data = {
            dev: (await (0, query_1.getValue)(keys_1.AmountType.DEV)) ?? 0,
            sniper: (await (0, query_1.getValue)(keys_1.AmountType.SNIPER)) ?? 0,
            common: (await (0, query_1.getListRange)(keys_1.AmountType.COMMON)) ?? [],
        };
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Errors when getting buy amounts from database, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when getting buy amounts from database, ${err}`);
    }
};
exports.getBuyAmounts = getBuyAmounts;
// Set sell percentage
const setSellPercentage = async (req, res) => {
    try {
        const { sellPercentage } = req.body;
        if (sellPercentage && sellPercentage.length)
            await (0, query_1.setList)(keys_1.AmountType.SELL_PERCENTAGE, sellPercentage);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Setting sell percentage is OK");
    }
    catch (err) {
        console.log(`Errors when setting sell percentage, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when setting sell percentage, ${err}`);
    }
};
exports.setSellPercentage = setSellPercentage;
// get sell percentage
const getSellPercentage = async (req, res) => {
    try {
        const data = {
            setSellPercentage: (await (0, query_1.getListRange)(keys_1.AmountType.SELL_PERCENTAGE)) ?? [],
        };
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Errors when getting sell percentage, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send("Errors when getting sell percentage");
    }
};
exports.getSellPercentage = getSellPercentage;
// Set sell amount
const setSellAmount = async (req, res) => {
    try {
        const { sellAmount } = req.body;
        await (0, query_1.setValue)(keys_1.AmountType.SELL_AMOUNT, sellAmount);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Setting sell amount is OK");
    }
    catch (err) {
        console.log(`Errors when setting sell amount, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when setting sell amount, ${err}`);
    }
};
exports.setSellAmount = setSellAmount;
// get sell amount
const getSellAmount = async (req, res) => {
    try {
        const data = {
            sellAmount: (await (0, query_1.getValue)(keys_1.AmountType.SELL_AMOUNT)) ?? 0,
        };
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Errors when getting sell amount, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when getting sell amount, ${err}`);
    }
};
exports.getSellAmount = getSellAmount;
// set tokenMetadata info
const setTokenMetadataInfo = async (req, res) => {
    try {
        const tokenInfo = {
            name: req.body.name,
            symbol: req.body.symbol,
            metadataUri: req.body.metadataUri,
        };
        const mintPrivateKey = req.body.mintPrivateKey;
        if (!(0, util_1.isValidSolanaPrivateKey)([mintPrivateKey]))
            throw Error("Please insert valid solana address");
        await (0, query_1.setJson)(keys_1.Key.TOKEN_METADATA, tokenInfo);
        await (0, query_1.setValue)(keys_1.Key.MINT_PRIVATEKEY, mintPrivateKey);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Setting tokenMetadata is OK");
    }
    catch (err) {
        console.log(`Errors when managing token info, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when managing token info, ${err}`);
    }
};
exports.setTokenMetadataInfo = setTokenMetadataInfo;
// get createTokenMetadata info
const getTokenMetadataInfo = async (req, res) => {
    try {
        const data = await (0, query_1.getJson)(keys_1.Key.TOKEN_METADATA);
        console.log(data);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(data);
    }
    catch (err) {
        console.log(`Errors when getting tokenMetadata info, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when getting tokenMetadata info, ${err}`);
    }
};
exports.getTokenMetadataInfo = getTokenMetadataInfo;
// remote fund wallet
const removeFundWallet = async (req, res) => {
    try {
        const fundWallet = (await (0, query_1.getValue)(keys_1.WalletKey.FUND)) ?? null;
        if (!fundWallet)
            throw Error("fund wallet doesn't exist");
        await (0, query_1.deleteKey)(keys_1.WalletKey.FUND);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Deleting fund wallet is success");
    }
    catch (err) {
        console.log(`Errors when removing fund wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when removing fund wallet, ${err}`);
    }
};
exports.removeFundWallet = removeFundWallet;
// remote Dev wallet
const removeDevWallet = async (req, res) => {
    try {
        const devWallet = (await (0, query_1.getValue)(keys_1.WalletKey.DEV)) ?? null;
        if (!devWallet)
            throw Error("dev wallet doesn't exist");
        await (0, query_1.deleteKey)(keys_1.WalletKey.DEV);
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Deleting dev wallet is success");
    }
    catch (err) {
        console.log(`Errors when removing dev wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when removing dev wallet, ${err}`);
    }
};
exports.removeDevWallet = removeDevWallet;
// remote sniper wallet
const removeSniperWallet = async (req, res) => {
    try {
        const sniperWallet = (await (0, query_1.getValue)(keys_1.WalletKey.SNIPER)) ?? null;
        if (!sniperWallet)
            throw Error("sniper wallet doesn't exist");
        await (0, query_1.deleteKey)(keys_1.WalletKey.SNIPER);
        res
            .status(ApiResponse_1.ResponseStatus.SUCCESS)
            .send("Deleting sniper wallet is success");
    }
    catch (err) {
        console.log(`Errors when removing sniper wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when removing sniper wallet, ${err}`);
    }
};
exports.removeSniperWallet = removeSniperWallet;
// remove common wallets
const removeCommonWallet = async (req, res) => {
    try {
        const wallet = req.body.wallet;
        const commonWallets = (await (0, query_1.getListRange)(keys_1.WalletKey.COMMON)) ?? [];
        console.log(wallet);
        console.log(commonWallets);
        if (!commonWallets.length)
            throw Error("common wallets doesn't exist yet");
        for (let i = 0; i < commonWallets.length; i++) {
            if (commonWallets[i] == wallet) {
                let result = await (0, query_1.deleteElementFromListWithIndex)(keys_1.WalletKey.COMMON, i);
                console.log(result);
                if (await (0, query_1.keyExists)(keys_1.AmountType.COMMON))
                    result = await (0, query_1.deleteElementFromListWithIndex)(keys_1.AmountType.COMMON, i);
                console.log(result);
                res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Removing wallet is Success");
                return;
            }
        }
        throw Error("Removeing wallet failed");
    }
    catch (err) {
        console.log(`Errors when removing common wallet, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when removing common wallet, ${err}`);
    }
};
exports.removeCommonWallet = removeCommonWallet;
// set new user by admin
const adminSetUser = async (req, res) => {
    try {
        const { name, authKey } = req.body;
        await (0, query_1.addUser)(name, authKey);
        res
            .status(ApiResponse_1.ResponseStatus.SUCCESS)
            .send("User has been created successfully");
    }
    catch (err) {
        console.log(`Errors when setting new user, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when setting new user, ${err}`);
    }
};
exports.adminSetUser = adminSetUser;
// get all users by admin
const adminGetAllUsers = async (req, res) => {
    try {
        const users = await (0, query_1.getAllUsers)();
        res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(users);
    }
    catch (err) {
        console.log(`Errors when getting all users, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when getting all users, ${err}`);
    }
};
exports.adminGetAllUsers = adminGetAllUsers;
// delete user by admin
const adminDeleteUser = async (req, res) => {
    try {
        const { authKey } = req.body;
        await (0, query_1.deleteUserByAuthKey)(authKey);
        res
            .status(ApiResponse_1.ResponseStatus.SUCCESS)
            .send("User has been deleted successfully");
    }
    catch (err) {
        console.log(`Errors when deleting user, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when deleting user, ${err}`);
    }
};
exports.adminDeleteUser = adminDeleteUser;
// edit username by admin
const adminEditUsername = async (req, res) => {
    try {
        const { authKey, newUsername } = req.body;
        await (0, query_1.editUser)(authKey, newUsername);
        res
            .status(ApiResponse_1.ResponseStatus.SUCCESS)
            .send("Username has been edited successfully");
    }
    catch (err) {
        console.log(`Errors when editing username, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.NOT_FOUND)
            .send(`Errors when editing username, ${err}`);
    }
};
exports.adminEditUsername = adminEditUsername;
// auth key check while entering
const authKeyCheckWhileEntering = async (req, res) => {
    try {
        const { authKey } = req.body;
        const result = await (0, query_1.authKeyCheck)(authKey);
        if (result) {
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Success");
        }
        else {
            res.status(ApiResponse_1.ResponseStatus.UNAUTHORIZED).send("Unauthorized");
        }
    }
    catch (err) {
        console.log(`Errors when checking auth key, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.INTERNAL_ERROR)
            .send(`Errors when checking auth key, ${err}`);
    }
};
exports.authKeyCheckWhileEntering = authKeyCheckWhileEntering;
// admin check while entering dashboard
const adminCheckWhileEnteringDashboard = async (req, res) => {
    try {
        const { authKey } = req.body;
        const result = await (0, query_1.adminCheck)(authKey);
        if (result) {
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send("Success");
        }
        else {
            res.status(ApiResponse_1.ResponseStatus.UNAUTHORIZED).send("Unauthorized");
        }
    }
    catch (err) {
        console.log(`Errors when checking admin auth key, ${err}`);
        res
            .status(ApiResponse_1.ResponseStatus.INTERNAL_ERROR)
            .send(`Errors when checking admin auth key, ${err}`);
    }
};
exports.adminCheckWhileEnteringDashboard = adminCheckWhileEnteringDashboard;
