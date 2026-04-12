import type { TranscriptionFailureResponse, TranscriptionSuccessResponse } from "../../types/api";
import type { ClientTranscriptionError, ClientTranscriptionResult } from "./transcriptionTypes";

export function buildClientTranscriptionResult(
  response: TranscriptionSuccessResponse
): ClientTranscriptionResult {
  return {
    phase: response.data.phase,
    sourceType: response.data.sourceType,
    suggestedTitle: response.data.suggestedTitle,
    transcriptText: response.data.transcriptText,
    transcriptionStatus: response.data.transcriptionStatus,
    transcriptMeta: {
      fileName: response.data.fileMeta.fileName,
      mimeType: response.data.fileMeta.mimeType,
      size: response.data.fileMeta.size,
      duration: response.data.fileMeta.duration,
      language: response.data.language ?? null,
      segments: response.data.segments,
      timestamps: response.data.timestamps,
      provider: "gemini",
      transcriptionModelUsed:
        response.data.transcriptionModelUsed || response.data.fileMeta.transcriptionModelUsed || null,
      transcriptionModelAttempts:
        response.data.transcriptionModelAttempts || response.data.fileMeta.transcriptionModelAttempts,
      warnings: response.data.warnings
    },
    transcriptionModelUsed:
      response.data.transcriptionModelUsed || response.data.fileMeta.transcriptionModelUsed || null,
    transcriptionModelAttempts:
      response.data.transcriptionModelAttempts || response.data.fileMeta.transcriptionModelAttempts,
    warnings: response.data.warnings
  };
}

export function buildClientTranscriptionError(
  response: TranscriptionFailureResponse
): ClientTranscriptionError {
  return {
    code: response.error.code,
    message: response.error.message,
    phase: response.meta?.phase,
    failureStage: response.meta?.failureStage,
    transcriptionModelUsed: response.meta?.transcriptionModelUsed || null,
    transcriptionModelAttempts: response.meta?.transcriptionModelAttempts
  };
}
