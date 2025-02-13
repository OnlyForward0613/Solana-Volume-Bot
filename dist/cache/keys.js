"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleType = exports.AmountType = exports.WalletKey = exports.WalletType = exports.NetworkType = exports.DynamicKey = exports.Key = void 0;
exports.getDynamicKey = getDynamicKey;
var Key;
(function (Key) {
    Key["BLOGS_LATEST"] = "BLOGS_LATEST";
    Key["TOKEN_METADATA"] = "TOKEN_METADATA";
    Key["MINT_PRIVATEKEY"] = "MINT_PRIVATEKEY";
    Key["USER_LIST"] = "USER_LIST";
})(Key || (exports.Key = Key = {}));
var DynamicKey;
(function (DynamicKey) {
    DynamicKey["BLOGS_SIMILAR"] = "BLOGS_SIMILAR";
    DynamicKey["BLOG"] = "BLOG";
    DynamicKey["WALLET"] = "WALLET";
})(DynamicKey || (exports.DynamicKey = DynamicKey = {}));
var NetworkType;
(function (NetworkType) {
    NetworkType["RPC_ENDPOINT"] = "RPC_ENDPOINT";
    NetworkType["RPC_WEBSOCKET_ENDPOINT"] = "RPC_WEBSOCKET_ENDPOINT";
    NetworkType["JITO_FEE"] = "JITO_FEE";
})(NetworkType || (exports.NetworkType = NetworkType = {}));
var WalletType;
(function (WalletType) {
    WalletType["COMMON"] = "COMMON";
    WalletType["FUND"] = "FUND";
    WalletType["DEV"] = "DEV";
    WalletType["SNIPER"] = "SNIPER";
})(WalletType || (exports.WalletType = WalletType = {}));
var WalletKey;
(function (WalletKey) {
    WalletKey["COMMON"] = "WALLET_COMMON";
    WalletKey["FUND"] = "WALLET_FUND";
    WalletKey["DEV"] = "WALLET_DEV";
    WalletKey["SNIPER"] = "WALLET_SNIPER";
})(WalletKey || (exports.WalletKey = WalletKey = {}));
var AmountType;
(function (AmountType) {
    AmountType["DEV"] = "DEV_AMOUNT";
    AmountType["SNIPER"] = "SNIPER_AMOUNT";
    AmountType["COMMON"] = "COMMON_AMOUNTS";
    AmountType["FUND"] = "FUND_AMOUNT";
    AmountType["SELL_PERCENTAGE"] = "SELL_PERCENTAGE";
    AmountType["SELL_AMOUNT"] = "SELL_AMOUNT";
})(AmountType || (exports.AmountType = AmountType = {}));
var RoleType;
(function (RoleType) {
    RoleType["ADMIN"] = "ADMIN";
    RoleType["USER"] = "USER";
})(RoleType || (exports.RoleType = RoleType = {}));
function getDynamicKey(key, suffix) {
    const dynamic = `${key}_${suffix}`;
    return dynamic;
}
