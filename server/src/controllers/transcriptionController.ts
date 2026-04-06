import type { Request, Response } from "express";

import type { AudioExtractionService } from "../services/transcription/audioExtractionService.js";
import type { TranscriptionProvider } from "../services/transcription/transcriptionProvider.js";
import { transcribeUploadedFile } from "../services/transcription/transcriptionService.js";
import { ApiError } from "../utils/errors.js";

interface CreateTranscriptionControllerOptions {
  transcriptionProvider: TranscriptionProvider;
  audioExtractionService: AudioExtractionService;
}

export function createTranscriptionController(options: CreateTranscriptionControllerOptions) {
  return async function transcriptionController(req: Request, res: Response) {
    try {
      const data = await transcribeUploadedFile(
        req.file,
        {
          languageHint:
            typeof req.body?.languageHint === "string" ? req.body.languageHint : undefined
        },
        {
          transcriptionProvider: options.transcriptionProvider,
          audioExtractionService: options.audioExtractionService
        }
      );

      return res.json({
        success: true,
        data,
        error: null
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({
          success: false,
          data: null,
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
  };
}
