import type { Request, Response } from "express";

import type { AnalyzeErrorCode } from "../../../shared/src/analysis/analyzeContracts.js";
import type { AnalysisProvider } from "../services/transcription/analysisProvider.js";
import { analyzeContent } from "../services/analyzeService.js";
import type { AnalyzeRequest, AnalyzeResponseMeta } from "../../../shared/src/analysis/analyzeContracts.js";
import { ApiError } from "../utils/errors.js";

export function createAnalyzeController(provider: AnalysisProvider) {
  return async function analyzeController(req: Request, res: Response) {
    const mode: AnalyzeRequest["mode"] = req.body?.mode === "learning" ? "learning" : "concise";
    const baseMeta: AnalyzeResponseMeta = {
      mode,
      generatedAt: new Date().toISOString(),
      source: null,
      decision: {
        routeAction: "call_model",
        reasonCode: "model_required"
      }
    };

    try {
      const response = await analyzeContent(req.body, provider);
      return res.json(response);
    } catch (error) {
      if (error instanceof ApiError) {
        return res
          .status(error.status)
          .json({
            success: false,
            outcome: "failed",
            data: null,
            review: null,
            error: {
              code: error.code as AnalyzeErrorCode,
              message: error.message
            },
            meta: baseMeta
          });
      }

      return res.status(500).json({
        success: false,
        outcome: "failed",
        data: null,
        review: null,
        error: {
          code: "INTERNAL_ERROR" as const,
          message: "Internal server error"
        },
        meta: baseMeta
      });
    }
  };
}
