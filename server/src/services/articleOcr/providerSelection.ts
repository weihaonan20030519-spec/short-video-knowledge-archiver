import { env } from "../../utils/env.js";
import { NoopArticleOcrProvider } from "./noopArticleOcrProvider.js";
import { GeminiArticleOcrProvider } from "./geminiArticleOcrProvider.js";
import { QwenArticleOcrProvider } from "./qwenArticleOcrProvider.js";
import type { ArticleOcrProvider } from "./articleOcrProvider.js";
import { logger } from "../../utils/logger.js";

export function createArticleOcrProvider(providerName = env.ARTICLE_OCR_PROVIDER): ArticleOcrProvider {
  switch (providerName) {
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        logger.error("Article OCR provider unavailable", {
          providerName: "gemini",
          reason: "missing GEMINI_API_KEY"
        });
        return new NoopArticleOcrProvider();
      }
      return new GeminiArticleOcrProvider();
    case "qwen_ocr":
      if (!env.DASHSCOPE_API_KEY) {
        logger.error("Article OCR provider unavailable", {
          providerName: "qwen_ocr",
          reason: "missing DASHSCOPE_API_KEY"
        });
        return new NoopArticleOcrProvider();
      }
      return new QwenArticleOcrProvider();
    case "noop":
    default:
      return new NoopArticleOcrProvider();
  }
}
