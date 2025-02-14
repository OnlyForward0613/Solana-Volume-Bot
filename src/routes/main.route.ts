import { Router } from "express";
import { 
  distributionSol, 
  gatherFund, 
  launchToken, 
  sellByAmount, 
  sellByPercentage, 
  sellDumpAll 
} from "../controller/pumpfun.route";
import { 
  getWallets, 
  generateCommonWallets, 
  generateDevWallet, 
  generateSniperWallet, 
  getBuyAmounts, 
  getNetwork, 
  getSellAmount, 
  getSellPercentage, 
  getTokenMetadataInfo, 
  setFundWallet, 
  setWallets, 
  setBuyAmounts, 
  setNetwork, 
  setSellAmount, 
  setSellPercentage,
  setTokenMetadataInfo,
  removeFundWallet,
  removeDevWallet,
  removeSniperWallet,
  removeCommonWallet,
  generateMintWallet,
  adminSetUser,
  adminGetAllUsers,
  adminDeleteUser,
  adminEditUsername,
  authKeyCheckWhileEntering,
  adminCheckWhileEnteringDashboard
} from "../controller/wallet.route";
import schema from "./schema";
import validator, { ValidationSource } from "../helper/validator";
import { checkAuthAdmin, checkAuthKey } from "../helper/authMiddleware";

const router = Router();

// create token
router.get("/launch-token", checkAuthKey, launchToken);

// sell token
router.post("/sell-by-percentage", checkAuthKey, validator(schema.sellByPercentage), sellByPercentage);
router.post("/sell-by-amount", checkAuthKey, validator(schema.sellByAmount), sellByAmount);
router.get("/sell-dump-all", checkAuthKey, sellDumpAll);

// distribution and gather
router.post("/distributionSol", checkAuthKey, validator(schema.distributionToWallets), distributionSol);
router.get("/gather-fund", checkAuthKey, gatherFund);

// Generate wallets
router.get("/generate-wallet/common", checkAuthKey, validator(schema.generateCommonWallets, ValidationSource.QUERY), generateCommonWallets);
router.get("/generate-wallet/dev", checkAuthKey, generateDevWallet);
router.get("/generate-wallet/sniper", checkAuthKey, generateSniperWallet);
router.get("/generate-wallet/mint", checkAuthKey, generateMintWallet);

/// Import and Export Wallet info
router.post("/set-wallets", checkAuthKey, validator(schema.setWallets), setWallets);
router.post("/set-wallet-fund", checkAuthKey, validator(schema.setFundWallet), setFundWallet);
router.get("/get-wallet", checkAuthKey, getWallets);

// Network configuration(rpc node, buy and sell options)
router.post("/set-network", checkAuthKey, validator(schema.setNetwork), setNetwork);
router.get("/get-network", checkAuthKey, getNetwork);

// Setting and Getting buy amounts
router.post("/set-buy-amounts", checkAuthKey, validator(schema.setBuyAmounts), setBuyAmounts);
router.get("/get-buy-amounts", checkAuthKey, getBuyAmounts);

// Setting and Getting sell percentages
router.post("/set-sell-percentage", checkAuthKey, validator(schema.setSellPercentage), setSellPercentage);
router.get("/get-sell-percentage", checkAuthKey, getSellPercentage);

// Setting and Getting sell amount
router.post("/set-sell-amount", checkAuthKey, validator(schema.setSellAmount), setSellAmount);
router.get("/get-sell-amount", checkAuthKey, getSellAmount);

// Manage token info
router.post("/set-token-metadata", checkAuthKey, validator(schema.setTokenMetadata), setTokenMetadataInfo);
router.get("/get-token-metadata", checkAuthKey, getTokenMetadataInfo);

// remove wallets
router.delete("/remove-wallet/fund", checkAuthKey, removeFundWallet);
router.delete("/remove-wallet/dev", checkAuthKey, removeDevWallet);
router.delete("/remove-wallet/sniper", checkAuthKey, removeSniperWallet);
router.post("/remove-wallet/common", checkAuthKey, validator(schema.removeCommonWallet), removeCommonWallet);

// user management
router.post("/admin/set-user", checkAuthAdmin, validator(schema.setUser), adminSetUser);
router.get("/admin/get-all-users", checkAuthAdmin, adminGetAllUsers);
router.post("/admin/delete-user", checkAuthAdmin, validator(schema.deleteUser), adminDeleteUser);
router.post("/admin/edit-user", checkAuthAdmin, validator(schema.editUser), adminEditUsername);

// auth check
router.post("/auth/key", validator(schema.authKeyCheck), authKeyCheckWhileEntering);
router.post("/auth/admin", checkAuthKey, validator(schema.authAdmin), adminCheckWhileEnteringDashboard);

export default router;
