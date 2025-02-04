import { Router } from "express";

// import { insertMovie, Movies, Update, Delete } from "../controller/movie.route";
import { createAndBuy, distribution } from "../controller/pumpfun.route";
import { 
  exportWallets, 
  generateCommonWallets, 
  generateDevWallet, 
  generateSniperWallet, 
  getBuyAmounts, 
  getNetwork, 
  importFundWallet, 
  importWallets, 
  setBuyAmounts, 
  setNetwork 
} from "../controller/wallet.route";
import schema from "./schema";
import validator, { ValidationSource } from "../helper/validator";

const router = Router();

// router.post("/insertMovie", insertMovie);
// router.get("/", Movies);
// router.patch("/updateMovie", Update);
// router.delete("/deleteMovie", Delete);

// main function
router.post("/createAndBuy", createAndBuy);
router.post("/distribution", distribution);

// Generate wallets
router.get("/generate-wallet/common", validator(schema.generateCommonWallets, ValidationSource.QUERY), generateCommonWallets);
router.get("/generate-wallet/dev", generateDevWallet);
router.get("/generate-wallet/sniper", generateSniperWallet);

/// Import and Export Wallet info
router.post("/import-wallet", validator(schema.importWallets), importWallets);
router.post("/import-wallet/fund", validator(schema.importFundWallet), importFundWallet);
router.get("/export-wallet", exportWallets);

// Network configuration(rpc node, buy and sell options)
router.post("/set-network", validator(schema.setNetwork), setNetwork);
router.get("/get-network", getNetwork);

// Setting and Getting buy amounts
router.post("/set-buy-amounts", validator(schema.setBuyAmounts), setBuyAmounts);
router.get("/get-buy-amounts", getBuyAmounts);

export default router;
