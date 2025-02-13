"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevWalletKey = getDevWalletKey;
exports.getFundWalletKey = getFundWalletKey;
exports.getSniperWalletKey = getSniperWalletKey;
exports.getCommonWalletKey = getCommonWalletKey;
exports.getAllWallets = getAllWallets;
const keys_1 = require("../keys");
const query_1 = require("../query");
function getDevWalletKey() {
    return (0, keys_1.getDynamicKey)(keys_1.DynamicKey.WALLET, keys_1.WalletType.DEV);
}
function getFundWalletKey() {
    return (0, keys_1.getDynamicKey)(keys_1.DynamicKey.WALLET, keys_1.WalletType.FUND);
}
function getSniperWalletKey() {
    return (0, keys_1.getDynamicKey)(keys_1.DynamicKey.WALLET, keys_1.WalletType.SNIPER);
}
function getCommonWalletKey() {
    return (0, keys_1.getDynamicKey)(keys_1.DynamicKey.WALLET, keys_1.WalletType.COMMON);
}
async function getAllWallets() {
    const wallet = {
        fund: await (0, query_1.getValue)(keys_1.WalletKey.DEV) ?? "",
        dev: await (0, query_1.getValue)(keys_1.WalletKey.DEV) ?? "",
        sniper: await (0, query_1.getValue)(keys_1.WalletKey.SNIPER) ?? "",
        common: await (0, query_1.getListRange)(keys_1.WalletKey.COMMON) ?? [],
    };
    const walletSKs = [];
    if (wallet.fund)
        walletSKs.push(wallet.fund);
    if (wallet.dev)
        walletSKs.push(wallet.dev);
    if (wallet.sniper)
        walletSKs.push(wallet.sniper);
    if (wallet.common.length)
        walletSKs.push(...wallet.common);
    return walletSKs;
}
