import { Router } from "express";

import type { AnalysisProvider } from "../services/transcription/analysisProvider.js";
import { createAnalyzeController } from "../controllers/analyzeController.js";

export function createAnalyzeRoutes(provider: AnalysisProvider) {
  const analyzeRoutes = Router();

  analyzeRoutes.post("/analyze", createAnalyzeController(provider));

  return analyzeRoutes;
}
