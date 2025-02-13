"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
exports.default = {
    credential: joi_1.default.object().keys({
        email: joi_1.default.string().required().email(),
        password: joi_1.default.string().required().min(6),
    }),
    refreshToken: joi_1.default.object().keys({
        refreshToken: joi_1.default.string().required().min(1),
    }),
    // auth: Joi.object()
    //   .keys({ 
    //     authorization: JoiAuthBearer().required(),
    //   })
    //   .unknown(true),
    signup: joi_1.default.object().keys({
        name: joi_1.default.string().required().min(3),
        email: joi_1.default.string().required().email(),
        password: joi_1.default.string().required().min(6),
        profilePicUrl: joi_1.default.string().optional().uri(),
    }),
    distributionToWallets: joi_1.default.object().keys({
        sniperAmount: joi_1.default.number().optional().min(0),
        commonAmounts: joi_1.default.array().required().items(joi_1.default.number().min(0)),
    }),
    sellByPercentage: joi_1.default.object().keys({
        walletSK: joi_1.default.string().required(),
        percentage: joi_1.default.number().required().min(0).max(100),
    }),
    sellByAmount: joi_1.default.object().keys({
        walletSK: joi_1.default.string().required(),
        tokenAmount: joi_1.default.number().required().min(0),
    }),
    generateCommonWallets: joi_1.default.object().keys({
        nums: joi_1.default.string().required().min(1).max(2),
    }),
    setWallets: joi_1.default.object().keys({
        dev: joi_1.default.string().optional().max(100),
        sniper: joi_1.default.string().optional().max(100),
        fund: joi_1.default.string().optional().max(100),
        common: joi_1.default.array().optional().items(joi_1.default.string().max(100))
    }),
    setFundWallet: joi_1.default.object().keys({
        fund: joi_1.default.string().required().max(100),
    }),
    // RPC and WEBSOCKET ENDPOINT, JITO_FEE
    setNetwork: joi_1.default.object().keys({
        RPC_ENDPOINT: joi_1.default.string().optional(),
        RPC_WEBSOCKET_ENDPOINT: joi_1.default.string().optional(),
        JITO_FEE: joi_1.default.number().optional().min(0),
    }),
    setBuyAmounts: joi_1.default.object().keys({
        dev: joi_1.default.number().required().min(0),
        sniper: joi_1.default.number().required().min(0),
        common: joi_1.default.array().required().items(joi_1.default.number().min(0)),
    }),
    setSellPercentage: joi_1.default.object().keys({
        sellPercentage: joi_1.default.array().length(4).required().items(joi_1.default.number().min(0).less(100)),
    }),
    setSellAmount: joi_1.default.object().keys({
        sellAmount: joi_1.default.number().required().min(0),
    }),
    setTokenMetadata: joi_1.default.object().keys({
        name: joi_1.default.string().required(),
        symbol: joi_1.default.string().required(),
        metadataUri: joi_1.default.string().required().uri(),
        mintPrivateKey: joi_1.default.string().required(),
    }),
    removeCommonWallet: joi_1.default.object().keys({
        wallet: joi_1.default.string().required(),
    }),
    setUser: joi_1.default.object().keys({
        name: joi_1.default.string().required(),
        authKey: joi_1.default.string().required().length(32),
    }),
    deleteUser: joi_1.default.object().keys({
        authKey: joi_1.default.string().required().length(32),
    }),
    editUser: joi_1.default.object().keys({
        authKey: joi_1.default.string().required().length(32),
        newUsername: joi_1.default.string().optional(),
    }),
    authKeyCheck: joi_1.default.object().keys({
        authKey: joi_1.default.string().required().length(32),
    }),
    authAdmin: joi_1.default.object().keys({
        authKey: joi_1.default.string().required(),
    }),
};
