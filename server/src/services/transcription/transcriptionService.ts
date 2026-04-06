import { promises as fs } from "node:fs";

import type { AudioExtractionService } from "./audioExtractionService.js";
import type { TranscriptionProvider } from "./transcriptionProvider.js";
import { normalizeTranscriptResult } from "./normalizeTranscriptResult.js";
import { validateMediaFile } from "./mediaValidation.js";
import type { TranscriptionResponse } from "../../schemas/transcriptionSchemas.js";
import { ApiError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

export interface UploadedTranscriptionFile {
  path: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface TranscriptionServiceOptions {
  languageHint?: string | null;
}

export interface TranscriptionServiceDependencies {
  transcriptionProvider: TranscriptionProvider;
  audioExtractionService: AudioExtractionService;
}

async function safeUnlink(filePath: string | null | undefined) {
  if (!filePath) {
    return;
  }

  await fs.unlink(filePath).catch((error) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    logger.error("Failed to clean up transcription temp file", {
      filePath,
      error
    });
  });
}

export async function transcribeUploadedFile(
  file: UploadedTranscriptionFile | undefined,
  options: TranscriptionServiceOptions,
  dependencies: TranscriptionServiceDependencies
): Promise<TranscriptionResponse> {
  if (!file) {
    throw new ApiError("INVALID_UPLOAD", "A single audio or video file is required", 400);
  }

  const validated = validateMediaFile(file.originalname, file.mimetype);

  if (!validated) {
    throw new ApiError("UNSUPPORTED_FILE_FORMAT", "The uploaded file format is not supported", 415);
  }

  const cleanupTargets = [file.path];
  let transcriptionPath = file.path;
  let transcriptionMimeType = validated.normalizedMimeType;

  try {
    if (validated.sourceType === "video") {
      const extractedAudio = await dependencies.audioExtractionService.extractAudio({
        sourcePath: file.path
      });
      cleanupTargets.push(extractedAudio.outputPath);
      transcriptionPath = extractedAudio.outputPath;
      transcriptionMimeType = extractedAudio.mimeType;
    }

    const providerOutput = await dependencies.transcriptionProvider.transcribe({
      filePath: transcriptionPath,
      mimeType: transcriptionMimeType,
      fileName: file.originalname,
      sourceType: validated.sourceType,
      languageHint: options.languageHint
    });

    return normalizeTranscriptResult({
      sourceType: validated.sourceType,
      fileMeta: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      },
      providerName: dependencies.transcriptionProvider.name,
      languageHint: options.languageHint,
      providerOutput: {
        ...providerOutput,
        warnings: [
          ...providerOutput.warnings,
          `Provider: ${dependencies.transcriptionProvider.name}`
        ]
      }
    });
  } finally {
    await Promise.all(cleanupTargets.map((target) => safeUnlink(target)));
  }
}
