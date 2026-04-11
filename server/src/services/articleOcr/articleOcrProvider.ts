import type { ArticleImportPlatform, ArticleImportWarning, ArticleImportWarningCode } from "../../schemas/articleImportSchemas.js";

export interface ArticleOcrCandidateImage {
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  source: "content" | "meta";
}

export interface ArticleOcrRequest {
  platform: ArticleImportPlatform;
  originalUrl: string;
  resolvedUrl: string | null;
  images: ArticleOcrCandidateImage[];
  discoveredImageCount?: number;
}

export interface ArticleOcrImageResult {
  ordinal: number;
  imageUrl: string;
  source: ArticleOcrCandidateImage["source"];
  succeeded: boolean;
  text: string | null;
  warningCode?: ArticleImportWarningCode;
  warningMessage?: string | null;
}

export interface ArticleOcrRunMeta {
  discoveredImageCount: number;
  candidateCount: number;
  attemptedCount: number;
  remainingImagesSkipped: number;
  earlyStopped: boolean;
  earlyStopReason: ArticleImportWarningCode | null;
  errorCounts: Partial<Record<ArticleImportWarningCode, number>>;
}

export interface ArticleOcrResult {
  attempted: number;
  providerAvailable: boolean;
  succeededCount: number;
  recognizedText: string | null;
  recognizedTextLength: number;
  warnings: ArticleImportWarning[];
  imageResults?: ArticleOcrImageResult[];
  runMeta?: ArticleOcrRunMeta;
}

export interface ArticleOcrProvider {
  readonly providerAvailable: boolean;
  extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult>;
}
