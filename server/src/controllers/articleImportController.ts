import type { Request, Response } from "express";
import { ZodError } from "zod";

import { importArticleContent } from "../services/articleImportService.js";

export async function articleImportController(req: Request, res: Response) {
  try {
    const data = await importArticleContent(req.body);

    return res.json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
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
}
