import type { Request, Response } from "express";

import type { AnalysisProvider } from "../services/transcription/analysisProvider.js";
import { analyzeContent } from "../services/analyzeService.js";
import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";
import { ApiError, createErrorResponse } from "../utils/errors.js";

export function createAnalyzeController(provider: AnalysisProvider) {
  return async function analyzeController(req: Request, res: Response) {
    const mode: AnalyzeRequest["mode"] = req.body?.mode === "learning" ? "learning" : "concise";
    const meta = {
      mode,
      generatedAt: new Date().toISOString()
    };

    try {
      const data = await analyzeContent(req.body, provider);

      return res.json({
        success: true,
        data,
        error: null,
        meta
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res
          .status(error.status)
          .json(createErrorResponse(error.code, error.message, meta));
      }

      return res
        .status(500)
        .json(createErrorResponse("INTERNAL_ERROR", "Internal server error", meta));
    }
  };
}
