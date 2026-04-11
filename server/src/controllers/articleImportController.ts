import type { Request, Response } from "express";
import { ZodError } from "zod";

import type { ArticleOcrProvider } from "../services/articleOcr/articleOcrProvider.js";
import { importArticleContent } from "../services/articleImportService.js";
import { logger } from "../utils/logger.js";

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      code: "code" in error ? (error as { code?: unknown }).code ?? null : null
    };
  }

  return {
    name: typeof error,
    message: String(error),
    stack: null,
    code: null
  };
}

export function createArticleImportController(articleOcrProvider: ArticleOcrProvider) {
  return async function articleImportController(req: Request, res: Response) {
    try {
      const data = await importArticleContent(req.body, { ocrProvider: articleOcrProvider });

      return res.json({
        success: true,
        data,
        error: null
      });
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error("Article import request failed", {
        url:
          req.body && typeof req.body === "object" && "url" in req.body
            ? (req.body as { url?: unknown }).url ?? null
            : null,
        errorName: details.name,
        errorMessage: details.message,
        errorCode: details.code,
        stack: details.stack
      });

      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: "INVALID_URL",
            message: "The provided link is invalid."
          }
        });
      }

      return res.status(500).json({
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error"
        }
      });
    }
  };
}
