import { describe, expect, it, vi } from "vitest";

import { analyzeRecord } from "./aiService";
import { createRecord } from "../test/factories";

describe("analyzeRecord", () => {
  it("sends appLanguage from the UI instead of transcript metadata language", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          summary: "English summary",
          bullets: ["One", "Two", "Three"]
        },
        error: null,
        meta: {
          generatedAt: "2026-04-05T12:00:00.000Z"
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const record = createRecord({
      title: "Uploaded lecture",
      originalContent: "Transcript text that should be analyzed in the current UI language.",
      transcriptMeta: {
        fileName: "lecture.mp3",
        mimeType: "audio/mpeg",
        size: 2048,
        language: "zh-CN"
      }
    });

    await analyzeRecord(record, "learning", "en");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/analyze",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String((requestInit as RequestInit).body))).toEqual(
      expect.objectContaining({
        appLanguage: "en",
        rawText: "Transcript text that should be analyzed in the current UI language."
      })
    );
  });
});
