import { describe, expect, it } from "vitest";

import { deriveRecordSourceSummary } from "./sourceTransparency";
import { createRecord } from "../test/factories";

describe("sourceTransparency", () => {
  it("derives a mixed html + ocr headline from creation-time source signals", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial",
        sourceSignals: {
          hasHtmlText: true,
          hasImageOcrText: true
        }
      }
    });

    expect(deriveRecordSourceSummary(record, "zh-CN")).toEqual({
      headline: "主要来自网页正文 + OCR 补充",
      detail: null
    });
  });

  it("derives certain source headlines for browser import, transcript, and manual input", () => {
    const browserRecord = createRecord({
      inputMethod: "link",
      sourceType: "link",
      importSummary: {
        source: "browser_context",
        outcome: "partial",
        contentCompleteness: "partial"
      }
    });
    const transcriptRecord = createRecord({
      inputMethod: "upload",
      sourceType: "audio",
      transcriptMeta: {
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 1024
      }
    });
    const manualRecord = createRecord({
      inputMethod: "text",
      sourceType: "text",
      importSummary: null
    });

    expect(deriveRecordSourceSummary(browserRecord, "zh-CN").headline).toBe("主要来自浏览器导入");
    expect(deriveRecordSourceSummary(transcriptRecord, "zh-CN").headline).toBe("主要来自音视频转写");
    expect(deriveRecordSourceSummary(manualRecord, "zh-CN").headline).toBe("主要来自用户手动输入");
  });

  it("only shows summary-only detail for explicit summary-only source signals", () => {
    const summaryOnlyRecord = createRecord({
      inputMethod: "link",
      sourceType: "link",
      importSummary: {
        source: "link_generic",
        outcome: "needs_user_input",
        contentCompleteness: "empty",
        sourceSignals: {
          isSummaryOnly: true
        }
      }
    });
    const shortButNotSummaryOnlyRecord = createRecord({
      inputMethod: "link",
      sourceType: "link",
      originalContent: "正文很短。",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial",
        sourceSignals: {
          hasHtmlText: true
        }
      }
    });

    expect(deriveRecordSourceSummary(summaryOnlyRecord, "zh-CN").detail).toBe(
      "当前仅带回摘要级内容，不等于完整正文。"
    );
    expect(deriveRecordSourceSummary(shortButNotSummaryOnlyRecord, "zh-CN").detail).toBeNull();
  });

  it("uses only neutral wording when current content may differ from the first import result", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      originalContent: "这里现在已经有一段正文。",
      createdAt: "2026-04-02T10:00:00.000Z",
      updatedAt: "2026-04-03T10:00:00.000Z",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial",
        sourceSignals: {
          hasHtmlText: true
        }
      }
    });

    const summary = deriveRecordSourceSummary(record, "zh-CN");

    expect(summary.detail).toBe("当前原文可能与初次导入结果不同，也可能包含后续补充或调整。");
    expect(summary.detail).not.toContain("用户后来补了正文");
    expect(summary.detail).not.toContain("包含用户补充正文");
    expect(summary.headline).toBe("主要来自网页正文");
  });

  it("does not mutate the record or backfill source signals at runtime", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial"
      }
    });
    const snapshotBefore = JSON.parse(JSON.stringify(record));

    const summary = deriveRecordSourceSummary(record, "zh-CN");

    expect(summary).toEqual({
      headline: "主要来自链接导入",
      detail: null
    });
    expect(record).toEqual(snapshotBefore);
    expect(record.importSummary?.sourceSignals).toBeUndefined();
  });
});
