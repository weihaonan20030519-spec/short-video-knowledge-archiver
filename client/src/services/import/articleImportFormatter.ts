import type { ArticleImportData } from "../../types/api";

function normalizeMultilineText(text?: string | null) {
  return text?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
}

export function formatArticleImportedContent(data: ArticleImportData) {
  return normalizeMultilineText(data.contentText) || normalizeMultilineText(data.excerpt);
}
