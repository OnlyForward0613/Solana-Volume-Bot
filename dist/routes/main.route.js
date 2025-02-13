"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pumpfun_route_1 = require("../controller/pumpfun.route");
const wallet_route_1 = require("../controller/wallet.route");
const schema_1 = __importDefault(require("./schema"));
const validator_1 = __importStar(require("../helper/validator"));
const authMiddleware_1 = require("../helper/authMiddleware");
const router = (0, express_1.Router)();
// create token
router.get("/launch-token", authMiddleware_1.checkAuthKey, pumpfun_route_1.launchToken);
// sell token
router.post("/sell-by-percentage", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.sellByPercentage), pumpfun_route_1.sellByPercentage);
router.post("/sell-by-amount", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.sellByAmount), pumpfun_route_1.sellByAmount);
router.get("/sell-dump-all", authMiddleware_1.checkAuthKey, pumpfun_route_1.sellDumpAll);
// distribution and gather
router.post("/distributionSol", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.distributionToWallets), pumpfun_route_1.distributionSol);
router.get("/gather-fund", authMiddleware_1.checkAuthKey, pumpfun_route_1.gatherFund);
// Generate wallets
router.get("/generate-wallet/common", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.generateCommonWallets, validator_1.ValidationSource.QUERY), wallet_route_1.generateCommonWallets);
router.get("/generate-wallet/dev", authMiddleware_1.checkAuthKey, wallet_route_1.generateDevWallet);
router.get("/generate-wallet/sniper", authMiddleware_1.checkAuthKey, wallet_route_1.generateSniperWallet);
router.get("/generate-wallet/mint", authMiddleware_1.checkAuthKey, wallet_route_1.generateMintWallet);
/// Import and Export Wallet info
router.post("/set-wallets", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setWallets), wallet_route_1.setWallets);
router.post("/set-wallet-fund", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setFundWallet), wallet_route_1.setFundWallet);
router.get("/get-wallet", authMiddleware_1.checkAuthKey, wallet_route_1.getWallets);
// Network configuration(rpc node, buy and sell options)
router.post("/set-network", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setNetwork), wallet_route_1.setNetwork);
router.get("/get-network", authMiddleware_1.checkAuthKey, wallet_route_1.getNetwork);
// Setting and Getting buy amounts
router.post("/set-buy-amounts", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setBuyAmounts), wallet_route_1.setBuyAmounts);
router.get("/get-buy-amounts", authMiddleware_1.checkAuthKey, wallet_route_1.getBuyAmounts);
// Setting and Getting sell percentages
router.post("/set-sell-percentage", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setSellPercentage), wallet_route_1.setSellPercentage);
router.get("/get-sell-percentage", authMiddleware_1.checkAuthKey, wallet_route_1.getSellPercentage);
// Setting and Getting sell amount
router.post("/set-sell-amount", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setSellAmount), wallet_route_1.setSellAmount);
router.get("/get-sell-amount", authMiddleware_1.checkAuthKey, wallet_route_1.getSellAmount);
// Manage token info
router.post("/set-token-metadata", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.setTokenMetadata), wallet_route_1.setTokenMetadataInfo);
router.get("/get-token-metadata", authMiddleware_1.checkAuthKey, wallet_route_1.getTokenMetadataInfo);
// remove wallets
router.delete("/remove-wallet/fund", authMiddleware_1.checkAuthKey, wallet_route_1.removeFundWallet);
router.delete("/remove-wallet/dev", authMiddleware_1.checkAuthKey, wallet_route_1.removeDevWallet);
router.delete("/remove-wallet/sniper", authMiddleware_1.checkAuthKey, wallet_route_1.removeSniperWallet);
router.post("/remove-wallet/common", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.removeCommonWallet), wallet_route_1.removeCommonWallet);
// user management
router.post("/admin/set-user", authMiddleware_1.checkAuthAdmin, (0, validator_1.default)(schema_1.default.setUser), wallet_route_1.adminSetUser);
router.get("/admin/get-all-users", authMiddleware_1.checkAuthAdmin, wallet_route_1.adminGetAllUsers);
router.post("/admin/delete-user", authMiddleware_1.checkAuthAdmin, (0, validator_1.default)(schema_1.default.deleteUser), wallet_route_1.adminDeleteUser);
router.post("/admin/edit-user", authMiddleware_1.checkAuthAdmin, (0, validator_1.default)(schema_1.default.editUser), wallet_route_1.adminEditUsername);
// auth check
router.post("/auth/key", (0, validator_1.default)(schema_1.default.authKeyCheck), wallet_route_1.authKeyCheckWhileEntering);
router.post("/auth/admin", authMiddleware_1.checkAuthKey, (0, validator_1.default)(schema_1.default.authAdmin), wallet_route_1.adminCheckWhileEnteringDashboard);
exports.default = router;
