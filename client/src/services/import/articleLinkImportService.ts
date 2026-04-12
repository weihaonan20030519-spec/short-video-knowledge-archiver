import type { ArticleImportRequestBody, ArticleImportResponse } from "../../types/api";
import { getApiBaseUrl } from "../apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

export async function importArticleLink(url: string): Promise<ArticleImportResponse> {
  const body: ArticleImportRequestBody = { url };

  const response = await fetch(`${API_BASE_URL}/api/import/article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return (await response.json()) as ArticleImportResponse;
}
