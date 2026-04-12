import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { ensureSafeUrl } from "../utils/safeUrl.js";
import { logger } from "../utils/logger.js";

import {
  articleImportRequestSchema,
  type ArticleImportCandidateSelectionReason,
  type ArticleImportCoverageLevel,
  type ArticleImportExtractionReport,
  type ArticleImportExtractionSource,
  type ArticleImportPlatform,
  type ArticleImportResult,
  type ArticleImportOcrStatus,
  type ArticleImportWarning,
  type ArticleImportWarningCode
} from "../schemas/articleImportSchemas.js";
import type { ArticleOcrCandidateImage, ArticleOcrProvider } from "./articleOcr/articleOcrProvider.js";
import { NoopArticleOcrProvider } from "./articleOcr/noopArticleOcrProvider.js";
import { env } from "../utils/env.js";

type Fetcher = typeof fetch;

interface ArticleImportServiceDependencies {
  fetcher?: Fetcher;
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseBytes?: number;
  ocrProvider?: ArticleOcrProvider;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const SUPPORTED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const IMAGE_SKIP_PATTERN = /(avatar|icon|logo|emoji|badge|sprite|qr|qrcode|thumbnail|thumb)/i;
const FULL_TEXT_LENGTH = 120;
const PARTIAL_TEXT_LENGTH = 24;
const XIAOHONGSHU_OCR_HTML_THRESHOLD = 1000;
const IMAGE_RELIANT_HTML_THRESHOLD = 450;
const DEFAULT_MAX_CANDIDATE_IMAGES = 3;
const XIAOHONGSHU_MAX_CANDIDATE_IMAGES = 9;
const OCR_SUPPLEMENT_HEADING = "[图片文字补充]";
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "metadata.aliyun.internal",
  "100.100.100.200",
  "169.254.169.254"
]);

function normalizeWhitespace(input?: string | null) {
  return input?.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
}

function readMetaContent(document: ReturnType<typeof parseHTML>["document"], selectors: string[]) {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute("content")?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function detectPlatform(url: string): ArticleImportPlatform {
  try {
    const target = new URL(url);
    const host = target.hostname.toLowerCase();

    if (host.includes("bilibili.com") || host.includes("b23.tv")) {
      return "bilibili";
    }

    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) {
      return "xiaohongshu";
    }

    return "other";
  } catch {
    return "unknown";
  }
}

function createWarning(code: ArticleImportWarningCode, message: string): ArticleImportWarning {
  return { code, message };
}


function buildHandledResult(
  input: {
    originalUrl: string;
    resolvedUrl?: string | null;
    platform?: ArticleImportPlatform;
    title?: string | null;
    excerpt?: string | null;
    contentText?: string | null;
    fetchSucceeded: boolean;
    extractionMethod: ArticleImportResult["extractionMethod"];
    extractionReport?: ArticleImportExtractionReport;
    warnings: ArticleImportWarning[];
  }
): ArticleImportResult {
  return {
    originalUrl: input.originalUrl,
    resolvedUrl: input.resolvedUrl ?? null,
    platform: input.platform ?? detectPlatform(input.resolvedUrl || input.originalUrl),
    title: input.title ?? null,
    excerpt: input.excerpt ?? null,
    contentText: input.contentText ?? null,
    fetchSucceeded: input.fetchSucceeded,
    extractionMethod: input.extractionMethod,
    extractionReport:
      input.extractionReport ??
      buildExtractionReport({
        extractionSources: input.contentText ? ["html_text"] : input.excerpt ? ["meta_excerpt"] : [],
        htmlTextLength: input.contentText?.length ?? 0
      }),
    warnings: input.warnings
  };
}

function normalizeTextLength(text?: string | null) {
  return normalizeWhitespace(text)?.length ?? 0;
}

function mergeContentWithImageOcr(baseText?: string | null, imageOcrText?: string | null) {
  const normalizedBase = normalizeWhitespace(baseText);
  const normalizedOcr = normalizeWhitespace(imageOcrText);

  if (!normalizedOcr) {
    return normalizedBase;
  }

  if (!normalizedBase) {
    return normalizedOcr;
  }

  if (normalizedBase.includes(normalizedOcr)) {
    return normalizedBase;
  }

  return `${normalizedBase}\n\n${OCR_SUPPLEMENT_HEADING}\n${normalizedOcr}`;
}

function classifyTextCompletenessByLength(length: number) {
  const normalizedLength = Math.max(0, length);

  if (normalizedLength >= FULL_TEXT_LENGTH) {
    return "full" as const;
  }

  if (normalizedLength >= PARTIAL_TEXT_LENGTH) {
    return "partial" as const;
  }

  return "empty" as const;
}

function parseDimension(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function resolveImageUrl(src: string | null | undefined, baseUrl: string) {
  if (!src) {
    return null;
  }

  try {
    const resolved = new URL(src, baseUrl);
    return ensureSafeUrl(resolved) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function isLikelyDecorativeImage(image: ArticleOcrCandidateImage) {
  const searchable = [image.url, image.alt || ""].join(" ");
  if (IMAGE_SKIP_PATTERN.test(searchable)) {
    return true;
  }

  const maxDimension = Math.max(image.width || 0, image.height || 0);
  if (maxDimension > 0 && maxDimension < 180) {
    return true;
  }

  return false;
}

function dedupeCandidateImages(images: ArticleOcrCandidateImage[]) {
  const seen = new Set<string>();
  const deduped: ArticleOcrCandidateImage[] = [];

  for (const image of images) {
    if (seen.has(image.url)) {
      continue;
    }

    seen.add(image.url);
    deduped.push(image);
  }

  return deduped;
}

function selectCandidateImages(images: ArticleOcrCandidateImage[], limit: number) {
  return images.slice(0, limit);
}

function resolveOcrCandidateLimit(platform: ArticleImportPlatform) {
  if (platform === "xiaohongshu") {
    return XIAOHONGSHU_MAX_CANDIDATE_IMAGES;
  }

  return DEFAULT_MAX_CANDIDATE_IMAGES;
}

function extractContentImageCandidates(contentHtml: string | null | undefined, baseUrl: string) {
  if (!contentHtml) {
    return {
      imageSignalsFound: 0,
      candidates: [] as ArticleOcrCandidateImage[]
    };
  }

  const { document } = parseHTML(`<body>${contentHtml}</body>`);
  const signals: ArticleOcrCandidateImage[] = [];
  const candidates: ArticleOcrCandidateImage[] = [];

  for (const node of Array.from(document.querySelectorAll("img"))) {
    const resolvedUrl =
      resolveImageUrl(
        node.getAttribute("src") ||
          node.getAttribute("data-src") ||
          node.getAttribute("data-original") ||
          node.getAttribute("data-origin"),
        baseUrl
      );

    if (!resolvedUrl) {
      continue;
    }

    const signal: ArticleOcrCandidateImage = {
      url: resolvedUrl,
      width: parseDimension(node.getAttribute("width")),
      height: parseDimension(node.getAttribute("height")),
      alt: normalizeWhitespace(node.getAttribute("alt")),
      source: "content"
    };

    signals.push(signal);

    if (isLikelyDecorativeImage(signal)) {
      continue;
    }

    candidates.push(signal);
  }

  return {
    imageSignalsFound: dedupeCandidateImages(signals).length,
    candidates: dedupeCandidateImages(candidates)
  };
}

function extractMetaImageCandidates(
  document: ReturnType<typeof parseHTML>["document"],
  baseUrl: string
){
  const signals: ArticleOcrCandidateImage[] = [];
  const candidates: ArticleOcrCandidateImage[] = [];

  for (const node of Array.from(document.querySelectorAll("meta"))) {
    const property = node.getAttribute("property")?.toLowerCase() ?? node.getAttribute("name")?.toLowerCase() ?? "";
    if (property !== "og:image" && property !== "twitter:image") {
      continue;
    }

    const resolvedUrl = resolveImageUrl(node.getAttribute("content"), baseUrl);

    if (!resolvedUrl) {
      continue;
    }

    const candidate: ArticleOcrCandidateImage = {
      url: resolvedUrl,
      width: null,
      height: null,
      alt: null,
      source: "meta"
    };

    signals.push(candidate);

    if (isLikelyDecorativeImage(candidate)) {
      continue;
    }

    candidates.push(candidate);
  }

  return {
    imageSignalsFound: dedupeCandidateImages(signals).length,
    candidates: dedupeCandidateImages(candidates)
  };
}

function shouldAttemptImageOcr(input: {
  platform: ArticleImportPlatform;
  htmlTextLength: number;
  candidates: ArticleOcrCandidateImage[];
}) {
  if (!input.candidates.length) {
    return false;
  }

  const htmlCompleteness = classifyTextCompletenessByLength(input.htmlTextLength);

  if (input.platform === "xiaohongshu") {
    return true;
  }

  if (htmlCompleteness === "full" && input.candidates.length <= 1) {
    return true;
  }

  return input.htmlTextLength < IMAGE_RELIANT_HTML_THRESHOLD || input.candidates.length >= 2;
}

function buildExtractionReport(input: {
  extractionSources?: ArticleImportExtractionSource[];
  htmlTextLength?: number;
  imageSignalsFound?: number;
  candidateImagesSelected?: number;
  bodyCandidateImagesSelected?: number;
  ocrAttemptLimit?: number;
  candidateSelectionReasons?: ArticleImportCandidateSelectionReason[];
  imageOcrAttempted?: number;
  imageOcrSucceeded?: number;
  imageOcrFailed?: number;
  imageOcrTextLength?: number;
  ocrStatus?: ArticleImportOcrStatus;
}): ArticleImportExtractionReport {
  const extractionSources = input.extractionSources ?? [];
  const htmlTextLength = input.htmlTextLength ?? 0;
  const imageSignalsFound = input.imageSignalsFound ?? 0;
  const candidateImagesSelected = input.candidateImagesSelected ?? 0;
  const bodyCandidateImagesSelected = input.bodyCandidateImagesSelected ?? 0;
  const ocrAttemptLimit = input.ocrAttemptLimit ?? DEFAULT_MAX_CANDIDATE_IMAGES;
  const candidateSelectionReasons = input.candidateSelectionReasons ?? [];
  const imageOcrAttempted = input.imageOcrAttempted ?? 0;
  const imageOcrSucceeded = input.imageOcrSucceeded ?? 0;
  const imageOcrFailed = input.imageOcrFailed ?? Math.max(0, imageOcrAttempted - imageOcrSucceeded);
  const imageOcrTextLength = input.imageOcrTextLength ?? 0;
  const hasHtmlText = extractionSources.includes("html_text");
  const hasImageOcrText = extractionSources.includes("image_ocr") && imageOcrTextLength > 0;
  const htmlCompleteness = classifyTextCompletenessByLength(hasHtmlText ? htmlTextLength : 0);
  const hasSelectedBodyCandidateImages = bodyCandidateImagesSelected > 0;
  const isFullHtml = hasHtmlText && htmlCompleteness === "full";
  const imageGap = hasSelectedBodyCandidateImages && !hasImageOcrText;
  let coverageLevel: ArticleImportCoverageLevel;

  if (isFullHtml && !hasSelectedBodyCandidateImages) {
    coverageLevel = "full";
  } else if (isFullHtml || (hasHtmlText && htmlCompleteness === "partial" && !imageGap)) {
    coverageLevel = "partial";
  } else if (hasHtmlText || hasImageOcrText) {
    coverageLevel = "limited";
  } else {
    coverageLevel = "minimal";
  }

  return {
    extractionSources,
    hasHtmlText,
    hasImageOcrText,
    htmlTextLength,
    imageSignalsFound,
    candidateImagesSelected,
    ocrAttemptLimit,
    candidateSelectionReasons,
    imageOcrAttempted,
    imageOcrSucceeded,
    imageOcrFailed,
    imageOcrTextLength,
    ocrStatus: input.ocrStatus ?? "not_applicable",
    coverageLevel
  };
}

async function fetchWithRedirectChecks(
  originalUrl: string,
  fetcher: Fetcher,
  controller: AbortController,
  maxRedirects: number
) {
  let currentUrl = originalUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const targetUrl = new URL(currentUrl);

    if (!ensureSafeUrl(targetUrl)) {
      return {
        kind: "handled" as const,
        result: buildHandledResult({
          originalUrl,
          resolvedUrl: currentUrl,
          fetchSucceeded: false,
          extractionMethod: "none",
          warnings: [
            createWarning(
              "SECURITY_BLOCKED",
              "This link was blocked by the import security policy. You can still keep the link and add the text manually."
            )
          ]
        })
      };
    }

    let response: Response;
    try {
      response = await fetcher(currentUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml"
        },
        redirect: "manual"
      });
    } catch {
      return {
        kind: "handled" as const,
        result: buildHandledResult({
          originalUrl,
          resolvedUrl: currentUrl,
          fetchSucceeded: false,
          extractionMethod: "none",
          warnings: [
            createWarning(
              "FETCH_FAILED",
              "The page could not be fetched. You can still keep the link and add the text manually."
            )
          ]
        })
      };
    }

    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return {
        kind: "response" as const,
        response,
        resolvedUrl: currentUrl
      };
    }

    const location = response.headers.get("location");
    if (!location) {
      return {
        kind: "handled" as const,
        result: buildHandledResult({
          originalUrl,
          resolvedUrl: currentUrl,
          fetchSucceeded: false,
          extractionMethod: "none",
          warnings: [
            createWarning(
              "FETCH_FAILED",
              "The page redirected without a usable destination. You can still keep the link and add the text manually."
            )
          ]
        })
      };
    }

    if (redirectCount >= maxRedirects) {
      return {
        kind: "handled" as const,
        result: buildHandledResult({
          originalUrl,
          resolvedUrl: currentUrl,
          fetchSucceeded: false,
          extractionMethod: "none",
          warnings: [
            createWarning(
              "TOO_MANY_REDIRECTS",
              "The link redirected too many times. You can still keep the link and add the text manually."
            )
          ]
        })
      };
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  return {
    kind: "handled" as const,
    result: buildHandledResult({
      originalUrl,
      resolvedUrl: currentUrl,
      fetchSucceeded: false,
      extractionMethod: "none",
      warnings: [
        createWarning(
          "TOO_MANY_REDIRECTS",
          "The link redirected too many times. You can still keep the link and add the text manually."
        )
      ]
    })
  };
}

function isSupportedContentType(contentTypeHeader: string | null) {
  const normalized = (contentTypeHeader || "").toLowerCase();
  return SUPPORTED_CONTENT_TYPES.some((allowed) => normalized.includes(allowed));
}

async function readResponseTextWithLimit(response: Response, maxBytes: number) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { text: null, exceededLimit: true };
  }

  if (!response.body) {
    return { text: "", exceededLimit: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  const chunks: string[] = [];

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        return { text: null, exceededLimit: true };
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.releaseLock();
  }

  chunks.push(decoder.decode());
  return {
    text: chunks.join(""),
    exceededLimit: false
  };
}

export async function importArticleContent(
  input: { url: string },
  dependencies: ArticleImportServiceDependencies = {}
): Promise<ArticleImportResult> {
  const { url } = articleImportRequestSchema.parse(input);
  const fetcher = dependencies.fetcher ?? fetch;
  const timeoutMs = dependencies.timeoutMs ?? env.ARTICLE_IMPORT_TIMEOUT_MS;
  const maxRedirects = dependencies.maxRedirects ?? env.ARTICLE_IMPORT_MAX_REDIRECTS;
  const maxResponseBytes = dependencies.maxResponseBytes ?? env.ARTICLE_IMPORT_MAX_RESPONSE_BYTES;
  const ocrProvider = dependencies.ocrProvider ?? new NoopArticleOcrProvider();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchResult = await fetchWithRedirectChecks(url, fetcher, controller, maxRedirects);
    if (fetchResult.kind === "handled") {
      return fetchResult.result;
    }

    const { response, resolvedUrl } = fetchResult;
    const resolvedPlatform = detectPlatform(resolvedUrl);

    if (!response.ok) {
      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        fetchSucceeded: false,
        extractionMethod: "none",
        warnings: [
          createWarning(
            "FETCH_FAILED",
            "The page responded unsuccessfully. You can still keep the link and add the text manually."
          )
        ]
      });
    }

    if (!isSupportedContentType(response.headers.get("content-type"))) {
      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        fetchSucceeded: true,
        extractionMethod: "none",
        warnings: [
          createWarning(
            "UNSUPPORTED_CONTENT_TYPE",
            "This link did not return an HTML page that can be extracted. You can still keep the link and add the text manually."
          )
        ]
      });
    }

    const { text: html, exceededLimit } = await readResponseTextWithLimit(response, maxResponseBytes);
    if (exceededLimit) {
      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        fetchSucceeded: true,
        extractionMethod: "none",
        warnings: [
          createWarning(
            "CONTENT_TOO_LARGE",
            "The page content was too large to import safely. You can still keep the link and add the text manually."
          )
        ]
      });
    }

    const { document } = parseHTML(html || "");
    const metaImages = extractMetaImageCandidates(document, resolvedUrl);
    const readability = new Readability(document);
    const parsed = readability.parse();
    const readabilityText = normalizeWhitespace(parsed?.textContent);
    const title =
      normalizeWhitespace(parsed?.title) ||
      normalizeWhitespace(readMetaContent(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]'])) ||
      normalizeWhitespace(document.querySelector("title")?.textContent) ||
      null;
    const excerpt =
      normalizeWhitespace(parsed?.excerpt) ||
      normalizeWhitespace(
        readMetaContent(document, [
          'meta[property="og:description"]',
          'meta[name="description"]',
          'meta[name="twitter:description"]'
        ])
      ) ||
      null;
    const contentImages = extractContentImageCandidates(parsed?.content, resolvedUrl);
    const usingMetaFallback = contentImages.candidates.length === 0 && metaImages.candidates.length > 0;
    const chosenImageSummary = contentImages.candidates.length > 0 ? contentImages : metaImages;
    const candidateImagesBeforeCap = chosenImageSummary.candidates;
    const ocrCandidateLimit = resolveOcrCandidateLimit(resolvedPlatform);
    const discoveredImageCount = candidateImagesBeforeCap.length;
    const contentImageCandidates = selectCandidateImages(candidateImagesBeforeCap, ocrCandidateLimit);
    const bodyCandidateImagesSelected = contentImages.candidates.length > 0 ? contentImageCandidates.length : 0;
    const candidateSelectionReasons: ArticleImportCandidateSelectionReason[] = [];

    if (usingMetaFallback) {
      candidateSelectionReasons.push("partial_page_signals_only");
    }

    if (chosenImageSummary.imageSignalsFound > candidateImagesBeforeCap.length) {
      candidateSelectionReasons.push("filtered_non_body_images");
    }

    if (candidateImagesBeforeCap.length > contentImageCandidates.length) {
      candidateSelectionReasons.push("limited_by_cap");
    }

    const shouldAttemptOcr = shouldAttemptImageOcr({
      platform: resolvedPlatform,
      htmlTextLength: normalizeTextLength(readabilityText),
      candidates: candidateImagesBeforeCap
    });
    let ocrStatus: ArticleImportOcrStatus = "not_applicable";
    let ocrWarnings: ArticleImportWarning[] = [];
    let imageOcrAttempted = 0;
    let imageOcrSucceeded = 0;
    let imageOcrTextLength = 0;
    let imageOcrText: string | null = null;
    let ocrRunMeta: {
      discoveredImageCount: number;
      candidateCount: number;
      attemptedCount: number;
      remainingImagesSkipped: number;
      earlyStopped: boolean;
      earlyStopReason: ArticleImportWarningCode | null;
      errorCounts: Partial<Record<ArticleImportWarningCode, number>>;
    } | null = null;

    if (contentImageCandidates.length > 0) {
      if (!shouldAttemptOcr) {
        ocrStatus = "not_attempted";
        ocrWarnings = [
          createWarning(
            "OCR_NOT_ATTEMPTED",
            "The page appears to include meaningful images, but image OCR was not attempted for this import."
          )
        ];
      } else if (!ocrProvider.providerAvailable) {
        ocrStatus = "provider_unavailable";
        ocrWarnings = [
          createWarning(
            "OCR_PROVIDER_UNAVAILABLE",
            "The page may rely on images for body text, but image OCR is not configured on this server."
          )
        ];
      } else {
        const ocrResult = await ocrProvider.extractText({
          platform: resolvedPlatform,
          originalUrl: url,
          resolvedUrl,
          images: contentImageCandidates,
          discoveredImageCount
        });
        const imageResults = ocrResult.imageResults;
        imageOcrAttempted = imageResults?.length ?? ocrResult.attempted;
        imageOcrSucceeded = imageResults
          ? imageResults.filter((result) => result.succeeded).length
          : ocrResult.succeededCount;
        imageOcrText = imageResults
          ? normalizeWhitespace(
              imageResults
                .filter((result) => result.succeeded && result.text)
                .map((result) => `[Image OCR ${result.ordinal}]\n${result.text}`)
                .join("\n\n")
            )
          : normalizeWhitespace(ocrResult.recognizedText);
        imageOcrTextLength = imageOcrText?.length ?? 0;
        ocrWarnings = ocrResult.warnings;
        ocrRunMeta = ocrResult.runMeta ?? null;
        if (imageOcrTextLength > 0) {
          ocrStatus = imageOcrSucceeded >= imageOcrAttempted ? "successful" : "partial";
        } else {
          ocrStatus = "attempted_no_text";
          ocrWarnings = ocrWarnings.length
            ? ocrWarnings
            : [
                createWarning(
                  "OCR_NO_TEXT_DETECTED",
                  "Image OCR was attempted, but no reusable text was detected from the page images."
                )
              ];
        }
      }
    }

    if (contentImageCandidates.length > 0) {
      logger.info("Article import OCR evaluation completed", {
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        discoveredImageCount: ocrRunMeta?.discoveredImageCount ?? discoveredImageCount,
        candidateCount: ocrRunMeta?.candidateCount ?? contentImageCandidates.length,
        attemptedCount: ocrRunMeta?.attemptedCount ?? imageOcrAttempted,
        remainingImagesSkipped:
          ocrRunMeta?.remainingImagesSkipped ?? Math.max(0, contentImageCandidates.length - imageOcrAttempted),
        earlyStopped: ocrRunMeta?.earlyStopped ?? false,
        earlyStopReason: ocrRunMeta?.earlyStopReason ?? null,
        errorCounts: ocrRunMeta?.errorCounts ?? {},
        ocrStatus,
        imageOcrSucceeded,
        imageOcrTextLength
      });
    }

    if (readabilityText) {
      const extractionSources: ArticleImportExtractionSource[] = ["html_text"];
      if (imageOcrText) {
        extractionSources.push("image_ocr");
      }

      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        title,
        excerpt,
        contentText: mergeContentWithImageOcr(readabilityText, imageOcrText),
        fetchSucceeded: true,
        extractionMethod: "readability",
          extractionReport: buildExtractionReport({
          extractionSources,
          htmlTextLength: normalizeTextLength(readabilityText),
          imageSignalsFound: chosenImageSummary.imageSignalsFound,
          candidateImagesSelected: contentImageCandidates.length,
          bodyCandidateImagesSelected,
          ocrAttemptLimit: ocrCandidateLimit,
          candidateSelectionReasons,
          imageOcrAttempted,
          imageOcrSucceeded,
          imageOcrTextLength,
          ocrStatus
        }),
        warnings: ocrWarnings
      });
    }

    if (excerpt || title) {
      const extractionSources: ArticleImportExtractionSource[] = [];
      if (excerpt) {
        extractionSources.push("meta_excerpt");
      }
      if (imageOcrText) {
        extractionSources.push("image_ocr");
      }
      const fallbackWarnings =
        excerpt || !imageOcrText
          ? [
              createWarning(
                "META_ONLY",
                "Only title or summary text was available from the page. You can continue by adding the body text manually."
              ),
              createWarning(
                "MANUAL_COMPLETION_REQUIRED",
                "Only part of the page was imported. Please add the main text manually before organizing it."
              )
            ]
          : [];

      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        title,
        excerpt,
        contentText: mergeContentWithImageOcr(excerpt, imageOcrText),
        fetchSucceeded: true,
        extractionMethod: "meta_fallback",
        extractionReport: buildExtractionReport({
          extractionSources,
          htmlTextLength: 0,
          imageSignalsFound: chosenImageSummary.imageSignalsFound,
          candidateImagesSelected: contentImageCandidates.length,
          bodyCandidateImagesSelected,
          ocrAttemptLimit: ocrCandidateLimit,
          candidateSelectionReasons,
          imageOcrAttempted,
          imageOcrSucceeded,
          imageOcrTextLength,
          ocrStatus
        }),
        warnings: [...fallbackWarnings, ...ocrWarnings]
      });
    }

    if (imageOcrText) {
      return buildHandledResult({
        originalUrl: url,
        resolvedUrl,
        platform: resolvedPlatform,
        title,
        excerpt,
        contentText: imageOcrText,
        fetchSucceeded: true,
        extractionMethod: "none",
        extractionReport: buildExtractionReport({
          extractionSources: ["image_ocr"],
          htmlTextLength: 0,
          imageSignalsFound: chosenImageSummary.imageSignalsFound,
          candidateImagesSelected: contentImageCandidates.length,
          bodyCandidateImagesSelected,
          ocrAttemptLimit: ocrCandidateLimit,
          candidateSelectionReasons,
          imageOcrAttempted,
          imageOcrSucceeded,
          imageOcrTextLength,
          ocrStatus
        }),
        warnings: ocrWarnings
      });
    }

    return buildHandledResult({
      originalUrl: url,
      resolvedUrl,
      platform: resolvedPlatform,
      title,
      excerpt,
      contentText: null,
      fetchSucceeded: true,
      extractionMethod: "none",
      extractionReport: buildExtractionReport({
        extractionSources: imageOcrText ? ["image_ocr"] : [],
        htmlTextLength: 0,
        imageSignalsFound: chosenImageSummary.imageSignalsFound,
        candidateImagesSelected: contentImageCandidates.length,
        bodyCandidateImagesSelected,
        ocrAttemptLimit: ocrCandidateLimit,
        candidateSelectionReasons,
        imageOcrAttempted,
        imageOcrSucceeded,
        imageOcrTextLength,
        ocrStatus
      }),
      warnings: [
        createWarning(
          "EXTRACTION_EMPTY",
          "The page was fetched, but no reusable body text was extracted."
        ),
        createWarning(
          "MANUAL_COMPLETION_REQUIRED",
          "Please add the page text, subtitles, or notes manually before organizing it."
        ),
        ...ocrWarnings
      ]
    });
  } finally {
    clearTimeout(timeout);
  }
}
