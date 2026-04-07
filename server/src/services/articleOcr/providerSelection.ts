import { env } from "../../utils/env.js";
import { NoopArticleOcrProvider } from "./noopArticleOcrProvider.js";
import { GeminiArticleOcrProvider } from "./geminiArticleOcrProvider.js";
import type { ArticleOcrProvider } from "./articleOcrProvider.js";

export function createArticleOcrProvider(providerName = env.ARTICLE_OCR_PROVIDER): ArticleOcrProvider {
  switch (providerName) {
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        return new NoopArticleOcrProvider();
      }
      return new GeminiArticleOcrProvider();
    case "noop":
    default:
      return new NoopArticleOcrProvider();
  }
}
