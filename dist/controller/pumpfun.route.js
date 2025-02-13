"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellDumpAll = exports.sellByAmount = exports.sellByPercentage = exports.gatherFund = void 0;
exports.launchToken = launchToken;
exports.distributionSol = distributionSol;
const pumpfun_service_1 = require("../services/pumpfun.service");
const web3_js_1 = require("@solana/web3.js");
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const ApiResponse_1 = require("../core/ApiResponse");
const keys_1 = require("../cache/keys");
const query_1 = require("../cache/query");
const config_1 = require("../config");
const util_1 = require("../helper/util");
const sdk_1 = require("../pumpfun/sdk");
const WalletCache_1 = require("../cache/repository/WalletCache");
async function launchToken(req, res) {
    try {
        const devSK = await (0, query_1.getValue)(keys_1.WalletKey.DEV) ?? null;
        const sniperSK = await (0, query_1.getValue)(keys_1.WalletKey.SNIPER) ?? null;
        const commonSKs = await (0, query_1.getListRange)(keys_1.WalletKey.COMMON) ?? [];
        const mintSK = await (0, query_1.getValue)(keys_1.Key.MINT_PRIVATEKEY) ?? null;
        const devSolAmount = Number(await (0, query_1.getValue)(keys_1.AmountType.DEV)) ?? 0;
        const sniperSolAmount = Number(await (0, query_1.getValue)(keys_1.AmountType.SNIPER)) ?? 0;
        const commonSolAmounts = await (0, query_1.getListRange)(keys_1.AmountType.COMMON) ?? [];
        const tokenInfo = await (0, query_1.getJson)(keys_1.Key.TOKEN_METADATA) ?? null;
        if (!tokenInfo)
            throw Error("token metadata doesn't exist");
        console.log(tokenInfo);
        if (!mintSK)
            throw Error("Mint addresss doen't exist");
        if (!devSolAmount)
            throw Error("Dev solAmount doesn't exist");
        if (!devSK)
            throw Error("Dev wallet doesn't exist");
        if (!sniperSolAmount)
            throw Error("sniper solAmount doesn't exist");
        if (!sniperSK)
            throw Error("sniper wallet doesn't exist");
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        const checkers = commonSolAmounts.map(value => value > 0);
        let realCommonSKs = commonSKs.filter((_, index) => checkers[index]);
        let realCommonAccounts = realCommonSKs.map(account => web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(account)));
        let realCommonSolAmounts = commonSolAmounts.filter((_, index) => checkers[index]);
        let realCommonAmounts = realCommonSolAmounts.map(value => BigInt(value * web3_js_1.LAMPORTS_PER_SOL));
        let devAmount = BigInt(devSolAmount * web3_js_1.LAMPORTS_PER_SOL);
        let sniperAmount = BigInt(sniperSolAmount * web3_js_1.LAMPORTS_PER_SOL);
        const devAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(devSK));
        const sniperAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(sniperSK));
        const mint = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(mintSK));
        if (!(0, util_1.isFundSufficent)(devAccount.publicKey, devAmount, config_1.connection))
            throw Error("Dev wallet doesn' have enough fund");
        if (!(0, util_1.isFundSufficent)(sniperAccount.publicKey, sniperAmount, config_1.connection))
            throw Error("Sniper wallet doesn' have enough fund");
        for (let i = 0; i < realCommonAccounts.length; i++) {
            if (!(0, util_1.isFundSufficent)(realCommonAccounts[i].publicKey, realCommonAmounts[i], config_1.connection))
                throw Error("Sniper wallet doesn' have enough fund");
        }
        const result = await (0, pumpfun_service_1.launchTokenService)({
            devAccount,
            sniperAccount,
            commonAccounts: realCommonAccounts,
            devAmount,
            sniperAmount,
            commonAmounts: realCommonAmounts,
        }, tokenInfo, mint, config_1.connection, jitoFee);
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when launch new token on Pumpfun, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when launch  new token on Pumpfun, ${err}`);
    }
}
async function distributionSol(req, res) {
    try {
        const { sniperAmount, commonAmounts } = req.body;
        const fundWalletSK = await (0, query_1.getValue)(keys_1.WalletKey.FUND) ?? "";
        const sniperWalletSK = await (0, query_1.getValue)(keys_1.WalletKey.SNIPER) ?? "";
        const commonWalletSKs = await (0, query_1.getListRange)(keys_1.WalletKey.COMMON) ?? [];
        const walletSKs = [];
        const solAmounts = [];
        console.log(commonAmounts);
        console.log(commonWalletSKs);
        if (commonAmounts.length > 0 && commonAmounts.length != commonWalletSKs?.length) {
            console.log("commonWallets PUSH -> commonAmounts: ", commonAmounts);
            throw Error("Insufficent input of common wallets");
        }
        if (!fundWalletSK)
            throw Error("Doesn't exist fund wallet, please import fund wallet info");
        if (sniperAmount > 0 && !sniperWalletSK)
            throw Error("Doesn't exist sniper wallet, please import sniper wallet");
        else if (sniperAmount > 0) {
            solAmounts.push(sniperAmount);
            walletSKs.push(sniperWalletSK);
        }
        solAmounts.push(...commonAmounts);
        walletSKs.push(...commonWalletSKs);
        if (!solAmounts.length)
            throw Error("Any wallet doesn't exsit to fund");
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        const result = await (0, pumpfun_service_1.distributionService)({
            fundWalletSK,
            walletSKs,
            solAmounts,
        }, config_1.connection, jitoFee);
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when getting data in distributionSol endpoint, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when getting data in distributionSol endpoint, ${err}`);
    }
}
const gatherFund = async (req, res) => {
    try {
        const fundWalletSK = await (0, query_1.getValue)(keys_1.WalletKey.FUND) ?? null;
        if (!fundWalletSK)
            throw Error("fund wallet doesn't exist");
        const walletSKs = [];
        // const devWalletSK = await getValue(WalletKey.DEV) ?? null;
        // if (devWalletSK) walletSKs.push(devWalletSK);
        const sniperWalletSK = await (0, query_1.getValue)(keys_1.WalletKey.SNIPER) ?? null;
        if (sniperWalletSK)
            walletSKs.push(sniperWalletSK);
        const commonWalletSKs = await (0, query_1.getListRange)(keys_1.WalletKey.COMMON);
        if (commonWalletSKs?.length)
            walletSKs.push(...commonWalletSKs);
        if (!walletSKs?.length)
            throw Error("There isn't any wallet to fund");
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        const result = await (0, pumpfun_service_1.gatherService)({
            fundWalletSK,
            walletSKs
        }, config_1.connection, jitoFee);
        ;
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when gathering all wallet fund to fund wallet, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when gathering all wallet fund to fund wallet, ${err}`);
    }
};
exports.gatherFund = gatherFund;
// sell percentage
const sellByPercentage = async (req, res) => {
    try {
        const walletSK = req.body.walletSK;
        if (!(0, util_1.isValidSolanaPrivateKey)([walletSK]))
            throw Error("Invalid solana address");
        const percentage = req.body.percentage;
        const walletSKs = await (0, WalletCache_1.getAllWallets)();
        console.log(walletSKs);
        if (!walletSKs?.length || !walletSKs.includes(walletSK))
            throw Error("the wallet doesn't exsit in our wallets");
        const mintSK = await (0, query_1.getValue)(keys_1.Key.MINT_PRIVATEKEY) ?? null;
        if (!mintSK)
            throw Error("Mint address doesn't exist");
        const mintAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(mintSK));
        const walletAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(walletSK));
        const tokenFloatAmount = await (0, util_1.getSPLBalance)(config_1.connection, mintAccount.publicKey, walletAccount.publicKey);
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        if (!tokenFloatAmount)
            throw Error("Don't have any token in the wallet");
        let tokenAmount = BigInt(Math.floor(sdk_1.DEFAULT_POW * tokenFloatAmount * percentage / 100));
        const result = await (0, pumpfun_service_1.sellService)({
            walletAccount,
            mintPubKey: mintAccount.publicKey,
            tokenAmount
        }, config_1.connection, jitoFee);
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when selling percentage, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when selling percentage, ${err}`);
    }
};
exports.sellByPercentage = sellByPercentage;
// sell tokens by amount
const sellByAmount = async (req, res) => {
    try {
        const walletSK = req.body.walletSK;
        if (!(0, util_1.isValidSolanaPrivateKey)([walletSK]))
            throw Error("Invalid solana address");
        const tokenAmount = req.body.tokenAmount;
        const walletSKs = await (0, WalletCache_1.getAllWallets)();
        console.log(walletSKs);
        if (!walletSKs?.length || !walletSKs.includes(walletSK))
            throw Error("the wallet doesn't exsit in our wallets");
        const mintSK = await (0, query_1.getValue)(keys_1.Key.MINT_PRIVATEKEY) ?? null;
        if (!mintSK)
            throw Error("Mint address doesn't exist");
        const mintAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(mintSK));
        const walletAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(walletSK));
        const tokenFloatAmount = await (0, util_1.getSPLBalance)(config_1.connection, mintAccount.publicKey, walletAccount.publicKey);
        console.log(`realAmount: ${tokenFloatAmount}, tokenAmount: ${tokenAmount}`);
        if (!tokenFloatAmount || tokenFloatAmount < tokenAmount)
            throw Error("Don't have sufficent token in the wallet");
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        const result = await (0, pumpfun_service_1.sellService)({
            walletAccount,
            mintPubKey: mintAccount.publicKey,
            tokenAmount: BigInt(Math.floor(sdk_1.DEFAULT_POW * tokenAmount)),
        }, config_1.connection, jitoFee);
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when selling token by amount, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when selling token by amount, ${err}`);
    }
};
exports.sellByAmount = sellByAmount;
// sell all tokens in wallets
const sellDumpAll = async (req, res) => {
    try {
        const devSK = await (0, query_1.getValue)(keys_1.WalletKey.DEV) ?? null;
        const sniperSK = await (0, query_1.getValue)(keys_1.WalletKey.SNIPER) ?? null;
        const fundSK = await (0, query_1.getValue)(keys_1.WalletKey.FUND) ?? null;
        const commonSKs = await (0, query_1.getListRange)(keys_1.WalletKey.COMMON) ?? [];
        const mintSK = await (0, query_1.getValue)(keys_1.Key.MINT_PRIVATEKEY) ?? null;
        if (!mintSK)
            throw Error("Mint addresss doen't exist");
        if (!devSK)
            throw Error("Dev wallet doesn't exist");
        if (!sniperSK)
            throw Error("sniper wallet doesn't exist");
        if (!fundSK)
            throw Error("sniper wallet doesn't exist");
        let commonAccounts = commonSKs.map(account => web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(account)));
        const devAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(devSK));
        const sniperAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(sniperSK));
        const mint = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(mintSK));
        const fundAccount = web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(fundSK));
        let walletAccounts = [devAccount, sniperAccount, ...commonAccounts];
        let sellTokenAmounts = [];
        let sellAccounts = [];
        await Promise.all(walletAccounts.map(async (account, index) => {
            let amount = await (0, util_1.getSPLBalance)(config_1.connection, mint.publicKey, account.publicKey);
            if (amount && amount > 0) {
                sellAccounts.push(account);
                sellTokenAmounts.push(BigInt(Math.floor(sdk_1.DEFAULT_POW * amount)));
            }
        }));
        if (!sellAccounts.length)
            throw Error("Any wallet dosn't have any token");
        const jitoFee = Number(await (0, query_1.getValue)(keys_1.NetworkType.JITO_FEE)) ?? config_1.JITO_FEE;
        const result = await (0, pumpfun_service_1.sellDumpAllService)({
            payer: fundAccount,
            sellAccounts,
            sellTokenAmounts,
            mintPubKey: mint.publicKey
        }, config_1.connection, jitoFee);
        if (result.confirmed)
            res.status(ApiResponse_1.ResponseStatus.SUCCESS).send(result.content);
        else
            throw Error(result.content);
    }
    catch (err) {
        console.log(`Errors when selling dump all, ${err}`);
        res.status(ApiResponse_1.ResponseStatus.NOT_FOUND).send(`Errors when selling dump all, ${err}`);
    }
};
exports.sellDumpAll = sellDumpAll;
