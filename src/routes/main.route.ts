import { Router } from "express";

// import { insertMovie, Movies, Update, Delete } from "../controller/movie.route";
import { createAndBuy, distribution } from "../controller/pumpfun.route";
import { exportWallets, generateCommonWallets, generateDevWallet, generateSniperWallet, importFundWallet, importWallets } from "../controller/wallet.route";
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

router.get("/generate-wallet/common", validator(schema.generateCommonWallets, ValidationSource.QUERY), generateCommonWallets);
router.get("/generate-wallet/dev", generateDevWallet);
router.get("/generate-wallet/sniper", generateSniperWallet);

router.post("/import-wallet", validator(schema.importWallets), importWallets);
router.post("/import-wallet/fund", validator(schema.importFundWallet), importFundWallet);
router.get("/export-wallet", exportWallets);

export default router;
