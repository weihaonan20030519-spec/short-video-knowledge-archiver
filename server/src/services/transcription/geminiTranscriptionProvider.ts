import { GoogleGenAI, FileState, createPartFromText, createPartFromUri } from "@google/genai";

import type { TranscriptionProvider, TranscriptionProviderInput } from "./transcriptionProvider.js";
import { transcriptionProviderOutputSchema } from "../../schemas/transcriptionSchemas.js";
import { ApiError } from "../../utils/errors.js";
import { env, requireGeminiKey } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";

function buildTranscriptionPrompt(languageHint?: string | null) {
  return [
    "You are transcribing a user-uploaded audio or video file into clean readable text.",
    "Return JSON only.",
    'Use this JSON shape: {"transcriptText":"string","language":"string|null","warnings":["string"],"segments":[{"startMs":0,"endMs":0,"text":"string"}],"timestamps":[{"startMs":0,"endMs":0,"label":"string"}]}',
    "Requirements:",
    "- transcriptText must be the full transcript in plain text",
    "- language should be a BCP-47 or ISO-style language code when confidently known, otherwise null",
    "- warnings should be an array of short strings only when something is uncertain",
    "- segments and timestamps are optional; omit them if they are not reliable",
    "- do not summarize, translate, or reorganize the content",
    "- if the transcript is in Chinese, output Simplified Chinese characters consistently",
    languageHint ? `Language hint: ${languageHint}` : "Language hint: none"
  ].join("\n");
}

async function waitForUploadedFile(client: GoogleGenAI, fileName: string) {
  const deadline = Date.now() + env.TRANSCRIPTION_FILE_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    let uploaded;
    try {
      uploaded = await client.files.get({ name: fileName });
    } catch (error) {
      throw mapGeminiTranscriptionError(error, "Gemini file status lookup failed", 502);
    }
    if (uploaded.state === FileState.ACTIVE || uploaded.state == null) {
      return uploaded;
    }

    if (uploaded.state === FileState.FAILED) {
      throw new ApiError(
        "TRANSCRIPTION_FAILED",
        uploaded.error?.message || "The uploaded file failed during Gemini processing",
        502
      );
    }

    await new Promise((resolve) => {
      setTimeout(resolve, env.TRANSCRIPTION_FILE_READY_POLL_INTERVAL_MS);
    });
  }

  // TRANSCRIPTION_TIMEOUT is intentionally limited to the Gemini uploaded-file
  // ready/active wait stage. It does not represent the entire transcription pipeline timing out.
  throw new ApiError("TRANSCRIPTION_TIMEOUT", "Timed out waiting for Gemini file processing", 504);
}

function findErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };

  const values = [candidate.status, candidate.code, candidate.response?.status];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && /^\d+$/.test(value)) {
      return Number(value);
    }
  }

  return null;
}

function findErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Gemini transcription error";
  }
}

function isQuotaExceededError(error: unknown) {
  const status = findErrorStatus(error);
  const message = findErrorMessage(error).toLowerCase();

  return (
    status === 429 ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

function mapGeminiTranscriptionError(error: unknown, fallbackMessage: string, fallbackStatus = 502): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isQuotaExceededError(error)) {
    return new ApiError(
      "TRANSCRIPTION_QUOTA_EXCEEDED",
      "Gemini transcription quota exceeded",
      429
    );
  }

  return new ApiError(
    "TRANSCRIPTION_FAILED",
    error instanceof Error ? error.message : fallbackMessage,
    fallbackStatus
  );
}

function parseTranscriptionPayload(content: string) {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    return JSON.parse(normalized);
  } catch {
    throw new ApiError("TRANSCRIPTION_FAILED", "Gemini returned invalid transcription JSON", 502);
  }
}

type GeminiResponseLike = {
  text?: string;
  candidates?: Array<{
    finishReason?: string;
    finishMessage?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  responseId?: string;
  modelVersion?: string;
  usageMetadata?: unknown;
  promptFeedback?: unknown;
};

function extractTranscriptTextFromResponse(response: GeminiResponseLike) {
  const directText = response.text?.trim();
  if (directText) {
    return directText;
  }

  const candidateTexts =
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text?.trim() || "")
      .filter(Boolean) || [];

  if (candidateTexts.length) {
    return candidateTexts.join("\n").trim();
  }

  return "";
}

function buildEmptyResponseDebugMeta(response: GeminiResponseLike, uploadedFileName: string, uploadedFileUri?: string | null) {
  const candidates = response.candidates || [];
  const textPartCount = candidates.reduce((count, candidate) => {
    const parts = candidate.content?.parts || [];
    return count + parts.filter((part) => typeof part.text === "string" && part.text.trim()).length;
  }, 0);

  return {
    model: env.GEMINI_MODEL_TRANSCRIPTION,
    uploadedFileName,
    uploadedFileUriSuffix: uploadedFileUri ? uploadedFileUri.split("/").slice(-2).join("/") : null,
    responseId: response.responseId || null,
    modelVersion: response.modelVersion || null,
    candidateCount: candidates.length,
    hasDirectText: Boolean(response.text?.trim()),
    textPartCount,
    finishReasons: candidates.map((candidate) => candidate.finishReason || null),
    finishMessages: candidates.map((candidate) => candidate.finishMessage || null),
    hasUsageMetadata: Boolean(response.usageMetadata),
    hasPromptFeedback: Boolean(response.promptFeedback)
  };
}

function buildModelAttemptMeta(modelAttempts: string[]) {
  const attempts = modelAttempts.filter(Boolean);
  return {
    transcriptionModelUsed: attempts.at(-1) || undefined,
    transcriptionModelAttempts: attempts.length ? attempts : undefined
  };
}

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  readonly name = "gemini";

  async transcribe(input: TranscriptionProviderInput) {
    const client = new GoogleGenAI({
      apiKey: requireGeminiKey("transcription")
    });

    let uploadedFile;
    try {
      uploadedFile = await client.files.upload({
        file: input.filePath,
        config: {
          mimeType: input.mimeType
        }
      });
    } catch (error) {
      throw mapGeminiTranscriptionError(error, "Gemini file upload failed", 502);
    }

    try {
      const readyFile = await waitForUploadedFile(client, uploadedFile.name || "");

      if (!readyFile.uri || !readyFile.mimeType) {
        throw new ApiError("TRANSCRIPTION_FAILED", "Gemini did not return a usable media file URI", 502);
      }

      let content = "";
      const modelAttempts: string[] = [];

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        modelAttempts.push(env.GEMINI_MODEL_TRANSCRIPTION);
        const response = await client.models
          .generateContent({
            model: env.GEMINI_MODEL_TRANSCRIPTION,
            contents: [
              {
                role: "user",
                parts: [
                  createPartFromText(buildTranscriptionPrompt(input.languageHint)),
                  createPartFromUri(readyFile.uri, readyFile.mimeType)
                ]
              }
            ],
            config: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
          .catch((error) => {
            throw mapGeminiTranscriptionError(error, "Gemini transcription failed", 502);
          });

        content = extractTranscriptTextFromResponse(response);

        if (content) {
          break;
        }

        logger.error("Gemini transcription returned an empty response", {
          attempt,
          maxAttempts: 2,
          ...buildEmptyResponseDebugMeta(response, uploadedFile.name || "", readyFile.uri)
        });
      }

      if (!content) {
        throw new ApiError(
          "TRANSCRIPTION_FAILED",
          "Gemini returned an empty transcription response",
          502,
          buildModelAttemptMeta(modelAttempts)
        );
      }

      const parsed = transcriptionProviderOutputSchema.safeParse(parseTranscriptionPayload(content));

      if (!parsed.success) {
        throw new ApiError(
          "TRANSCRIPTION_FAILED",
          "Gemini transcription response was invalid",
          502,
          buildModelAttemptMeta(modelAttempts)
        );
      }

      return {
        ...parsed.data,
        transcriptionModelUsed: parsed.data.transcriptionModelUsed || modelAttempts.at(-1),
        transcriptionModelAttempts:
          parsed.data.transcriptionModelAttempts?.length ? parsed.data.transcriptionModelAttempts : modelAttempts
      };
    } finally {
      if (uploadedFile.name) {
        await client.files.delete({ name: uploadedFile.name }).catch((error) => {
          logger.error("Failed to delete Gemini transcription file", {
            fileName: uploadedFile.name,
            error
          });
        });
      }
    }
  }
}
