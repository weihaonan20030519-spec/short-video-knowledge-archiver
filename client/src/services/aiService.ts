import type { AnalyzeMode, AppLanguage, ConciseOutput, LearningOutput, RecordItem } from "../types/domain";
import type { AnalyzeRequestBody, AnalyzeResponse } from "../types/api";
import { getApiBaseUrl } from "./apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

export async function analyzeRecord(
  record: RecordItem,
  mode: AnalyzeMode,
  appLanguage: AppLanguage
): Promise<AnalyzeResponse<ConciseOutput | LearningOutput>> {
  const body: AnalyzeRequestBody = {
    mode,
    appLanguage,
    title: record.title,
    sourcePlatform: record.sourcePlatform,
    originalUrl: record.originalUrl,
    rawText: record.originalContent
  };

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return (await response.json()) as AnalyzeResponse<ConciseOutput | LearningOutput>;
}
