import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

import type { ArticleOcrProvider, ArticleOcrRequest, ArticleOcrResult, ArticleOcrImageResult } from "./articleOcrProvider.js";
import type { ArticleImportWarning, ArticleImportWarningCode } from "../../schemas/articleImportSchemas.js";
import { env, requireGeminiKey } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { fetchImageAsBase64 } from "./imageFetchHelper.js";

const MAX_OCR_ATTEMPTS_PER_IMAGE = 2;
const SOFT_RATE_LIMIT_RETRY_DELAY_MS = 10_000;
const SERVICE_UNAVAILABLE_RETRY_DELAY_MS = 3_000;
const MAX_PROVIDER_RETRY_DELAY_MS = 30_000;
const MAX_INTERACTIVE_SOFT_RATE_LIMIT_DELAY_MS = 5_000;
const MAX_CONSECUTIVE_RETRYABLE_FAILURES = 2;

type RateLimitKind = "hard_quota" | "soft_rate_limit" | null;

function normalizeWhitespace(input?: string | null) {
  return input?.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
}

function createWarning(code: ArticleImportWarningCode, message: string): ArticleImportWarning {
  return { code, message };
}

function getImageHost(imageUrl: string) {
  try {
    return new URL(imageUrl).hostname;
  } catch {
    return null;
  }
}

function getImageFetchMeta(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      imageHost: null as string | null,
      mimeType: null as string | null,
      contentLength: null as number | null
    };
  }

  const candidate = error as {
    imageHost?: unknown;
    mimeType?: unknown;
    imageUrl?: unknown;
    contentLength?: unknown;
  };

  const imageHost =
    typeof candidate.imageHost === "string" && candidate.imageHost.trim()
      ? candidate.imageHost.trim()
      : typeof candidate.imageUrl === "string"
        ? getImageHost(candidate.imageUrl)
        : null;

  return {
    imageHost,
    mimeType: typeof candidate.mimeType === "string" && candidate.mimeType.trim() ? candidate.mimeType.trim() : null,
    contentLength:
      typeof candidate.contentLength === "number" && Number.isFinite(candidate.contentLength)
        ? candidate.contentLength
        : null
  };
}

function countFailureCodes(imageResults: ArticleOcrImageResult[]) {
  return imageResults.reduce<Record<string, number>>((counts, result) => {
    if (!result.succeeded && result.warningCode) {
      counts[result.warningCode] = (counts[result.warningCode] ?? 0) + 1;
    }

    return counts;
  }, {});
}

function findNestedStringValues(value: unknown, accumulator: string[] = []) {
  if (typeof value === "string" && value.trim()) {
    accumulator.push(value);
    return accumulator;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findNestedStringValues(item, accumulator);
    }
    return accumulator;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      findNestedStringValues(nested, accumulator);
    }
  }

  return accumulator;
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
    return "Unknown OCR error";
  }
}

function extractProviderRetryDelayMs(error: unknown): number | null {
  const rawCandidates = [findErrorMessage(error), ...findNestedStringValues(error)];
  const objectCandidate =
    error && typeof error === "object"
      ? (error as { retryDelayMs?: unknown; retryDelay?: unknown; details?: unknown; error?: unknown })
      : null;

  const numericValues = [
    objectCandidate?.retryDelayMs,
    typeof objectCandidate?.retryDelay === "number" ? objectCandidate.retryDelay : null
  ];

  for (const value of numericValues) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  for (const candidate of rawCandidates) {
    const trimmed = candidate.trim();
    const msMatch = trimmed.match(/retryDelay(?:Ms)?["'=:\s]+["']?(\d{2,6})\s*ms["']?/i);
    if (msMatch) {
      return Number(msMatch[1]);
    }

    const secondMatch = trimmed.match(/retryDelay["'=:\s]+["']?(\d+(?:\.\d+)?)\s*s["']?/i);
    if (secondMatch) {
      return Math.round(Number(secondMatch[1]) * 1000);
    }

    const durationMatch = trimmed.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
    if (durationMatch) {
      return Math.round(Number(durationMatch[1]) * 1000);
    }
  }

  return null;
}

function classifyRateLimitKind(error: unknown): RateLimitKind {
  const lowered = [findErrorMessage(error), ...findNestedStringValues(error)].join(" ").toLowerCase();

  if (
    lowered.includes("quota exceeded") ||
    lowered.includes("resource_exhausted") ||
    lowered.includes("quota failure") ||
    lowered.includes("free tier quota")
  ) {
    return "hard_quota";
  }

  if (
    lowered.includes("rate limit") ||
    lowered.includes("too many requests") ||
    lowered.includes("retrydelay")
  ) {
    return "soft_rate_limit";
  }

  return null;
}

function clampRetryDelayMs(delayMs: number) {
  return Math.min(Math.max(delayMs, 1000), MAX_PROVIDER_RETRY_DELAY_MS);
}

function classifyOcrFailure(error: unknown) {
  const status = findErrorStatus(error);
  const message = findErrorMessage(error);
  const lowered = message.toLowerCase();
  const providerRetryDelayMs = extractProviderRetryDelayMs(error);
  const rateLimitKind = status === 429 ? classifyRateLimitKind(error) : null;

  if (
    message === "IMAGE_TOO_LARGE" ||
    message === "IMAGE_UNSUPPORTED_CONTENT_TYPE" ||
    message === "IMAGE_BODY_EMPTY"
  ) {
    return {
      code: "OCR_BAD_REQUEST" as const,
      retryable: false,
      providerRetryDelayMs: null,
      effectiveRetryDelayMs: null,
      rateLimitKind: null,
      shouldAbortBatch: false,
      message:
        message === "IMAGE_TOO_LARGE"
          ? "Image OCR failed because the image input is too large for the current OCR path."
          : message === "IMAGE_UNSUPPORTED_CONTENT_TYPE"
            ? "Image OCR failed because the current image format is not supported by the OCR path."
            : "Image OCR failed because the current image input body is empty."
    };
  }

  if (
    status === 429 ||
    lowered.includes("resource_exhausted") ||
    lowered.includes("quota exceeded") ||
    lowered.includes("rate limit") ||
    lowered.includes("too many requests")
  ) {
    const interactiveDelayAllowed =
      providerRetryDelayMs != null && providerRetryDelayMs <= MAX_INTERACTIVE_SOFT_RATE_LIMIT_DELAY_MS;
    const effectiveRetryDelayMs =
      rateLimitKind === "soft_rate_limit" && interactiveDelayAllowed && providerRetryDelayMs
        ? clampRetryDelayMs(providerRetryDelayMs)
        : null;

    return {
      code: "OCR_RATE_LIMITED" as const,
      retryable: rateLimitKind === "soft_rate_limit" && effectiveRetryDelayMs != null,
      providerRetryDelayMs,
      effectiveRetryDelayMs,
      rateLimitKind,
      shouldAbortBatch: rateLimitKind === "hard_quota" || effectiveRetryDelayMs == null,
      message:
        rateLimitKind === "hard_quota"
          ? "Image OCR hit a Gemini hard quota limit (429 quota exhausted)."
          : rateLimitKind === "soft_rate_limit" && providerRetryDelayMs != null && !interactiveDelayAllowed
            ? "Image OCR hit a Gemini soft rate limit, but the suggested retry delay is too long for this interactive import."
          : "Image OCR was rate limited by Gemini (429 TooManyRequests)."
    };
  }

  if (
    status === 503 ||
    lowered.includes("high demand") ||
    lowered.includes("temporarily unavailable") ||
    lowered.includes("service unavailable")
  ) {
    return {
      code: "OCR_SERVICE_UNAVAILABLE" as const,
      retryable: true,
      providerRetryDelayMs,
      effectiveRetryDelayMs: clampRetryDelayMs(providerRetryDelayMs ?? SERVICE_UNAVAILABLE_RETRY_DELAY_MS),
      rateLimitKind: null,
      shouldAbortBatch: false,
      message: "Image OCR hit a Gemini service availability issue (503 ServiceUnavailable)."
    };
  }

  if (
    status === 400 ||
    lowered.includes("bad request") ||
    lowered.includes("invalid argument") ||
    lowered.includes("unsupported mime") ||
    lowered.includes("unsupported image")
  ) {
    return {
      code: "OCR_BAD_REQUEST" as const,
      retryable: false,
      providerRetryDelayMs: null,
      effectiveRetryDelayMs: null,
      rateLimitKind: null,
      shouldAbortBatch: false,
      message: "Image OCR was rejected because the current image input was not accepted (400 BadRequest)."
    };
  }

  if (
    message === "IMAGE_URL_BLOCKED" ||
    message === "IMAGE_FETCH_FAILED" ||
    message === "IMAGE_TOO_MANY_REDIRECTS" ||
    message === "IMAGE_REDIRECT_WITHOUT_LOCATION"
  ) {
    return {
      code: "OCR_UNKNOWN_ERROR" as const,
      retryable: false,
      providerRetryDelayMs: null,
      effectiveRetryDelayMs: null,
      rateLimitKind: null,
      shouldAbortBatch: false,
      message:
        message === "IMAGE_URL_BLOCKED"
          ? "Image OCR could not fetch the image because the URL was blocked."
          : message === "IMAGE_FETCH_FAILED"
            ? "Image OCR could not fetch the image content."
            : message === "IMAGE_TOO_MANY_REDIRECTS"
              ? "Image OCR could not fetch the image because the URL redirected too many times."
              : "Image OCR could not fetch the image because the redirect response was invalid."
    };
  }

  return {
    code: "OCR_UNKNOWN_ERROR" as const,
    retryable: false,
    providerRetryDelayMs: null,
    effectiveRetryDelayMs: null,
    rateLimitKind: null,
    shouldAbortBatch: false,
    message: `Image OCR failed because of an unexpected provider error: ${message}.`
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class GeminiArticleOcrProvider implements ArticleOcrProvider {
  readonly providerAvailable = true;

  async extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult> {
    const client = new GoogleGenAI({ apiKey: requireGeminiKey("transcription") });
    const imageResults: ArticleOcrImageResult[] = [];
    const warnings: ArticleImportWarning[] = [];
    const ocrRunId = randomUUID();
    let earlyStopped = false;
    let earlyStopAt: number | null = null;
    let earlyStopReason: ArticleImportWarningCode | null = null;
    let consecutiveRetryableFailures = 0;

    logger.info("OCR run started", {
      ocrRunId,
      platform: request.platform,
      originalUrl: request.originalUrl,
      resolvedUrl: request.resolvedUrl ?? null,
      discoveredImageCount: request.discoveredImageCount ?? request.images.length,
      candidateCount: request.images.length
    });

    for (const image of request.images) {
      const ordinal = imageResults.length + 1;
      let imagePayload: { base64: string; mimeType: string } | null = null;

      for (let attempt = 1; attempt <= MAX_OCR_ATTEMPTS_PER_IMAGE; attempt += 1) {
        try {
          imagePayload = await fetchImageAsBase64(image.url);

          const prompt = [
            "Extract only the visible text from the image below.",
            "Do not summarize, translate, or add commentary.",
            request.originalUrl ? `Source page: ${request.originalUrl}` : "Source page: unknown",
            request.resolvedUrl ? `Resolved URL: ${request.resolvedUrl}` : "Resolved URL: unknown",
            "Return only the extracted text in plain form."
          ].join("\n");

          const contents = [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imagePayload.mimeType,
                    data: imagePayload.base64
                  }
                }
              ]
            }
          ];

          const result = await client.models.generateContent({
            model: env.ARTICLE_OCR_MODEL,
            contents,
            config: {
              temperature: 0,
              responseMimeType: "text/plain"
            }
          });

          const imageText = normalizeWhitespace(result.text);

          consecutiveRetryableFailures = 0;

          if (imageText) {
            imageResults.push({
              ordinal,
              imageUrl: image.url,
              source: image.source,
              succeeded: true,
              text: imageText
            });
          } else {
            const warningMessage = `Image OCR succeeded for ${image.url} but no text was detected.`;
            imageResults.push({
              ordinal,
              imageUrl: image.url,
              source: image.source,
              succeeded: false,
              text: null,
              warningCode: "OCR_NO_TEXT_DETECTED",
              warningMessage
            });
            warnings.push(createWarning("OCR_NO_TEXT_DETECTED", warningMessage));
          }
          break;
        } catch (error: unknown) {
          const failure = classifyOcrFailure(error);
          const fetchMeta = getImageFetchMeta(error);
          const isLastAttempt = attempt >= MAX_OCR_ATTEMPTS_PER_IMAGE;

          if (failure.retryable && !isLastAttempt) {
            const retryInMs = failure.effectiveRetryDelayMs ?? SOFT_RATE_LIMIT_RETRY_DELAY_MS;
            logger.info("OCR image retry scheduled", {
              ocrRunId,
              imageOrdinal: ordinal,
              imageUrl: image.url,
              imageHost: fetchMeta.imageHost ?? getImageHost(image.url),
              imageSource: image.source,
              mimeType: imagePayload?.mimeType ?? fetchMeta.mimeType,
              contentLength: fetchMeta.contentLength,
              status: findErrorStatus(error),
              warningCode: failure.code,
              rateLimitKind: failure.rateLimitKind,
              providerRetryDelayMs: failure.providerRetryDelayMs,
              effectiveRetryDelayMs: retryInMs,
              shouldAbortBatch: failure.shouldAbortBatch,
              attempt,
              maxAttempts: MAX_OCR_ATTEMPTS_PER_IMAGE,
              retryInMs,
              errorMessage: findErrorMessage(error)
            });
            if (retryInMs > 0) {
              await sleep(retryInMs);
            }
            continue;
          }

          consecutiveRetryableFailures = failure.retryable ? consecutiveRetryableFailures + 1 : 0;
          const shouldStopRemaining =
            failure.shouldAbortBatch || (failure.retryable && consecutiveRetryableFailures >= MAX_CONSECUTIVE_RETRYABLE_FAILURES);
          const warningMessage = shouldStopRemaining
            ? `${failure.message} OCR was stopped for the remaining images in this import.`
            : failure.message;

          logger.info("OCR image failed", {
            ocrRunId,
            imageOrdinal: ordinal,
            imageUrl: image.url,
            imageHost: fetchMeta.imageHost ?? getImageHost(image.url),
            imageSource: image.source,
            mimeType: imagePayload?.mimeType ?? fetchMeta.mimeType,
            contentLength: fetchMeta.contentLength,
            status: findErrorStatus(error),
            warningCode: failure.code,
            retryable: failure.retryable,
            rateLimitKind: failure.rateLimitKind,
            providerRetryDelayMs: failure.providerRetryDelayMs,
            effectiveRetryDelayMs: failure.effectiveRetryDelayMs,
            shouldAbortBatch: failure.shouldAbortBatch,
            attempt,
            maxAttempts: MAX_OCR_ATTEMPTS_PER_IMAGE,
            stopRemaining: shouldStopRemaining,
            errorMessage: findErrorMessage(error)
          });
          imageResults.push({
            ordinal,
            imageUrl: image.url,
            source: image.source,
            succeeded: false,
            text: null,
            warningCode: failure.code,
            warningMessage
          });
          warnings.push(createWarning(failure.code, warningMessage));

          if (shouldStopRemaining) {
            earlyStopped = true;
            earlyStopAt = ordinal;
            earlyStopReason = failure.code;
          }

          break;
        }
      }

      if (earlyStopped) {
        break;
      }
    }

    const successfulImageText = imageResults
      .filter((result) => result.succeeded && result.text)
      .map((result) => `[Image OCR ${result.ordinal}]\n${result.text}`);
    const recognizedText = successfulImageText.length > 0 ? successfulImageText.join("\n\n") : null;
    const recognizedTextLength = recognizedText?.length ?? 0;
    const succeededCount = imageResults.filter((result) => result.succeeded).length;
    const remainingImagesSkipped = Math.max(0, request.images.length - imageResults.length);
    const errorCounts = countFailureCodes(imageResults);

    logger.info("OCR run completed", {
      ocrRunId,
      platform: request.platform,
      originalUrl: request.originalUrl,
      resolvedUrl: request.resolvedUrl ?? null,
      candidateCount: request.images.length,
      attemptedCount: imageResults.length,
      succeededCount,
      recognizedTextLength,
      earlyStopped,
      earlyStopAt,
      earlyStopReason,
      remainingImagesSkipped,
      errorCounts
    });

    return {
      attempted: imageResults.length,
      providerAvailable: true,
      succeededCount,
      recognizedText,
      recognizedTextLength,
      warnings,
      imageResults,
      runMeta: {
        discoveredImageCount: request.discoveredImageCount ?? request.images.length,
        candidateCount: request.images.length,
        attemptedCount: imageResults.length,
        remainingImagesSkipped,
        earlyStopped,
        earlyStopReason,
        errorCounts
      }
    };
  }
}
