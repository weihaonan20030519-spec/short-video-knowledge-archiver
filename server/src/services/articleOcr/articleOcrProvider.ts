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

export interface ArticleOcrResult {
  attempted: number;
  providerAvailable: boolean;
  succeededCount: number;
  recognizedText: string | null;
  recognizedTextLength: number;
  warnings: ArticleImportWarning[];
  imageResults?: ArticleOcrImageResult[];
}

export interface ArticleOcrProvider {
  readonly providerAvailable: boolean;
  extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult>;
}
