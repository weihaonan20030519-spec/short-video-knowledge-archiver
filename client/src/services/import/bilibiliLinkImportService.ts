import type { BilibiliImportRequestBody, BilibiliImportResponse } from "../../types/api";
import { getApiBaseUrl } from "../apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

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
