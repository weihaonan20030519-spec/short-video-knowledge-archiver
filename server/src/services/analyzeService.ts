import {
  analyzeRequestSchema,
  type AnalyzeRequest
} from "../schemas/analyzeSchemas.js";
import type { AnalysisProvider } from "./transcription/analysisProvider.js";
import { ApiError } from "../utils/errors.js";
import { env } from "../utils/env.js";

function sanitizeRawText(rawText: string) {
  return rawText.replace(/\s+/g, " ").trim();
}

function getAnalyzeErrorMessage(
  code: "RAW_TEXT_REQUIRED" | "TEXT_TOO_SHORT",
  language: AnalyzeRequest["appLanguage"],
  minRawTextLength: number
) {
  if (language === "en") {
    if (code === "RAW_TEXT_REQUIRED") {
      return "Source content is required";
    }

    return `Source content is too short. Provide at least ${minRawTextLength} characters`;
  }

  if (code === "RAW_TEXT_REQUIRED") {
    return "原始内容不能为空";
  }

  return `原始内容过短，至少需要 ${minRawTextLength} 个字符`;
}

export function prepareAnalyzeInput(payload: unknown, minRawTextLength = env.MIN_RAW_TEXT_LENGTH) {
  const parsed = analyzeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError("INTERNAL_ERROR", "Invalid request payload", 400);
  }

  const input: AnalyzeRequest = {
    ...parsed.data,
    rawText: sanitizeRawText(parsed.data.rawText)
  };

  if (!input.rawText) {
    throw new ApiError(
      "RAW_TEXT_REQUIRED",
      getAnalyzeErrorMessage("RAW_TEXT_REQUIRED", input.appLanguage, minRawTextLength),
      400
    );
  }

  if (input.rawText.length < minRawTextLength) {
    throw new ApiError(
      "TEXT_TOO_SHORT",
      getAnalyzeErrorMessage("TEXT_TOO_SHORT", input.appLanguage, minRawTextLength),
      400
    );
  }

  return input;
}

export async function analyzeContent(payload: unknown, provider: AnalysisProvider) {
  const input = prepareAnalyzeInput(payload);
  return provider.analyze(input);
}
