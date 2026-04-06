import type { TranscriptionResponse } from "../../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function transcribeFile(file: File, languageHint?: string) {
  const formData = new FormData();
  formData.set("file", file);

  if (languageHint) {
    formData.set("languageHint", languageHint);
  }

  const response = await fetch(`${API_BASE_URL}/api/transcribe/file`, {
    method: "POST",
    body: formData
  });

  return (await response.json()) as TranscriptionResponse;
}
