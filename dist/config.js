"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lutProviders = exports.configNetwork = exports.MAX_COMMON_WALLETS_NUMS = exports.environment = exports.redis = exports.sdk = exports.global_mint = exports.JITO_FEE = exports.JITO_KEY = exports.JITO_AUTH_KEYPAIR = exports.BLOCKENGINE_URL = exports.anchorProvider = exports.getProvider = exports.private_connection = exports.connection = exports.COMMITMENT_LEVEL = exports.PRIVATE_RPC_ENDPOINT = exports.RPC_WEBSOCKET_ENDPOINT = exports.RPC_ENDPOINT = void 0;
const web3_js_1 = require("@solana/web3.js");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
const dotenv_1 = __importDefault(require("dotenv"));
const anchor_1 = require("@coral-xyz/anchor");
const sdk_1 = require("./pumpfun/sdk");
dotenv_1.default.config();
exports.RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
exports.RPC_WEBSOCKET_ENDPOINT = "wss://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
exports.PRIVATE_RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=a8769523-bf96-4884-bcc0-cf79af6acce3";
exports.COMMITMENT_LEVEL = 'confirmed';
exports.connection = new web3_js_1.Connection(exports.RPC_ENDPOINT, {
    wsEndpoint: exports.RPC_WEBSOCKET_ENDPOINT
});
console.log("RPC_ENDPOINT", exports.RPC_ENDPOINT);
exports.private_connection = new web3_js_1.Connection(exports.PRIVATE_RPC_ENDPOINT, {
    commitment: exports.COMMITMENT_LEVEL,
    wsEndpoint: exports.RPC_WEBSOCKET_ENDPOINT
});
const getProvider = (connection) => {
    let wallet = new nodewallet_1.default(new web3_js_1.Keypair());
    return new anchor_1.AnchorProvider(connection, wallet, { commitment: exports.COMMITMENT_LEVEL });
};
exports.getProvider = getProvider;
exports.anchorProvider = (0, exports.getProvider)(exports.connection);
// jito
exports.BLOCKENGINE_URL = "tokyo.mainnet.block-engine.jito.wtf";
exports.JITO_AUTH_KEYPAIR = "66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC";
exports.JITO_KEY = "66xqL9aFZJ8k9YpjNBexNASfuoDgNE1ZpGRXB28zoTfS4u2czzVBhMNMqgZYFeMN8FnUi6gMzXWgVYRHkTZ6yuLC";
exports.JITO_FEE = 2000000; // 0.002 sol
// pumpfun sdk
exports.global_mint = new web3_js_1.PublicKey("p89evAyzjd9fphjJx7G3RFA48sbZdpGEppRcfRNpump");
exports.sdk = new sdk_1.PumpFunSDK(exports.anchorProvider);
// redis server setting
exports.redis = {
    host: process.env.REDIS_HOST || "localhsot",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || '',
};
exports.environment = process.env.NODE_ENV || 'development';
// wallet count limit
exports.MAX_COMMON_WALLETS_NUMS = 20;
const configNetwork = (RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT) => {
    exports.connection = new web3_js_1.Connection(RPC_ENDPOINT, {
        wsEndpoint: RPC_WEBSOCKET_ENDPOINT
    });
    exports.anchorProvider = (0, exports.getProvider)(exports.connection);
    exports.sdk = new sdk_1.PumpFunSDK(exports.anchorProvider);
};
exports.configNetwork = configNetwork;
exports.lutProviders = {};
