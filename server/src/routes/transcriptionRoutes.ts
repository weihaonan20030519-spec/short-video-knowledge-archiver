import { Router } from "express";
import multer from "multer";
import { tmpdir } from "node:os";

import type { AudioExtractionService } from "../services/transcription/audioExtractionService.js";
import type { TranscriptionProvider } from "../services/transcription/transcriptionProvider.js";
import { createTranscriptionController } from "../controllers/transcriptionController.js";
import { env } from "../utils/env.js";

const upload = multer({
  dest: tmpdir(),
  limits: {
    files: 1,
    fileSize: env.TRANSCRIPTION_MAX_FILE_SIZE_MB * 1024 * 1024
  }
});

export function createTranscriptionRoutes(options: {
  transcriptionProvider: TranscriptionProvider;
  audioExtractionService: AudioExtractionService;
}) {
  const transcriptionRoutes = Router();

  transcriptionRoutes.post(
    "/transcribe/file",
    upload.single("file"),
    createTranscriptionController(options)
  );

  return transcriptionRoutes;
}
