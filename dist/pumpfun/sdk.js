"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PumpFunSDK = exports.DEFAULT_POW = exports.DEFAULT_DECIMALS = exports.extendLimt = exports.ixChunkLimit = exports.METADATA_SEED = exports.BONDING_CURVE_SEED = exports.MINT_AUTHORITY_SEED = exports.GLOBAL_ACCOUNT_SEED = exports.MINT_AUTHORITY = exports.GLOBAL_ACCOUNT = exports.EVENT_AUTHORITY = exports.FEE_RECIPICEMT = exports.MPL_TOKEN_METADATA_PROGRAM_ID = exports.PROGRAM_ID = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const IDL_1 = require("./IDL");
const web3_js_1 = require("@solana/web3.js");
const util_1 = require("../helper/util");
// import { Agent, setGlobalDispatcher } from "undici";
const spl_token_1 = require("@solana/spl-token");
const bondingCurveAccount_1 = require("./bondingCurveAccount");
const globalAccount_1 = require("./globalAccount");
const bn_js_1 = require("bn.js");
const jitoWithAxios_1 = require("../helper/jitoWithAxios");
const lodash_1 = require("lodash");
exports.PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"; // pumpfun program
exports.MPL_TOKEN_METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
exports.FEE_RECIPICEMT = new web3_js_1.PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"); // global.fee_repicient
exports.EVENT_AUTHORITY = new web3_js_1.PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
exports.GLOBAL_ACCOUNT = new web3_js_1.PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"); // pumpfun global account
exports.MINT_AUTHORITY = new web3_js_1.PublicKey("TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM");
exports.GLOBAL_ACCOUNT_SEED = "global";
exports.MINT_AUTHORITY_SEED = "mint-authority";
exports.BONDING_CURVE_SEED = "bonding-curve";
exports.METADATA_SEED = "metadata";
exports.ixChunkLimit = 3; // instruction chunk limit is 3 if we don't use ALT, otherwise it's 5
exports.extendLimt = 30; // address lookup table extend limit
exports.DEFAULT_DECIMALS = 6;
exports.DEFAULT_POW = Math.pow(10, exports.DEFAULT_DECIMALS);
class PumpFunSDK {
    program;
    connection;
    constructor(provider) {
        this.program = new anchor_1.Program(IDL_1.IDL, provider);
        this.connection = this.program.provider.connection;
    }
    async launchToken(payer, // payer
    mint, buyers, // [devAccount, buyAccount]
    tokenInfo, buyAmountsSol, jitoFee, slippageBasisPoints = 300n, priorityFees, // set unitLimit and unitPrice
    commitment = util_1.DEFAULT_COMMITMENT, finality = util_1.DEFAULT_FINALITY) {
        try {
            let [createLutIx, lut] = await (0, util_1.initializeLUT)(this.connection, payer.publicKey);
            if (!createLutIx)
                throw Error(lut);
            let newTx = new web3_js_1.Transaction().add(createLutIx);
            let tipIx = (0, jitoWithAxios_1.jitoTipIx)(payer.publicKey, jitoFee);
            newTx.add(tipIx);
            let accounts = (0, util_1.getAllAccountsForLUT)(mint.publicKey, payer.publicKey, buyers);
            newTx.instructions.forEach((ix) => {
                ix.keys.forEach((key) => {
                    accounts.push(key.pubkey);
                });
            });
            let accountSet = new Set(accounts); // remove duplicate accounts
            let chunkAccounts = (0, lodash_1.chunk)(Array.from(accountSet), exports.extendLimt); // move Set to Array
            chunkAccounts.map(accounts => {
                newTx.add((0, util_1.extendLut)(lut, payer.publicKey, accounts));
            });
            let latestBlockhash = await this.connection.getLatestBlockhash();
            let createTx = await this.getCreateInstructions(payer.publicKey, tokenInfo.name, tokenInfo.symbol, tokenInfo.metadataUri, mint);
            newTx.add(createTx);
            // const lutAccount = await this.connection.getAddressLookupTable(lut as PublicKey);
            let createVersionedTx = await (0, util_1.buildTx)(this.connection, newTx, payer.publicKey, [payer, mint], latestBlockhash, priorityFees, commitment, finality);
            if (!createVersionedTx)
                throw Error("create transation was empty");
            let bundleTxs = [createVersionedTx];
            let buySimulateAmountsSol = this.simulateBuys(buyAmountsSol);
            console.log(buySimulateAmountsSol);
            if (buyAmountsSol.length > 0) {
                for (let i = 0; i < buyers.length; i++) {
                    let buyTx = await this.getBuyInstructionsBySolAmount(// using slippage buy
                    buyers[i].publicKey, mint.publicKey, buySimulateAmountsSol[i].tokenAmount, buySimulateAmountsSol[i].solAmount, slippageBasisPoints, commitment);
                    const buyVersionedTx = await (0, util_1.buildTx)(this.connection, buyTx, buyers[i].publicKey, [buyers[i]], latestBlockhash, priorityFees, commitment, finality);
                    if (buyVersionedTx)
                        bundleTxs.push(buyVersionedTx);
                }
            }
            let result;
            let count = 0;
            while (true) {
                result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
                if (result.confirmed)
                    break;
                count++;
                if (count > 3)
                    throw Error("SendBundle Count exceeded 3 times");
            }
            return result;
        }
        catch (err) {
            console.log(`Creating token bundle was failed, ${err}`);
            return { confirmed: false, content: `Creating token bundle was failed, ${err}` };
        }
    }
    async firstBundleAfterCreation(payer, sniperAccount, commonAccounts, commonSolAmounts, mintPubKey, // mint
    jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS, priorityFees, commitment = util_1.DEFAULT_COMMITMENT, finality = util_1.DEFAULT_FINALITY) {
        try {
            let bondingCurveAccount = await this.getBondingCurveAccount(mintPubKey, commitment);
            if (!bondingCurveAccount)
                throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");
            let latestBlockhash = await this.connection.getLatestBlockhash();
            let sniperSellTx = new web3_js_1.Transaction();
            const bundleTxs = [];
            let tokenAmount = await (0, util_1.getSPLBalance)(connection, mintPubKey, sniperAccount.publicKey);
            if (!tokenAmount)
                throw Error("Errors when getting token balance");
            let sniperTokenAmount = BigInt(Math.floor(tokenAmount * exports.DEFAULT_POW));
            let simulateSniperSellSolAmount = bondingCurveAccount.simulateSell([sniperTokenAmount], globalAccount.feeBasisPoints)[0];
            console.log("feeBasicPoints", globalAccount.feeBasisPoints);
            console.log("sniperTokenAmount", sniperTokenAmount);
            console.log("simulateSniperSellSolAmount", simulateSniperSellSolAmount);
            let sniperSellIx = await this.getSellInstructionsBySimulateSellSolAmount(sniperAccount.publicKey, mintPubKey, sniperTokenAmount, simulateSniperSellSolAmount, globalAccount.feeRecipient, SLIPPAGE_BASIS_POINTS, commitment);
            sniperSellTx.add(sniperSellIx);
            let tipIx = (0, jitoWithAxios_1.jitoTipIx)(sniperAccount.publicKey, jitoFee);
            sniperSellTx.add(tipIx);
            let sniperSellVersionedTx = await (0, util_1.buildTx)(connection, sniperSellTx, sniperAccount.publicKey, [sniperAccount], latestBlockhash);
            if (!sniperSellVersionedTx)
                throw Error("Errors when sell tokens in sniper wallet");
            bundleTxs.push(sniperSellVersionedTx);
            let simulateCommonBuyTokenAmounts = bondingCurveAccount.simulateBuy(commonSolAmounts);
            console.log("commonSolAmounts", commonSolAmounts);
            console.log("simulateCommonBuyTokenAmounts", simulateCommonBuyTokenAmounts);
            // let commonBuyIxs = await Promise.all(commonAccounts.map(async (buyer, index) => {
            //   return await this.getBuyInstructionsBySimulateBuyTokenAmount(
            //     buyer.publicKey,
            //     mintPubKey,
            //     simulateCommonBuyTokenAmounts[index],
            //     commonAmounts[index],
            //     globalAccount.feeRecipient,
            //     SLIPPAGE_BASIS_POINTS,
            //   );
            // }));
            let commonBuyIxs = [];
            for (let i = 0; i < commonAccounts.length; i++) {
                let buyIx = await this.getBuyInstructionsBySimulateBuyTokenAmount(commonAccounts[i].publicKey, mintPubKey, simulateCommonBuyTokenAmounts[i], commonSolAmounts[i], globalAccount.feeRecipient, SLIPPAGE_BASIS_POINTS);
                commonBuyIxs.push(buyIx);
            }
            let chunkCommonBuyIxs = (0, lodash_1.chunk)(commonBuyIxs, exports.ixChunkLimit);
            let chunkCommonAccounts = (0, lodash_1.chunk)(commonAccounts, exports.ixChunkLimit);
            // await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
            //   let newTx = (new Transaction).add(...buyIxs);
            //   let newVersionedTx = await buildTx(
            //     connection,
            //     newTx,
            //     payer.publicKey,
            //     [payer, ...chunkCommonAccounts[index]],
            //     latestBlockhash
            //   );
            //   if (!newVersionedTx) throw Error("Errors when buy tokens in common wallets");
            //   bundleTxs.push(newVersionedTx);
            // }));
            for (let i = 0; i < chunkCommonBuyIxs.length; i++) {
                let newTx = (new web3_js_1.Transaction).add(...chunkCommonBuyIxs[i]);
                let newVersionedTx = await (0, util_1.buildTx)(connection, newTx, payer.publicKey, [payer, ...chunkCommonAccounts[i]], latestBlockhash);
                if (!newVersionedTx)
                    throw Error("Errors when buy tokens in common wallets");
                bundleTxs.push(newVersionedTx);
            }
            console.log(bundleTxs);
            let result;
            let count = 0;
            while (true) {
                result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
                if (result.confirmed)
                    break;
                count++;
                if (count > 0)
                    throw Error("Bundle failed");
            }
            return result;
        }
        catch (err) {
            console.log(`Second bundle  was failed after creation bundle, ${err}`);
            return { confirmed: false, content: `Second bundle  was failed after creation bundle was success, ${err}` };
        }
    }
    async sellOne(payer, sellAccount, sellTokenAmount, mintPubKey, jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS, priorityFees, commitment = util_1.DEFAULT_COMMITMENT, finality = util_1.DEFAULT_FINALITY) {
        try {
            let bondingCurveAccount = await this.getBondingCurveAccount(mintPubKey, commitment);
            console.log(bondingCurveAccount);
            if (!bondingCurveAccount)
                throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");
            let latestBlockhash = await this.connection.getLatestBlockhash();
            let initialTx = new web3_js_1.Transaction();
            const bundleTxs = [];
            let minSolOutput = bondingCurveAccount.getSellPrice(sellTokenAmount, globalAccount.feeBasisPoints);
            let sellIx = await this.getSellInstructionsBySimulateSellSolAmount(sellAccount.publicKey, mintPubKey, sellTokenAmount, minSolOutput, globalAccount.feeRecipient, SLIPPAGE_BASIS_POINTS);
            initialTx.add(sellIx);
            let tipIx = (0, jitoWithAxios_1.jitoTipIx)(sellAccount.publicKey, jitoFee);
            initialTx.add(tipIx);
            let initialVersionedTx = await (0, util_1.buildTx)(connection, initialTx, sellAccount.publicKey, [sellAccount], latestBlockhash);
            if (!initialVersionedTx)
                throw Error("Errors when sell tokens in sniper wallet");
            bundleTxs.push(initialVersionedTx);
            let result;
            let count = 0;
            while (true) {
                result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
                if (result.confirmed)
                    break;
                count++;
                if (count > 3)
                    throw Error("SendBundle count exceeded 3 times");
            }
            return result;
        }
        catch (err) {
            console.log(`SellOneBunlde was failed, ${err}`);
            return { confirmed: false, content: `SellOneBunlde was failed, ${err}` };
        }
    }
    async sellDumpAll(payer, sellAccounts, sellTokenAmounts, mintPubKey, jitoFee, connection, globalAccount, SLIPPAGE_BASIS_POINTS, priorityFees, commitment = util_1.DEFAULT_COMMITMENT, finality = util_1.DEFAULT_FINALITY) {
        try {
            let bondingCurveAccount = await this.getBondingCurveAccount(mintPubKey, commitment);
            if (!bondingCurveAccount)
                throw Error("Errors when getting bondCurveAccount. It seems like there are some errors in rpc, or didn't create token yet");
            let latestBlockhash = await this.connection.getLatestBlockhash();
            // let initialTx = new Transaction();
            const bundleTxs = [];
            let tipIx = (0, jitoWithAxios_1.jitoTipIx)(payer.publicKey, jitoFee);
            // initialTx.add(tipIx);
            // let initialVersionedTx = await buildTx(
            //   connection,
            //   initialTx,
            //   payer.publicKey,
            //   [payer],
            //   latestBlockhash,      
            // );
            // if (!initialVersionedTx) throw Error("Errors when sell tokens in sniper wallet");
            // bundleTxs.push(initialVersionedTx);
            let simulateSniperSellSolAmounts = bondingCurveAccount.simulateSell(sellTokenAmounts, globalAccount.feeBasisPoints);
            let sellIxs = await Promise.all(sellAccounts.map(async (seller, index) => {
                return await this.getSellInstructionsBySimulateSellSolAmount(seller.publicKey, mintPubKey, sellTokenAmounts[index], simulateSniperSellSolAmounts[index], globalAccount.feeRecipient, SLIPPAGE_BASIS_POINTS);
            }));
            let chunkCommonBuyIxs = (0, lodash_1.chunk)(sellIxs, exports.ixChunkLimit);
            let chunkCommonAccounts = (0, lodash_1.chunk)(sellAccounts, exports.ixChunkLimit);
            await Promise.all(chunkCommonBuyIxs.map(async (buyIxs, index) => {
                let newTx = (new web3_js_1.Transaction).add(...buyIxs);
                if (index == chunkCommonBuyIxs.length - 1)
                    newTx.add(tipIx);
                let newVersionedTx = await (0, util_1.buildTx)(connection, newTx, payer.publicKey, [payer, ...chunkCommonAccounts[index]], latestBlockhash);
                if (!newVersionedTx)
                    throw Error("Errors when buy tokens in common wallets");
                bundleTxs.push(newVersionedTx);
            }));
            let result;
            let count = 0;
            while (true) {
                result = await (0, jitoWithAxios_1.jitoWithAxios)(bundleTxs, latestBlockhash);
                if (result.confirmed)
                    break;
                count++;
                if (count > 3)
                    throw Error("SendBundle count exceeded 3 times");
            }
            return result;
        }
        catch (err) {
            console.log(`DumpSell bundle was failed, ${err}`);
            return { confirmed: false, content: `DumpSell bundle was failed, ${err}` };
        }
    }
    async getSellInstructionsBySimulateSellSolAmount(seller, mint, sellTokenAmount, minSolOutput, feeRecipient, slippageBasisPoints = 500n, commitment = util_1.DEFAULT_COMMITMENT) {
        let sellAmountWithSlippage = (0, util_1.calculateWithSlippageSell)(minSolOutput, slippageBasisPoints);
        return await this.getSellInstructions(seller, mint, feeRecipient, sellTokenAmount, 0n);
    }
    async getSellInstructions(seller, mint, feeRecipient, tokneAmount, // input token amount
    minSolOutput // out minimal sol amount
    ) {
        const associatedBondingCurve = await (0, spl_token_1.getAssociatedTokenAddress)(mint, this.getBondingCurvePDA(mint), true);
        const associatedUser = await (0, spl_token_1.getAssociatedTokenAddress)(mint, seller, false);
        let transaction = new web3_js_1.Transaction();
        transaction.add(await this.program.methods
            .sell(new bn_js_1.BN(tokneAmount.toString()), new bn_js_1.BN(minSolOutput.toString()))
            .accounts({
            feeRecipient: feeRecipient,
            mint: mint,
            associatedBondingCurve: associatedBondingCurve,
            associatedUser: associatedUser,
            user: seller,
        })
            .transaction());
        return transaction;
    }
    // async createTokenMetadata(create: CreateTokenMetadata) {
    //   let formData = new FormData();
    //     formData.append("file", create.file),
    //     formData.append("name", create.name),
    //     formData.append("symbol", create.symbol),
    //     formData.append("description", create.description),
    //     formData.append("twitter", create.twitter || ""),
    //     formData.append("telegram", create.telegram || ""),
    //     formData.append("website", create.website || ""),
    //     formData.append("showName", "true");
    //   setGlobalDispatcher(new Agent({ connect: { timeout: 60_000 } }))
    //   let request = await fetch("https://pump.fun/api/ipfs", {
    //     method: "POST",
    //     headers: {
    //       "Host": "www.pump.fun",
    //       "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    //       "Accept": "*/*",
    //       "Accept-Language": "en-US,en;q=0.5",
    //       "Accept-Encoding": "gzip, deflate, br, zstd",
    //       "Referer": "https://www.pump.fun/create",
    //       "Origin": "https://www.pump.fun",
    //       "Connection": "keep-alive",
    //       "Sec-Fetch-Dest": "empty",
    //       "Sec-Fetch-Mode": "cors",
    //       "Sec-Fetch-Site": "same-origin",
    //       "Priority": "u=1",
    //       "TE": "trailers"
    //     },
    //     body: formData,
    //   });
    //   return request.json();
    // }
    // create token instructions
    async getCreateInstructions(creator, name, symbol, uri, mint) {
        const mplTokenMetadata = new web3_js_1.PublicKey(exports.MPL_TOKEN_METADATA_PROGRAM_ID);
        const [metadataPDA] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from(exports.METADATA_SEED),
            mplTokenMetadata.toBuffer(),
            mint.publicKey.toBuffer()
        ], mplTokenMetadata);
        const associatedBondingCurve = await (0, spl_token_1.getAssociatedTokenAddress)(mint.publicKey, this.getBondingCurvePDA(mint.publicKey), true // allow owner account to be PDA
        );
        return this.program.methods
            .create(name, symbol, uri)
            .accounts({
            mint: mint.publicKey,
            associatedBondingCurve: associatedBondingCurve,
            metadata: metadataPDA,
            user: creator,
        })
            .instruction();
    }
    async getBuyInstructionsBySimulateBuyTokenAmount(buyer, mint, buyAmountToken, buyAmountSol, feeRecipient, slippageBasisPoints = 500n, commitment = util_1.DEFAULT_COMMITMENT) {
        let buyAmountWithSlippage = (0, util_1.calculateWithSlippageBuy)(buyAmountSol, slippageBasisPoints);
        console.log(buyAmountSol, "=> ", buyAmountWithSlippage);
        return await this.getBuyInstructions(buyer, mint, feeRecipient, buyAmountToken, buyAmountWithSlippage);
    }
    async getBuyInstructionsBySolAmount(buyer, mint, buyAmountToken, buyAmountSol, slippageBasisPoints = 500n, commitment = util_1.DEFAULT_COMMITMENT) {
        let buyAmountWithSlippage = (0, util_1.calculateWithSlippageBuy)(buyAmountSol, slippageBasisPoints);
        return await this.getBuyInstructions(buyer, mint, exports.FEE_RECIPICEMT, buyAmountToken, buyAmountWithSlippage, commitment);
    }
    async getBuyInstructions(buyer, mint, feeRecipient, tokenAmount, solAmount, commitment = util_1.DEFAULT_COMMITMENT) {
        const associatedBondingCurve = await (0, spl_token_1.getAssociatedTokenAddress)(mint, this.getBondingCurvePDA(mint), true);
        const associatedUser = await (0, spl_token_1.getAssociatedTokenAddress)(mint, buyer, false);
        let transaction = new web3_js_1.Transaction();
        try {
            await (0, spl_token_1.getAccount)(this.connection, associatedUser, commitment);
        }
        catch (e) {
            transaction.add((0, spl_token_1.createAssociatedTokenAccountInstruction)(buyer, // payer of initialization fees
            associatedUser, // new associated token account
            buyer, // new account's owner
            mint // token mint account
            ));
        }
        transaction.add(await this.program.methods
            .buy(new bn_js_1.BN(tokenAmount.toString()), new bn_js_1.BN(solAmount.toString()))
            .accounts({
            feeRecipient: feeRecipient,
            mint: mint,
            associatedBondingCurve: associatedBondingCurve,
            associatedUser: associatedUser,
            user: buyer,
        })
            .transaction());
        return transaction;
    }
    // Simulate buy amounts based on inital reserves
    simulateBuys(amounts) {
        // const tokenTotalSupply = 1000000000 * tokenDecimals;
        let initialRealSolReserves = 0;
        let initialVirtualTokenReserves = 1073000000 * exports.DEFAULT_POW;
        let initialRealTokenReserves = 793100000 * exports.DEFAULT_POW;
        let totalTokensBought = 0;
        const buys = [];
        for (let solAmount of amounts) {
            const e = new bn_js_1.BN(solAmount.toString());
            const initialVirtualSolReserves = 30 * web3_js_1.LAMPORTS_PER_SOL + initialRealSolReserves;
            const a = new bn_js_1.BN(initialVirtualSolReserves).mul(new bn_js_1.BN(initialVirtualTokenReserves)); // k = x * y
            const i = new bn_js_1.BN(initialVirtualSolReserves).add(e);
            const l = a.div(i).add(new bn_js_1.BN(1));
            let tokensToBuy = new bn_js_1.BN(initialVirtualTokenReserves).sub(l);
            tokensToBuy = bn_js_1.BN.min(tokensToBuy, new bn_js_1.BN(initialRealTokenReserves));
            const tokensBought = tokensToBuy.toNumber();
            buys.push({ solAmount: solAmount, tokenAmount: BigInt(tokensToBuy.toString()) });
            initialRealSolReserves += e.toNumber();
            initialRealTokenReserves -= tokensBought;
            initialVirtualTokenReserves -= tokensBought;
            totalTokensBought += tokensBought;
        }
        return buys;
    }
    async getGlobalAccount(commitment = util_1.DEFAULT_COMMITMENT) {
        const [globalAccountPDA] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.GLOBAL_ACCOUNT_SEED)], new web3_js_1.PublicKey(exports.PROGRAM_ID));
        console.log(`global account PDA: ${globalAccountPDA.toBase58()}`);
        const tokenAccount = await this.connection.getAccountInfo(globalAccountPDA, commitment);
        return globalAccount_1.GlobalAccount.fromBuffer(tokenAccount.data);
    }
    async getBondingCurveAccount(mint, commitment = util_1.DEFAULT_COMMITMENT) {
        const tokenAccount = await this.connection.getAccountInfo(this.getBondingCurvePDA(mint), commitment);
        if (!tokenAccount) {
            return null;
        }
        return bondingCurveAccount_1.BondingCurveAccount.fromBuffer(tokenAccount.data);
    }
    getBondingCurvePDA(mint) {
        return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(exports.BONDING_CURVE_SEED), mint.toBuffer()], this.program.programId)[0];
    }
}
exports.PumpFunSDK = PumpFunSDK;
