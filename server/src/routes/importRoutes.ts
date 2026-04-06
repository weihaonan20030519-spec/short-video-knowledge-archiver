import { Router } from "express";

import { bilibiliImportController } from "../controllers/bilibiliImportController.js";

export const importRoutes = Router();

importRoutes.post("/import/bilibili", bilibiliImportController);

