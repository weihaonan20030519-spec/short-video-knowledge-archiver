import { describe, expect, it } from "vitest";

import { normalizeChineseTranscriptScript } from "./chineseScriptNormalization.js";

describe("normalizeChineseTranscriptScript", () => {
  it("converts traditional Chinese transcript content to simplified Chinese when language is Chinese", () => {
    const result = normalizeChineseTranscriptScript(
      {
        transcriptText: "這是一段繁體中文轉寫內容。",
        language: "zh-TW",
        warnings: [],
        segments: [{ text: "這是一段繁體中文。", startMs: 0, endMs: 1000 }],
        timestamps: [{ label: "關鍵重點", startMs: 0, endMs: 1000 }]
      },
      {
        languageHint: "zh-CN"
      }
    );

    expect(result.transcriptText).toBe("这是一段繁体中文转写内容。");
    expect(result.segments?.[0]?.text).toBe("这是一段繁体中文。");
    expect(result.timestamps?.[0]?.label).toBe("关键重点");
  });

  it("does not rewrite non-Chinese transcripts", () => {
    const result = normalizeChineseTranscriptScript(
      {
        transcriptText: "This is an English transcript.",
        language: "en",
        warnings: []
      },
      {
        languageHint: "en"
      }
    );

    expect(result.transcriptText).toBe("This is an English transcript.");
  });
});
