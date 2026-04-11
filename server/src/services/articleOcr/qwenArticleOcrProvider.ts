import { randomUUID } from "node:crypto";

import type { ArticleOcrProvider, ArticleOcrRequest, ArticleOcrResult, ArticleOcrImageResult } from "./articleOcrProvider.js";
import type { ArticleImportWarning, ArticleImportWarningCode } from "../../schemas/articleImportSchemas.js";
import { env, resolveDashscopeBaseUrl } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";

const MAX_OCR_ATTEMPTS_PER_IMAGE = 2;
const SERVICE_UNAVAILABLE_RETRY_DELAY_MS = 3_000;
const MAX_INTERACTIVE_SOFT_RATE_LIMIT_DELAY_MS = 5_000;

type RateLimitKind = "hard_quota" | "soft_rate_limit" | null;

interface QwenArticleOcrProviderDependencies {
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
  fetcher?: typeof fetch;
}

interface QwenFailure {
  code: ArticleImportWarningCode;
  retryable: boolean;
  providerRetryDelayMs: number | null;
  effectiveRetryDelayMs: number | null;
  rateLimitKind: RateLimitKind;
  shouldAbortBatch: boolean;
  message: string;
}

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

  if (error && typeof error === "object") {
    const candidate = error as {
      retryAfterMs?: unknown;
      retryDelayMs?: unknown;
      retryDelay?: unknown;
    };
    const numericValues = [candidate.retryAfterMs, candidate.retryDelayMs, candidate.retryDelay];
    for (const value of numericValues) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  for (const candidate of rawCandidates) {
    const trimmed = candidate.trim();
    const msMatch = trimmed.match(/retry(?:Delay|After)(?:Ms)?["'=:\s]+["']?(\d{2,6})\s*ms["']?/i);
    if (msMatch) {
      return Number(msMatch[1]);
    }

    const secondMatch = trimmed.match(/retry(?:Delay|After)["'=:\s]+["']?(\d+(?:\.\d+)?)\s*s["']?/i);
    if (secondMatch) {
      return Math.round(Number(secondMatch[1]) * 1000);
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
    lowered.includes("retryafter") ||
    lowered.includes("retrydelay")
  ) {
    return "soft_rate_limit";
  }

  return null;
}

function tryExtractTextFromJsonString(rawText: string) {
  try {
    const parsed = JSON.parse(rawText) as unknown;

    if (typeof parsed === "string") {
      return parsed;
    }

    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string").join("\n");
    }

    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      for (const key of ["text", "content", "ocr_text", "result"]) {
        if (typeof candidate[key] === "string") {
          return candidate[key] as string;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeQwenOcrText(rawText?: string | null) {
  const normalized = normalizeWhitespace(rawText);
  if (!normalized) {
    return null;
  }

  const withoutFence = normalized.replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const fromJson = tryExtractTextFromJsonString(withoutFence);
  const candidate = normalizeWhitespace(fromJson || withoutFence);

  return candidate?.replace(/^(?:提取(?:结果|文本)[:：]|识别(?:结果|文本)[:：]|ocr(?: result| text)?[:：]|extracted text[:：])\s*/i, "") || null;
}

function extractQwenResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = candidate.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return sanitizeQwenOcrText(content);
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");

    return sanitizeQwenOcrText(text);
  }

  return null;
}

function buildQwenPrompt(request: ArticleOcrRequest) {
  return [
    "请尽量准确提取图片中可见的正文文字。",
    "只输出识别出的纯文本，不要总结、不要解释、不要补充说明。",
    "不要捏造缺失内容。",
    "模糊不可辨的字符允许使用 ? 占位。",
    request.originalUrl ? `来源页面：${request.originalUrl}` : "来源页面：unknown",
    request.resolvedUrl ? `解析地址：${request.resolvedUrl}` : "解析地址：unknown"
  ].join("\n");
}

function buildErrorPayload(status: number | null, message: string, providerBody: unknown, providerRetryDelayMs: number | null) {
  return {
    status,
    message,
    providerBody,
    retryDelayMs: providerRetryDelayMs
  };
}

function classifyQwenFailure(error: unknown): QwenFailure {
  const status = findErrorStatus(error);
  const message = findErrorMessage(error);
  const lowered = message.toLowerCase();
  const providerRetryDelayMs = extractProviderRetryDelayMs(error);
  const rateLimitKind = status === 429 ? classifyRateLimitKind(error) : null;

  if (status === 401 || status === 403 || lowered.includes("unauthorized") || lowered.includes("invalid api key")) {
    return {
      code: "OCR_UNKNOWN_ERROR",
      retryable: false,
      providerRetryDelayMs,
      effectiveRetryDelayMs: null,
      rateLimitKind: null,
      shouldAbortBatch: true,
      message: "Image OCR authentication failed for the DashScope compatible endpoint."
    };
  }

  if (status === 429 || lowered.includes("rate limit") || lowered.includes("too many requests")) {
    const effectiveRetryDelayMs =
      rateLimitKind === "soft_rate_limit" &&
      providerRetryDelayMs != null &&
      providerRetryDelayMs <= MAX_INTERACTIVE_SOFT_RATE_LIMIT_DELAY_MS
        ? providerRetryDelayMs
        : null;

    return {
      code: "OCR_RATE_LIMITED",
      retryable: rateLimitKind === "soft_rate_limit" && effectiveRetryDelayMs != null,
      providerRetryDelayMs,
      effectiveRetryDelayMs,
      rateLimitKind,
      shouldAbortBatch: rateLimitKind === "hard_quota" || effectiveRetryDelayMs == null,
      message:
        rateLimitKind === "hard_quota"
          ? "Image OCR hit a Qwen hard quota limit."
          : rateLimitKind === "soft_rate_limit" && providerRetryDelayMs != null && effectiveRetryDelayMs == null
            ? "Image OCR hit a Qwen soft rate limit, but the suggested retry delay is too long for this interactive import."
            : "Image OCR was rate limited by the Qwen OCR endpoint."
    };
  }

  if (status === 503 || lowered.includes("service unavailable") || lowered.includes("high demand")) {
    return {
      code: "OCR_SERVICE_UNAVAILABLE",
      retryable: true,
      providerRetryDelayMs,
      effectiveRetryDelayMs: providerRetryDelayMs ?? SERVICE_UNAVAILABLE_RETRY_DELAY_MS,
      rateLimitKind: null,
      shouldAbortBatch: false,
      message: "Image OCR hit a Qwen service availability issue."
    };
  }

  if (status === 400 || lowered.includes("bad request") || lowered.includes("invalid argument")) {
    return {
      code: "OCR_BAD_REQUEST",
      retryable: false,
      providerRetryDelayMs,
      effectiveRetryDelayMs: null,
      rateLimitKind: null,
      shouldAbortBatch: false,
      message: "Image OCR was rejected because the Qwen OCR request was invalid."
    };
  }

  return {
    code: "OCR_UNKNOWN_ERROR",
    retryable: false,
    providerRetryDelayMs,
    effectiveRetryDelayMs: null,
    rateLimitKind: null,
    shouldAbortBatch: false,
    message: `Image OCR failed because of an unexpected Qwen provider error: ${message}.`
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class QwenArticleOcrProvider implements ArticleOcrProvider {
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetcher: typeof fetch;

  readonly providerAvailable: boolean;

  constructor(dependencies: QwenArticleOcrProviderDependencies = {}) {
    this.apiKey = dependencies.apiKey ?? env.DASHSCOPE_API_KEY ?? null;
    this.baseUrl = (dependencies.baseUrl ?? resolveDashscopeBaseUrl()).replace(/\/$/, "");
    this.model = dependencies.model ?? env.QWEN_OCR_MODEL;
    this.fetcher = dependencies.fetcher ?? fetch;
    this.providerAvailable = Boolean(this.apiKey);
  }

  async extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult> {
    if (!this.apiKey) {
      return {
        attempted: 0,
        providerAvailable: false,
        succeededCount: 0,
        recognizedText: null,
        recognizedTextLength: 0,
        warnings: [],
        imageResults: []
      };
    }

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

      for (let attempt = 1; attempt <= MAX_OCR_ATTEMPTS_PER_IMAGE; attempt += 1) {
        try {
          const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: this.model,
              temperature: 0,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: buildQwenPrompt(request) },
                    {
                      type: "image_url",
                      image_url: {
                        url: image.url
                      }
                    }
                  ]
                }
              ]
            })
          });

          const rawText = await response.text();
          const providerBody = rawText ? (() => {
            try {
              return JSON.parse(rawText);
            } catch {
              return rawText;
            }
          })() : null;
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfterMs = retryAfterHeader && /^\d+(\.\d+)?$/.test(retryAfterHeader)
            ? Math.round(Number(retryAfterHeader) * 1000)
            : null;

          if (!response.ok) {
            throw buildErrorPayload(
              response.status,
              response.statusText || findErrorMessage(providerBody),
              providerBody,
              retryAfterMs ?? extractProviderRetryDelayMs(providerBody)
            );
          }

          const imageText = extractQwenResponseText(providerBody);
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
          const failure = classifyQwenFailure(error);
          const isLastAttempt = attempt >= MAX_OCR_ATTEMPTS_PER_IMAGE;

          if (failure.retryable && !isLastAttempt) {
            const retryInMs = failure.effectiveRetryDelayMs ?? SERVICE_UNAVAILABLE_RETRY_DELAY_MS;
            logger.info("OCR image retry scheduled", {
              ocrRunId,
              imageOrdinal: ordinal,
              imageUrl: image.url,
              imageHost: getImageHost(image.url),
              imageSource: image.source,
              mimeType: null,
              contentLength: null,
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
            failure.shouldAbortBatch || (failure.retryable && consecutiveRetryableFailures >= 2);
          const warningMessage = shouldStopRemaining
            ? `${failure.message} OCR was stopped for the remaining images in this import.`
            : failure.message;

          logger.info("OCR image failed", {
            ocrRunId,
            imageOrdinal: ordinal,
            imageUrl: image.url,
            imageHost: getImageHost(image.url),
            imageSource: image.source,
            mimeType: null,
            contentLength: null,
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
            errorMessage: findErrorMessage(error),
            providerBody: error && typeof error === "object" && "providerBody" in (error as Record<string, unknown>)
              ? (error as Record<string, unknown>).providerBody
              : null
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
