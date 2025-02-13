"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sellDumpAllService = exports.sellService = exports.gatherService = exports.distributionService = void 0;
exports.launchTokenService = launchTokenService;
const web3_js_1 = require("@solana/web3.js");
const util_1 = require("../helper/util");
const config_1 = require("../config");
const bs58_1 = __importDefault(require("bs58"));
const jitoWithAxios_1 = require("../helper/jitoWithAxios");
const chunk_1 = __importDefault(require("lodash/chunk"));
const web3_js_2 = require("@solana/web3.js");
const lutProvider_1 = require("../helper/lutProvider");
const SLIPPAGE_BASIS_POINTS = 1000n;
// launch new token on solana based on mint address
async function launchTokenService({ devAccount, sniperAccount, commonAccounts, devAmount, sniperAmount, commonAmounts, }, tokenInfo, mint, connection, jitoFee = config_1.JITO_FEE) {
    try {
        let boundingCurveAccount = await config_1.sdk.getBondingCurveAccount(mint.publicKey);
        console.log(boundingCurveAccount);
        if (!boundingCurveAccount) {
            // configure lookup table
            config_1.lutProviders["first"] = new lutProvider_1.LookupTableProvider();
            let globalAccount = await config_1.sdk.getGlobalAccount();
            if (!globalAccount)
                throw Error("It seems like there are some errors in rpc or network, plz try again");
            console.log("jito fee: ", jitoFee);
            let createResult = await config_1.sdk.launchToken(devAccount, mint, [devAccount, sniperAccount], // buyers
            tokenInfo, [devAmount, sniperAmount], jitoFee, SLIPPAGE_BASIS_POINTS);
            if (createResult.confirmed) {
                console.log("Success creation:", `https://pump.fun/${mint.publicKey.toBase58()}`);
                console.log(`https://solscan.io/tx/${createResult.content}`);
            }
            else {
                throw Error(createResult.content);
            }
            await (0, util_1.sleep)(500);
            const secondResult = await config_1.sdk.firstBundleAfterCreation(devAccount, sniperAccount, commonAccounts, commonAmounts, mint.publicKey, // mint
            jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS);
            if (secondResult.confirmed) {
                console.log(`https://solscan.io/tx/${secondResult.content}`);
                console.log(secondResult.content);
            }
            return secondResult;
        }
        else {
            let globalAccount = await config_1.sdk.getGlobalAccount();
            if (!globalAccount)
                throw Error("It seems like there are some errors in rpc or network, plz try again");
            const secondResult = await config_1.sdk.firstBundleAfterCreation(devAccount, sniperAccount, commonAccounts, commonAmounts, mint.publicKey, // mint
            jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS);
            if (secondResult.confirmed) {
                console.log(`https://solscan.io/tx/${secondResult.content}`);
                console.log(secondResult.content);
            }
            return secondResult;
            console.log("The token already exists:", `https://pump.fun/${mint.publicKey.toBase58()}`);
            (0, util_1.printSPLBalance)(connection, mint.publicKey, devAccount.publicKey);
            throw Error("the mint token already exists on Pumpfun");
        }
    }
    catch (err) {
        console.log(`Errors when launching new token on Pumpfun, ${err}`);
        return { confirmed: false, content: `Errors when launching new token on Pumpfun, ${err}` };
    }
}
// distribute fund from fund wallet to others
const distributionService = async ({ fundWalletSK, walletSKs, solAmounts, }, connection, jitoFee = config_1.JITO_FEE) => {
    try {
        const fundAccount = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(fundWalletSK));
        const walletAccounts = walletSKs.map(privateKey => web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(privateKey)));
        console.log(walletSKs);
        console.log(`jito fee: ${jitoFee}`);
        let ixs = [];
        await Promise.all(walletAccounts.map((account, index) => {
            console.log(`distribution, wallet${index}: ${account.publicKey.toBase58()}, ${BigInt(Math.floor(web3_js_1.LAMPORTS_PER_SOL * solAmounts[index]))}`);
            if (solAmounts[index] > 0) {
                ixs.push(web3_js_1.SystemProgram.transfer({
                    fromPubkey: fundAccount.publicKey,
                    toPubkey: account.publicKey,
                    lamports: BigInt(Math.floor(web3_js_1.LAMPORTS_PER_SOL * solAmounts[index])),
                }));
            }
        }));
        if (!ixs.length)
            throw Error("Not exist valuable transfer instruction");
        ixs.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: fundAccount.publicKey,
            toPubkey: (0, jitoWithAxios_1.getJitoTipWallet)(),
            lamports: jitoFee,
        }));
        // we will include several tranfer instructions in one transaction, at least 5 insturctions
        const chunkIxs = (0, chunk_1.default)(ixs, 5);
        console.log(chunkIxs);
        const latestBlockhash = await connection.getLatestBlockhash();
        const bundleTxs = await Promise.all(chunkIxs.map(async (ixs) => {
            const tx = new web3_js_2.Transaction().add(...ixs);
            const versionedTx = await (0, util_1.buildTx)(connection, tx, fundAccount.publicKey, [fundAccount], latestBlockhash);
            if (!versionedTx)
                throw Error("Errors when distributing fund to wallets");
            return versionedTx;
        }));
        // Output each bundle transaction's size
        bundleTxs.map((bundle, index) => {
            console.log(`txsize${index}: `, bundle.serialize().length);
        });
        const simulateResult = await (0, util_1.simulateTxBeforeSendBundle)(connection, bundleTxs);
        console.log(simulateResult);
        if (!simulateResult)
            throw Error("Simulation errors when distributiong fund  to wallets");
        // return { confirmed: simulateResult, content: "Distribution simulation is OK" };
        let result;
        let count = 0;
        while (true) { // We will try 3 times until bundle is success
            result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
            if (result.confirmed)
                break;
            count++;
            if (count > 3)
                throw Error("Bundle failed");
        }
        if (result.confirmed)
            console.log(`https://solscan.io/tx/${result.content}`);
        return result;
    }
    catch (err) {
        console.log(`Errors when distributing Sol to wallets, ${err}`);
        return { confirmed: false, content: `Errors when distributing Sol to wallets, ${err}` };
    }
};
exports.distributionService = distributionService;
const gatherService = async ({ fundWalletSK, walletSKs, }, connection, jitoFee = config_1.JITO_FEE) => {
    try {
        const fundAccount = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(fundWalletSK));
        let solAmounts = [];
        const walletAccounts = [];
        await Promise.all(walletSKs.map(async (SK) => {
            const key = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(SK));
            const solAmount = BigInt(await connection.getBalance(key.publicKey));
            if (solAmount > 0n) {
                solAmounts.push(solAmount);
                walletAccounts.push(key);
            }
        }));
        if (!walletAccounts.length)
            throw Error("All wallet don't have any fund");
        let ixs = [];
        await Promise.all(walletAccounts.map((account, index) => {
            ixs.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: account.publicKey,
                toPubkey: fundAccount.publicKey,
                lamports: solAmounts[index]
            }));
        }));
        ixs.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: fundAccount.publicKey,
            toPubkey: (0, jitoWithAxios_1.getJitoTipWallet)(),
            lamports: jitoFee,
        }));
        const chunkIxs = (0, chunk_1.default)(ixs, 5);
        const chunkAccounts = (0, chunk_1.default)(walletAccounts, 5);
        const latestBlockhash = await connection.getLatestBlockhash();
        const bundleTxs = await Promise.all(chunkIxs.map(async (ixs, index) => {
            const tx = new web3_js_2.Transaction().add(...ixs);
            console.log(chunkAccounts[index]);
            const versionedTx = await (0, util_1.buildTx)(connection, tx, fundAccount.publicKey, [fundAccount, ...chunkAccounts[index]], latestBlockhash);
            if (!versionedTx)
                throw Error(`Errors when gathering funds of wallet to fund wallet, ${index}`);
            return versionedTx;
        }));
        bundleTxs.map((bundle, index) => {
            console.log(`txsize${index}: `, bundle.serialize().length);
        });
        const simulateResult = await (0, util_1.simulateTxBeforeSendBundle)(connection, bundleTxs);
        console.log(simulateResult);
        if (!simulateResult)
            throw Error("Simulation errors when distributiong fund  to wallets");
        // return { confirmed: simulateResult, content: "GatherFund simulation is OK" };
        let result;
        let count = 0;
        while (true) {
            result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
            if (result.confirmed)
                break;
            count++;
            if (count > 3)
                throw Error("Bundle failed");
        }
        if (result.confirmed)
            console.log(`https://solscan.io/tx/${result.content}`);
        return result;
    }
    catch (err) {
        console.log(`Errors when distributing Sol to wallets, ${err}`);
        return { confirmed: false, content: `Errors when distributing Sol to wallets, ${err}` };
    }
};
exports.gatherService = gatherService;
const sellService = async ({ walletAccount, mintPubKey, tokenAmount }, connection, jitoFee = config_1.JITO_FEE) => {
    try {
        let globalAccount = await config_1.sdk.getGlobalAccount();
        if (!globalAccount)
            throw Error("It seems like there are some errors in rpc or network, plz try again");
        const result = await config_1.sdk.sellOne(walletAccount, walletAccount, tokenAmount, // sell token amount
        mintPubKey, jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS);
        if (result.confirmed) {
            console.log("Success creation:", `https://pump.fun/${mintPubKey.toBase58()}`);
            console.log(`https://solscan.io/tx/${result.content}`);
        }
        return result;
    }
    catch (err) {
        console.log(`Errors when sell token in sellSevice, ${err}`);
        return { confirmed: false, content: `Errors when sell token in sellSevice, ${err}` };
    }
};
exports.sellService = sellService;
// Sell dump all 
const sellDumpAllService = async ({ payer, sellAccounts, sellTokenAmounts, mintPubKey, }, connection, jitoFee = config_1.JITO_FEE) => {
    try {
        let globalAccount = await config_1.sdk.getGlobalAccount();
        if (!globalAccount)
            throw Error("It seems like there are some errors in rpc or network, plz try again");
        const result = await config_1.sdk.sellDumpAll(payer, sellAccounts, sellTokenAmounts, mintPubKey, jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS);
        if (result && result.confirmed) {
            console.log("sellDumpAll bundle is success:", `https://pump.fun/${mintPubKey.toBase58()}`);
            console.log(`https://solscan.io/tx/${result.content}`);
        }
        return result;
    }
    catch (err) {
        console.log(`Error when selling dump all in sellDumpAllService, ${err}`);
        return { confirmed: false, content: `Error when selling dump all in sellDumpAllService, ${err}` };
    }
};
exports.sellDumpAllService = sellDumpAllService;
