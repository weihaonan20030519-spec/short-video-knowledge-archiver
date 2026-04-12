import { describe, expect, it } from "vitest";

import { canResumeTranscription, isValidHttpUrl } from "./transcriptionResume";
import { createLearningAiSlot } from "./aiTransform";
import { createRecord } from "../test/factories";

describe("isValidHttpUrl", () => {
  it("accepts http and https urls", () => {
    expect(isValidHttpUrl("https://example.com/post")).toBe(true);
    expect(isValidHttpUrl("http://example.com/post")).toBe(true);
  });

  it("rejects empty or invalid urls", () => {
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl("notaurl")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
  });
});

describe("canResumeTranscription", () => {
  it("returns true for link records with saved url, idle status, and no source content", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/123",
      originalContent: "   ",
      transcriptionStatus: "idle"
    });

    expect(canResumeTranscription(record)).toBe(true);
  });

  it("returns false when the original url is missing or invalid", () => {
    expect(
      canResumeTranscription(
        createRecord({
          inputMethod: "link",
          sourceType: "link",
          sourcePlatform: "other",
          originalUrl: null,
          originalContent: " ",
          transcriptionStatus: "idle"
        })
      )
    ).toBe(false);

    expect(
      canResumeTranscription(
        createRecord({
          inputMethod: "link",
          sourceType: "link",
          sourcePlatform: "other",
          originalUrl: "invalid-url",
          originalContent: " ",
          transcriptionStatus: "idle"
        })
      )
    ).toBe(false);
  });

  it("returns false when the record already has source content", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/123",
      originalContent: "这里已经有正文了。",
      transcriptionStatus: "idle"
    });

    expect(canResumeTranscription(record)).toBe(false);
  });

  it("returns false for non-link records", () => {
    const record = createRecord({
      inputMethod: "upload",
      sourceType: "audio",
      sourcePlatform: "unknown",
      originalUrl: null,
      originalContent: " ",
      transcriptionStatus: "idle"
    });

    expect(canResumeTranscription(record)).toBe(false);
  });

  it("returns false for bilibili records or browser-context imports", () => {
    expect(
      canResumeTranscription(
        createRecord({
          inputMethod: "link",
          sourceType: "link",
          sourcePlatform: "bilibili",
          originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
          originalContent: " ",
          transcriptionStatus: "idle"
        })
      )
    ).toBe(false);

    expect(
      canResumeTranscription(
        createRecord({
          inputMethod: "link",
          sourceType: "link",
          sourcePlatform: "other",
          originalUrl: "https://example.com/article/123",
          originalContent: " ",
          transcriptionStatus: "idle",
          importSummary: {
            source: "browser_context",
            outcome: "needs_user_input",
            contentCompleteness: "empty"
          }
        })
      )
    ).toBe(false);
  });

  it("returns false when ai output already exists", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/123",
      originalContent: " ",
      transcriptionStatus: "idle",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "已有整理结果。",
            logicFramework: [],
            keyDetails: [],
            reusablePoints: []
          },
          "2026-04-08T12:00:00.000Z"
        )
      }
    });

    expect(canResumeTranscription(record)).toBe(false);
  });
});
