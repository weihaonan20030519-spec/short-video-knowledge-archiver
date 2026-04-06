import { describe, expect, it } from "vitest";

import { deriveRecordListStatusKey, getRecordListStatus, matchesRecordStageFilter } from "./status";
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
