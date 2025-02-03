import { Router } from "express";

import { insertMovie, Movies, Update, Delete } from "../controller/movie.route";
import { createAndBuy, distribution } from "../controller/pumpfun.route";
import { generateCommonWallets, generateDevWallet, importWallets } from "../controller/wallet.route";
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

router.post("/import-wallets", validator(schema.importWallets), importWallets);

export default router;
