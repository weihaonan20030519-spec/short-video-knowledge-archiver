export type AnalyzeErrorCode =
  | "RAW_TEXT_REQUIRED"
  | "TEXT_TOO_SHORT"
  | "AI_RESPONSE_INVALID"
  | "AI_REQUEST_FAILED"
  | "INVALID_UPLOAD"
  | "UNSUPPORTED_FILE_FORMAT"
  | "FILE_TOO_LARGE"
  | "AUDIO_EXTRACTION_FAILED"
  | "TRANSCRIPTION_TIMEOUT"
  | "TRANSCRIPTION_FAILED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  code: AnalyzeErrorCode;
  status: number;

  constructor(code: AnalyzeErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function createErrorResponse(
  code: AnalyzeErrorCode,
  message: string,
  meta: { mode: "concise" | "learning"; generatedAt: string }
) {
  return {
    success: false as const,
    data: null,
    error: {
      code,
      message
    },
    meta
  };
}
