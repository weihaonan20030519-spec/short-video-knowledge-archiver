import { promises as fs } from "node:fs";

import type { AudioExtractionService } from "./audioExtractionService.js";
import {
  preprocessMediaFile,
  type MediaMetadataProbe
} from "./mediaPreprocessingService.js";
import type { TranscriptionProvider } from "./transcriptionProvider.js";
import { normalizeTranscriptResult } from "./normalizeTranscriptResult.js";
import { validateMediaFile } from "./mediaValidation.js";
import type { TranscriptionResponse } from "../../schemas/transcriptionSchemas.js";
import { ApiError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import type { TranscriptionFailureStage, TranscriptionPhase } from "./transcriptionPhases.js";

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
  probeMediaMetadata?: MediaMetadataProbe;
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

function attachFailureStage(error: unknown, failureStage: TranscriptionFailureStage) {
  if (error instanceof ApiError) {
    return new ApiError(error.code, error.message, error.status, {
      ...error.details,
      failureStage
    });
  }

  return new ApiError("INTERNAL_ERROR", "Internal server error", 500, {
    failureStage
  });
}

export async function transcribeUploadedFile(
  file: UploadedTranscriptionFile | undefined,
  options: TranscriptionServiceOptions,
  dependencies: TranscriptionServiceDependencies
): Promise<TranscriptionResponse> {
  if (!file) {
    throw new ApiError("INVALID_UPLOAD", "A single audio or video file is required", 400, {
      phase: "failed" satisfies TranscriptionPhase,
      failureStage: "upload" satisfies TranscriptionFailureStage
    });
  }

  const validated = validateMediaFile(file.originalname, file.mimetype);

  if (!validated) {
    throw new ApiError("UNSUPPORTED_FILE_FORMAT", "The uploaded file format is not supported", 415, {
      phase: "failed" satisfies TranscriptionPhase,
      failureStage: "upload" satisfies TranscriptionFailureStage
    });
  }

  const cleanupTargets = [file.path];

  try {
    const preprocessingResult = await preprocessMediaFile(
      {
        filePath: file.path,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        validatedMedia: validated
      },
      {
        audioExtractionService: dependencies.audioExtractionService,
        probeMediaMetadata: dependencies.probeMediaMetadata
      }
    ).catch((error) => {
      throw attachFailureStage(error, "preprocessing");
    });

    cleanupTargets.push(...preprocessingResult.cleanupPaths);

    const providerInput = {
      filePath: preprocessingResult.transcriptionInput.filePath,
      mimeType: preprocessingResult.transcriptionInput.mimeType,
      fileName: file.originalname,
      sourceType: validated.sourceType,
      languageHint: options.languageHint
    } as const;

    const providerOutput = await dependencies.transcriptionProvider.transcribe(providerInput).catch((error) => {
      logger.error("Transcription provider failed", {
        provider: dependencies.transcriptionProvider.name,
        fileMeta: {
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        },
        preprocessing: {
          sourceType: validated.sourceType,
          originalMimeType: file.mimetype,
          normalizedMimeType: preprocessingResult.transcriptionInput.mimeType,
          derivedFrom: preprocessingResult.transcriptionInput.derivedFrom,
          transcriptionInputPath: providerInput.filePath
        },
        rawError: error
      });
      throw attachFailureStage(error, "transcription");
    });

    return normalizeTranscriptResult({
      sourceType: validated.sourceType,
      fileMeta: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        duration: preprocessingResult.mediaMetadata.duration
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
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(error.code, error.message, error.status, {
        ...error.details,
        phase: "failed" satisfies TranscriptionPhase,
        failureStage:
          (error.details?.failureStage as TranscriptionFailureStage | undefined) || "unknown"
      });
    }

    throw new ApiError("INTERNAL_ERROR", "Internal server error", 500, {
      phase: "failed" satisfies TranscriptionPhase,
      failureStage: "unknown" satisfies TranscriptionFailureStage
    });
  } finally {
    await Promise.all(cleanupTargets.map((target) => safeUnlink(target)));
  }
}
