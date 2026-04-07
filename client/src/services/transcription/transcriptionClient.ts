import type { TranscriptionResponse } from "../../types/api";
import { getApiBaseUrl } from "../apiBaseUrl";
import type { TranscriptionRequestCallbacks } from "./transcriptionTypes";

const API_BASE_URL = getApiBaseUrl();

function parseResponseText(text: string, status: number): TranscriptionResponse {
  if (text) {
    try {
      return JSON.parse(text) as TranscriptionResponse;
    } catch {
      // Fall through to a stable synthetic error payload below.
    }
  }

  return {
    success: false,
    data: null,
    error: {
      code:
        status === 504
          ? "TRANSCRIPTION_TIMEOUT"
          : status === 429
            ? "TRANSCRIPTION_QUOTA_EXCEEDED"
            : "INTERNAL_ERROR",
      message:
        status === 504
          ? "Processing timed out"
          : status === 429
            ? "Transcription quota exceeded"
            : "Internal server error"
    },
    meta: {
      phase: "failed",
      failureStage: status === 504 || status === 429 ? "transcription" : "unknown"
    }
  };
}

export async function transcribeFile(
  file: File,
  languageHint?: string,
  callbacks?: TranscriptionRequestCallbacks
) {
  const formData = new FormData();
  formData.set("file", file);

  if (languageHint) {
    formData.set("languageHint", languageHint);
  }

  return await new Promise<TranscriptionResponse>((resolve) => {
    const xhr = new XMLHttpRequest();
    let uploadStartedNotified = false;
    let uploadCompleteNotified = false;

    const notifyUploadStarted = () => {
      if (uploadStartedNotified) {
        return;
      }

      uploadStartedNotified = true;
      callbacks?.onUploadStarted?.();
    };

    const notifyUploadComplete = () => {
      if (uploadCompleteNotified) {
        return;
      }

      uploadCompleteNotified = true;
      callbacks?.onUploadComplete?.();
    };

    xhr.open("POST", `${API_BASE_URL}/api/transcribe/file`);

    xhr.upload.onloadstart = () => {
      notifyUploadStarted();
    };

    xhr.upload.onloadend = () => {
      notifyUploadComplete();
    };

    xhr.onerror = () => {
      notifyUploadComplete();
      resolve({
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Network error"
        },
        meta: {
          phase: "failed",
          failureStage: "upload"
        }
      });
    };

    xhr.onabort = () => {
      resolve({
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Request aborted"
        },
        meta: {
          phase: "failed",
          failureStage: "upload"
        }
      });
    };

    xhr.onload = () => {
      notifyUploadComplete();
      resolve(parseResponseText(xhr.responseText, xhr.status));
    };

    notifyUploadStarted();
    xhr.send(formData);
  });
}
