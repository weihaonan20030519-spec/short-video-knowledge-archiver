import type { AppLanguage } from "../../types/domain";
import type { TranscriptionResponse } from "../../types/api";
import { getMessages } from "../../lib/i18n";
import type { UploadUiStatus } from "./transcriptionTypes";

export type TranscriptionPhase =
  | "uploaded"
  | "preprocessing"
  | "transcribing"
  | "transcript_ready"
  | "ai_processing"
  | "completed"
  | "failed";

export type TranscriptionFailureStage =
  | "upload"
  | "preprocessing"
  | "transcription"
  | "unknown";

export function getTerminalUploadUiStatus(response: TranscriptionResponse): Exclude<UploadUiStatus, "idle" | "uploading" | "processing"> {
  if (response.success) {
    return response.data.phase === "transcript_ready" ? "success" : "failed";
  }

  if (response.error.code === "TRANSCRIPTION_TIMEOUT") {
    return "timeout";
  }

  if (response.error.code === "FILE_TOO_LARGE") {
    return "too_large";
  }

  return "failed";
}

export function getFailureStageLabel(
  language: AppLanguage,
  failureStage: TranscriptionFailureStage | null | undefined
) {
  if (!failureStage) {
    return null;
  }

  return getMessages(language).modals.failureStageLabel[failureStage];
}
