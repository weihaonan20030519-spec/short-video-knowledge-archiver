import { z } from "zod";

export const articleImportRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      try {
        const target = new URL(value);
        return target.protocol === "http:" || target.protocol === "https:";
      } catch {
        return false;
      }
    }, "Only http(s) URLs are supported.")
});

export type ArticleImportRequest = z.infer<typeof articleImportRequestSchema>;

export type ArticleImportWarningCode =
  | "FETCH_FAILED"
  | "SECURITY_BLOCKED"
  | "TOO_MANY_REDIRECTS"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "CONTENT_TOO_LARGE"
  | "EXTRACTION_EMPTY"
  | "META_ONLY"
  | "OCR_NOT_ATTEMPTED"
  | "OCR_PROVIDER_UNAVAILABLE"
  | "OCR_NO_TEXT_DETECTED"
  | "MANUAL_COMPLETION_REQUIRED"
  | "UNKNOWN_ERROR";
export type ArticleImportExtractionMethod = "readability" | "meta_fallback" | "none";
export type ArticleImportPlatform = "bilibili" | "xiaohongshu" | "other" | "unknown";
export type ArticleImportExtractionSource = "html_text" | "meta_excerpt" | "image_ocr";
export type ArticleImportOcrStatus =
  | "not_applicable"
  | "not_attempted"
  | "provider_unavailable"
  | "attempted_no_text"
  | "partial"
  | "successful";
export type ArticleImportCoverageLevel = "full" | "partial" | "limited" | "minimal";
export type ArticleImportCandidateSelectionReason =
  | "limited_by_cap"
  | "filtered_non_body_images"
  | "partial_page_signals_only";

export interface ArticleImportWarning {
  code: ArticleImportWarningCode;
  message: string;
}

export interface ArticleImportExtractionReport {
  extractionSources: ArticleImportExtractionSource[];
  hasHtmlText: boolean;
  hasImageOcrText: boolean;
  htmlTextLength: number;
  imageSignalsFound: number;
  candidateImagesSelected: number;
  ocrAttemptLimit: number;
  candidateSelectionReasons: ArticleImportCandidateSelectionReason[];
  imageOcrAttempted: number;
  imageOcrSucceeded: number;
  imageOcrTextLength: number;
  ocrStatus: ArticleImportOcrStatus;
  coverageLevel: ArticleImportCoverageLevel;
}

export interface ArticleImportResult {
  originalUrl: string;
  resolvedUrl: string | null;
  platform: ArticleImportPlatform;
  title: string | null;
  excerpt: string | null;
  contentText: string | null;
  fetchSucceeded: boolean;
  extractionMethod: ArticleImportExtractionMethod;
  extractionReport: ArticleImportExtractionReport;
  warnings: ArticleImportWarning[];
}

export type ArticleImportErrorCode = "INVALID_URL" | "INTERNAL_ERROR";
