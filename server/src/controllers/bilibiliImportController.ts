import type { Request, Response } from "express";

import { importBilibiliTranscript, BilibiliImportError } from "../services/bilibiliImportService.js";

export async function bilibiliImportController(req: Request, res: Response) {
  try {
    const data = await importBilibiliTranscript(req.body);

    return res.json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    if (error instanceof BilibiliImportError) {
      return res.status(error.status).json({
        success: false,
        data: error.data,
        error: {
          code: error.code,
          message: error.message
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
