import { describe, expect, it } from "vitest";

import {
  deriveRecordListStatusKey,
  getDisplayedTranscriptionStatusLabel,
  getRecordListStatus,
  getSidebarFilterPresentation,
  matchesRecordStageFilter
} from "./status";
import { createRecord } from "../test/factories";

describe("getRecordListStatus", () => {
  it("returns not started for untouched records", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("未开始");
  });

  it("returns needs review for manual content before AI results exist", () => {
    const record = createRecord({
      originalContent: "用户手动输入的原文内容",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("待修正文稿");
  });

  it("keeps needs review above historical transcription failure when editable source text exists", () => {
    const record = createRecord({
      originalContent: "已有可编辑原文",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("待修正文稿");
  });

  it("returns transcript ready when there is no AI result and no source text edge case", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_ready",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("转写已就绪");
  });

  it("returns organized when an AI result exists", () => {
    const record = createRecord({
      aiStatus: "done",
      aiOutputs: {
        concise: {
          mode: "concise",
          generatedAt: "2026-04-06T10:00:00.000Z",
          lastEditedAt: null,
          version: 1,
          originalResult: { summary: "总结", bullets: [] },
          currentResult: { summary: "总结", bullets: [] }
        },
        learning: null
      }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("已整理");
  });

  it("returns processing while AI is currently running even if prior content exists", () => {
    const record = createRecord({
      originalContent: "已有原文",
      transcriptionStatus: "transcript_ready",
      aiStatus: "processing",
      aiOutputs: { concise: null, learning: null }
    });

    expect(getRecordListStatus(record, "zh-CN").label).toBe("整理中");
  });

  it("uses the same derived key for needs review filtering", () => {
    const record = createRecord({
      originalContent: "用户手动补充的原文",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(deriveRecordListStatusKey(record)).toBe("needs_review");
    expect(matchesRecordStageFilter(record, "needs_review")).toBe(true);
  });

  it("keeps failed transcription inside unorganized but not needs review when no source text exists", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    expect(deriveRecordListStatusKey(record)).toBe("transcription_failed");
    expect(matchesRecordStageFilter(record, "unorganized")).toBe(true);
    expect(matchesRecordStageFilter(record, "needs_review")).toBe(false);
  });
});

describe("getDisplayedTranscriptionStatusLabel", () => {
  it("keeps idle when source content is still empty", () => {
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "idle"
    });

    expect(getDisplayedTranscriptionStatusLabel(record, "zh-CN")).toBe("未开始");
  });

  it("shows ready-to-organize when idle records already have source content", () => {
    const record = createRecord({
      originalContent: "已经补回的原文内容",
      transcriptionStatus: "idle"
    });

    expect(getDisplayedTranscriptionStatusLabel(record, "zh-CN")).toBe("待整理");
  });

  it("keeps other transcription states unchanged", () => {
    const record = createRecord({
      originalContent: "已经补回的原文内容",
      transcriptionStatus: "transcript_ready"
    });

    expect(getDisplayedTranscriptionStatusLabel(record, "zh-CN")).toBe("转写已就绪");
  });
});

describe("getSidebarFilterPresentation", () => {
  it("labels the wide unorganized bucket as needs attention while keeping its broad match range", () => {
    const notStartedRecord = createRecord({
      originalContent: " ",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });
    const needsReviewRecord = createRecord({
      originalContent: "已有正文，但还没整理。",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });
    const failedRecord = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getSidebarFilterPresentation("unorganized", "zh-CN");

    expect(summary.label).toBe("待处理");
    expect(summary.emptyTitle).toBe("暂无待处理记录");
    expect(summary.matchesRecord(notStartedRecord)).toBe(true);
    expect(summary.matchesRecord(needsReviewRecord)).toBe(true);
    expect(summary.matchesRecord(failedRecord)).toBe(true);
  });

  it("labels the not started child bucket and matches only untouched records", () => {
    const notStartedRecord = createRecord({
      originalContent: " ",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });
    const needsReviewRecord = createRecord({
      originalContent: "已有正文，但还没整理。",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getSidebarFilterPresentation("not_started", "zh-CN");

    expect(summary.label).toBe("未开始");
    expect(summary.emptyTitle).toBe("暂无未开始记录");
    expect(summary.matchesRecord(notStartedRecord)).toBe(true);
    expect(summary.matchesRecord(needsReviewRecord)).toBe(false);
  });

  it("keeps needs review scoped to pending drafts only", () => {
    const needsReviewRecord = createRecord({
      originalContent: "已有正文，但还没整理。",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });
    const notStartedRecord = createRecord({
      originalContent: " ",
      transcriptionStatus: "idle",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    const summary = getSidebarFilterPresentation("needs_review", "zh-CN");

    expect(summary.label).toBe("待修正文稿");
    expect(summary.matchesRecord(needsReviewRecord)).toBe(true);
    expect(summary.matchesRecord(notStartedRecord)).toBe(false);
  });
});
