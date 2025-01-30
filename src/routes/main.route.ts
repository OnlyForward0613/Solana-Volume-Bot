import { Router } from "express";

import { insertMovie, Movies, Update, Delete } from "../controller/movie.route";
import { createAndBuy } from "../controller/pumpfun.route";

const router = Router();

router.post("/insertMovie", insertMovie);
router.get("/", Movies);
router.patch("/updateMovie", Update);
router.delete("/deleteMovie", Delete);

// main function
router.post("/createAndBuy", createAndBuy);

export default router;
