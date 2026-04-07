import type { ArticleOcrProvider, ArticleOcrRequest, ArticleOcrResult } from "./articleOcrProvider.js";

export class NoopArticleOcrProvider implements ArticleOcrProvider {
  readonly providerAvailable = false;

  async extractText(_request: ArticleOcrRequest): Promise<ArticleOcrResult> {
    return {
      attempted: 0,
      providerAvailable: false,
      succeededCount: 0,
      recognizedText: null,
      recognizedTextLength: 0,
      warnings: []
    };
  }
}
