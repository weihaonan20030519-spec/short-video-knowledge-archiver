import type { BilibiliImportRequestBody, BilibiliImportResponse } from "../../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function importBilibiliLink(
  url: string,
  preferredTrackId?: string
): Promise<BilibiliImportResponse> {
  const body: BilibiliImportRequestBody = {
    url,
    preferredTrackId
  };

  const response = await fetch(`${API_BASE_URL}/api/import/bilibili`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return (await response.json()) as BilibiliImportResponse;
}

