import type { ArticleImportPlatform, ArticleImportWarning } from "../../schemas/articleImportSchemas.js";

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

export interface ArticleOcrResult {
  attempted: number;
  providerAvailable: boolean;
  succeededCount: number;
  recognizedText: string | null;
  recognizedTextLength: number;
  warnings: ArticleImportWarning[];
}

export interface ArticleOcrProvider {
  readonly providerAvailable: boolean;
  extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult>;
}
