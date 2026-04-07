import { Router } from "express";

import { articleImportController } from "../controllers/articleImportController.js";
import { bilibiliImportController } from "../controllers/bilibiliImportController.js";

export const importRoutes = Router();

importRoutes.post("/import/article", articleImportController);
importRoutes.post("/import/bilibili", bilibiliImportController);
