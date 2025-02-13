"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extendLut = exports.initializeLUT = exports.getAllAccountsForLUT = exports.isValidSolanaPrivateKey = exports.createNewPrivateKeyBasedonAssets = exports.calculateWithSlippageSell = exports.isFundSufficent = exports.simulateTxBeforeSendBundle = exports.calculateWithSlippageBuy = exports.sleep = exports.getRandomInt = exports.getTxDetails = exports.buildVersionedTx = exports.getSPLBalance = exports.printSPLBalance = exports.DEFAULT_FINALITY = exports.DEFAULT_COMMITMENT = void 0;
exports.printSOLBalance = printSOLBalance;
exports.getOrCreateKeypair = getOrCreateKeypair;
exports.buildTx = buildTx;
exports.sendTx = sendTx;
const web3_js_1 = require("@solana/web3.js");
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const fs_1 = __importDefault(require("fs"));
const spl_token_1 = require("@solana/spl-token");
const bs58_1 = __importDefault(require("bs58"));
const sdk_1 = require("../pumpfun/sdk");
exports.DEFAULT_COMMITMENT = "processed";
exports.DEFAULT_FINALITY = "finalized";
async function printSOLBalance(connection, pubKey, info = "") {
    const balance = await connection.getBalance(pubKey);
    console.log(`${info ? info + " " : ""}${pubKey.toBase58()}:`, balance / web3_js_1.LAMPORTS_PER_SOL, `SOL`);
}
const printSPLBalance = async (connection, mintAddress, user, info = "") => {
    const balance = await (0, exports.getSPLBalance)(connection, mintAddress, user);
    if (balance === null) {
        console.log(`${info ? info + " " : ""}${user.toBase58()}:`, "No Account Found");
    }
    else {
        console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
    }
};
exports.printSPLBalance = printSPLBalance;
const getSPLBalance = async (connection, mintAddress, owner, allowOffCurve = false) => {
    try {
        let ata = (0, spl_token_1.getAssociatedTokenAddressSync)(mintAddress, owner, allowOffCurve);
        const balance = await connection.getTokenAccountBalance(ata, "processed");
        return balance.value.uiAmount;
    }
    catch (e) { }
    return null;
};
exports.getSPLBalance = getSPLBalance;
function getOrCreateKeypair(dir, keyName) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    const authorityKey = dir + "/" + keyName + ".json";
    if (fs_1.default.existsSync(authorityKey)) {
        const data = JSON.parse(fs_1.default.readFileSync(authorityKey, "utf-8"));
        return web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(data.secretKey));
    }
    else {
        const keypair = web3_js_1.Keypair.generate();
        keypair.secretKey;
        fs_1.default.writeFileSync(authorityKey, JSON.stringify({
            secretKey: bytes_1.bs58.encode(keypair.secretKey),
            publicKey: keypair.publicKey.toBase58(),
        }));
        return keypair;
    }
}
async function buildTx(connection, tx, payer, signers, latestBlockhash, priorityFees, commitment = exports.DEFAULT_COMMITMENT, finality = exports.DEFAULT_FINALITY) {
    try {
        let newTx = new web3_js_1.Transaction();
        if (priorityFees) {
            const modifyComputeUnits = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({
                units: priorityFees.unitLimit,
            });
            const addPriorityFee = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFees.unitPrice,
            });
            newTx.add(modifyComputeUnits);
            newTx.add(addPriorityFee);
        }
        newTx.add(tx);
        let versionedTx = await (0, exports.buildVersionedTx)(connection, payer, newTx, latestBlockhash, commitment);
        versionedTx.sign(signers);
        return versionedTx;
    }
    catch (err) {
        console.log(`There are some errors in getting versioned transaction, ${err}`);
        return null;
    }
}
const buildVersionedTx = async (connection, payer, tx, latestBlockhash, commitment = exports.DEFAULT_COMMITMENT, lutAccounts = undefined) => {
    const blockhash = latestBlockhash.blockhash;
    let messageV0 = new web3_js_1.TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions: tx.instructions,
    }).compileToV0Message(lutAccounts);
    return new web3_js_1.VersionedTransaction(messageV0);
};
exports.buildVersionedTx = buildVersionedTx;
async function sendTx(connection, tx, payer, signers, latestBlockhash, priorityFees, commitment = exports.DEFAULT_COMMITMENT, finality = exports.DEFAULT_FINALITY) {
    let newTx = new web3_js_1.Transaction();
    if (priorityFees) {
        const modifyComputeUnits = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({
            units: priorityFees.unitLimit,
        });
        const addPriorityFee = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFees.unitPrice,
        });
        newTx.add(modifyComputeUnits);
        newTx.add(addPriorityFee);
    }
    newTx.add(tx);
    let versionedTx = await (0, exports.buildVersionedTx)(connection, payer, newTx, latestBlockhash, commitment);
    versionedTx.sign(signers);
    try {
        console.log((await connection.simulateTransaction(versionedTx, undefined)));
        const sig = await connection.sendTransaction(versionedTx, {
            skipPreflight: false,
        });
        console.log("sig:", `https://solscan.io/tx/${sig}`);
        let txResult = await (0, exports.getTxDetails)(connection, sig, commitment, finality);
        if (!txResult) {
            return {
                success: false,
                error: "Transaction failed",
            };
        }
        return {
            success: true,
            signature: sig,
            results: txResult,
        };
    }
    catch (e) {
        if (e instanceof web3_js_1.SendTransactionError) {
            let ste = e;
        }
        else {
            console.error(e);
        }
        return {
            error: e,
            success: false,
        };
    }
}
const getTxDetails = async (connection, sig, commitment = exports.DEFAULT_COMMITMENT, finality = exports.DEFAULT_FINALITY) => {
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: sig,
    }, commitment);
    return connection.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
        commitment: finality,
    });
};
exports.getTxDetails = getTxDetails;
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; // The maximum is inclusive, the minimum is inclusive
};
exports.getRandomInt = getRandomInt;
const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const calculateWithSlippageBuy = (amount, basisPoints) => {
    return amount + (amount * basisPoints) / 10000n;
};
exports.calculateWithSlippageBuy = calculateWithSlippageBuy;
const simulateTxBeforeSendBundle = async (connection, txs) => {
    const results = await Promise.all(txs.map(async (tx) => {
        try {
            const txid = await connection.simulateTransaction(tx, { commitment: exports.DEFAULT_COMMITMENT });
            const sig = bs58_1.default.encode(tx.signatures[0]);
            if (txid.value.err) {
                console.log(`simulation err, sig: ${sig}`, txid.value.err);
                return false;
            }
            else {
                console.log(`simulation ok, sig: ${sig}`, txid);
                return true;
            }
        }
        catch (err) {
            console.error('simulation err', err);
            return false;
        }
    }));
    const successNums = results.filter(result => result === true);
    console.log(successNums);
    if (successNums.length >= txs.length) {
        return true;
    }
    return false;
    // for (const tx of txs) {
    //   try {
    //     const txid = await connection.simulateTransaction(tx, { commitment: 'confirmed'});
    //     const sig = base58.encode(tx.signatures[0]);
    //     if (txid.value.err) {
    //       console.log(`simulation err, sig: ${sig}`, txid.value.err);
    //       // return false;
    //     } else {
    //       console.log(`simulation ok, sig: ${sig}`);
    //     }
    //   } catch (err) {
    //     console.error('simulation err', err);
    //     return false;
    //   }
    // }
    // return true;
};
exports.simulateTxBeforeSendBundle = simulateTxBeforeSendBundle;
const isFundSufficent = async (account, solAmount, connection) => {
    let count = 0;
    while (true) {
        try {
            if (BigInt(await connection.getBalance(account)) < solAmount) {
                return false;
            }
            break;
        }
        catch (err) {
            console.log(`Errors when getting sol balance of account, ${err}`);
            count++;
            if (count >= 3) {
                console.log("RPC Error or Invalid solana address");
                return false;
            }
        }
    }
    return true;
};
exports.isFundSufficent = isFundSufficent;
const calculateWithSlippageSell = (amount, basisPoints) => {
    return amount - (amount * basisPoints) / 10000n;
};
exports.calculateWithSlippageSell = calculateWithSlippageSell;
const createNewPrivateKeyBasedonAssets = (allWallets) => {
    while (1) {
        const newWalletPrivateKey = bytes_1.bs58.encode(web3_js_1.Keypair.generate().secretKey);
        if (!allWallets.includes(newWalletPrivateKey)) {
            return newWalletPrivateKey;
        }
    }
};
exports.createNewPrivateKeyBasedonAssets = createNewPrivateKeyBasedonAssets;
// check if given string is valid solana private key
const isValidSolanaPrivateKey = (keys) => {
    console.log(keys);
    try {
        keys.map(key => {
            web3_js_1.Keypair.fromSecretKey(bytes_1.bs58.decode(key));
        });
        return true;
    }
    catch (err) {
        console.log(`Invalid solana address, ${err}`);
        return false;
    }
};
exports.isValidSolanaPrivateKey = isValidSolanaPrivateKey;
// get all accounts for address lookup table
const getAllAccountsForLUT = (mintPK, payerPK, accounts) => {
    try {
        const accountsForLUT = [];
        accounts.map(account => {
            const ataAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(mintPK, account.publicKey);
            accountsForLUT.push(account.publicKey, ataAccount);
        });
        const mplTokenMetadata = new web3_js_1.PublicKey(sdk_1.MPL_TOKEN_METADATA_PROGRAM_ID);
        const [metadataPDA] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from(sdk_1.METADATA_SEED),
            mplTokenMetadata.toBuffer(),
            mintPK.toBuffer()
        ], mplTokenMetadata);
        const [bondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(sdk_1.BONDING_CURVE_SEED), mintPK.toBuffer()], new web3_js_1.PublicKey(sdk_1.PROGRAM_ID));
        const [associatedBondingCurve] = web3_js_1.PublicKey.findProgramAddressSync([
            bondingCurve.toBuffer(),
            spl_token_1.TOKEN_PROGRAM_ID.toBuffer(),
            mintPK.toBuffer(),
        ], spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
        accountsForLUT.push(sdk_1.GLOBAL_ACCOUNT, sdk_1.MINT_AUTHORITY, mplTokenMetadata, metadataPDA, bondingCurve, associatedBondingCurve, mintPK, new web3_js_1.PublicKey(sdk_1.PROGRAM_ID), // pumpfun program
        sdk_1.FEE_RECIPICEMT, web3_js_1.SystemProgram.programId, spl_token_1.TOKEN_2022_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, web3_js_1.SYSVAR_RENT_PUBKEY, payerPK);
        return accountsForLUT;
    }
    catch (err) {
        console.log(`Errors when getting all accounts for LUT, ${err}`);
        return [];
    }
};
exports.getAllAccountsForLUT = getAllAccountsForLUT;
const initializeLUT = async (connection, authorityPK) => {
    try {
        const slot = await connection.getSlot();
        return web3_js_1.AddressLookupTableProgram.createLookupTable({
            authority: authorityPK,
            payer: authorityPK,
            recentSlot: slot - 1
        });
    }
    catch (err) {
        console.log(`Errors when initializing LUT, ${err}`);
        return [null, `Errors when initializing LUT, ${err}`];
    }
};
exports.initializeLUT = initializeLUT;
const extendLut = (lut, payerPK, accounts) => {
    return web3_js_1.AddressLookupTableProgram.extendLookupTable({
        lookupTable: lut,
        authority: payerPK,
        payer: payerPK,
        addresses: accounts
    });
};
exports.extendLut = extendLut;
