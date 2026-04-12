import { Router } from "express";

import type { ArticleOcrProvider } from "../services/articleOcr/articleOcrProvider.js";
import { createArticleImportController } from "../controllers/articleImportController.js";
import { bilibiliImportController } from "../controllers/bilibiliImportController.js";

export function createImportRoutes(articleOcrProvider: ArticleOcrProvider) {
  const router = Router();

  router.post("/import/article", createArticleImportController(articleOcrProvider));
  router.post("/import/bilibili", bilibiliImportController);

  return router;
}
