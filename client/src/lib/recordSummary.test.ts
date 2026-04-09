import { describe, expect, it } from "vitest";

import { getContextualRecordSummarySignals, getRecordSummarySignals } from "./recordSummary";
import { createRecord } from "../test/factories";

describe("getRecordSummarySignals", () => {
  it("uses the same browse status summary as the record list", () => {
    const record = createRecord({
      originalContent: "这里已经有正文，但还没有 AI 结果。",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getRecordSummarySignals(record, "zh-CN");

    expect(summary.status.label).toBe("待修正文稿");
    expect(summary.entryLabel).toBe("粘贴文本");
    expect(summary.platformLabel).toBeNull();
  });

  it("surfaces browser import and review-later as explicit summary signals", () => {
    const record = createRecord({
      reviewLater: true,
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "xiaohongshu",
      importSummary: {
        source: "browser_context",
        outcome: "partial",
        contentCompleteness: "partial"
      }
    });

    const summary = getRecordSummarySignals(record, "zh-CN");

    expect(summary.entryLabel).toBe("浏览器导入");
    expect(summary.platformLabel).toBe("小红书");
    expect(summary.reviewLaterLabel).toBe("需复查");
  });

  it("keeps specific record status wording so cards can explain a wider sidebar bucket", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getRecordSummarySignals(record, "zh-CN");

    expect(summary.status.label).toBe("转写失败");
  });

  it("keeps concrete status as the primary signal inside the broad pending bucket", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getContextualRecordSummarySignals(record, "zh-CN", "unorganized");

    expect(summary.statusWeight).toBe("primary");
    expect(summary.primaryStatus?.label).toBe("转写失败");
    expect(summary.secondarySignals.map((signal) => signal.label)).toContain("粘贴文本");
  });

  it("deemphasizes the exact needs-review status inside the needs-review filter while keeping it visible", () => {
    const record = createRecord({
      originalContent: "这里已经有正文，但还没整理。",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getContextualRecordSummarySignals(record, "zh-CN", "needs_review");

    expect(summary.statusWeight).toBe("deemphasized");
    expect(summary.primaryStatus).toBeNull();
    expect(summary.secondarySignals.map((signal) => signal.label)).toContain("待修正文稿");
    expect(summary.secondarySignals.find((signal) => signal.key === "status")?.tone).toBe("muted");
  });

  it("keeps review-later visible but softer inside the review-later filter", () => {
    const record = createRecord({
      reviewLater: true,
      originalContent: "这里已经有正文，但还没整理。",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getContextualRecordSummarySignals(record, "zh-CN", "review_later");

    expect(summary.primaryStatus?.label).toBe("待修正文稿");
    expect(summary.reviewLaterWeight).toBe("deemphasized");
    expect(summary.secondarySignals.find((signal) => signal.key === "reviewLater")?.tone).toBe("muted");
  });
});
