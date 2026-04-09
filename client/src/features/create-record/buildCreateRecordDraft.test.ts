import { describe, expect, it } from "vitest";

import { buildCreateRecordDraft } from "./buildCreateRecordDraft";

describe("buildCreateRecordDraft", () => {
  it("keeps browser import as link input while preserving lightweight source information", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "browser_import",
      values: {
        inputMethod: "link",
        title: "  ",
        originalUrl: "",
        content: "手动补全的正文",
        folderId: "folder-1",
        tagsText: "方法, 复盘"
      },
      transcriptionResult: null,
      importResult: {
        source: "browser_context",
        platform: "bilibili",
        outcome: "partial",
        originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
        detectedTitle: "浏览器导入标题",
        detectedContent: "导入内容",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.inputMethod).toBe("link");
    expect(draft.originalUrl).toBe("https://www.bilibili.com/video/BV1xx411c7mD/");
    expect(draft.sourcePlatform).toBe("bilibili");
    expect(draft.tagNames).toEqual(["方法", "复盘"]);
    expect(draft.importSummary).toEqual({
      source: "browser_context",
      outcome: "partial",
      contentCompleteness: "partial"
    });
  });

  it("preserves source signals from the import snapshot without adding extra provenance guesses", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "paste_link",
      values: {
        inputMethod: "link",
        title: "",
        originalUrl: "",
        content: "",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: {
        source: "link_generic",
        platform: "other",
        outcome: "partial",
        originalUrl: "https://example.com/article",
        detectedTitle: "网页标题",
        detectedContent: "网页正文",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true,
        linkExtractionReport: {
          extractionSources: ["html_text", "image_ocr"],
          hasHtmlText: true,
          hasImageOcrText: true,
          htmlTextLength: 120,
          imageSignalsFound: 2,
          candidateImagesSelected: 2,
          ocrAttemptLimit: 3,
          candidateSelectionReasons: [],
          imageOcrAttempted: 2,
          imageOcrSucceeded: 2,
          imageOcrFailed: 0,
          imageOcrTextLength: 80,
          coverageLevel: "partial",
          ocrStatus: "successful"
        }
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.importSummary).toEqual({
      source: "link_generic",
      outcome: "partial",
      contentCompleteness: "partial",
      sourceSignals: {
        hasHtmlText: true,
        hasImageOcrText: true
      }
    });
  });

  it("prefers a non-empty trimmed user originalUrl over import snapshot originalUrl", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "paste_link",
      values: {
        inputMethod: "link",
        title: "",
        originalUrl: "  https://example.com/updated  ",
        content: "部分文本",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: {
        source: "link_generic",
        platform: "other",
        outcome: "partial",
        originalUrl: "https://example.com/old",
        detectedTitle: "旧标题",
        detectedContent: "旧内容",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.originalUrl).toBe("https://example.com/updated");
    expect(draft.sourcePlatform).toBe("other");
  });

  it("falls back to import snapshot platform when it is known and not unknown", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "paste_link",
      values: {
        inputMethod: "link",
        title: "",
        originalUrl: "https://unknown.example.com/path",
        content: "补充内容",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: {
        source: "link_generic",
        platform: "other",
        outcome: "partial",
        originalUrl: "https://example.com/old",
        detectedTitle: "旧标题",
        detectedContent: "旧内容",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.originalUrl).toBe("https://unknown.example.com/path");
    expect(draft.sourcePlatform).toBe("other");
  });

  it("uses import snapshot originalUrl when trimmed user originalUrl is empty", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "paste_link",
      values: {
        inputMethod: "link",
        title: "",
        originalUrl: "   ",
        content: "补充内容",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: {
        source: "link_generic",
        platform: "other",
        outcome: "partial",
        originalUrl: "https://example.com/old",
        detectedTitle: "旧标题",
        detectedContent: "旧内容",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.originalUrl).toBe("https://example.com/old");
  });

  it("falls back to detectPlatform when snapshot platform is unknown", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "paste_link",
      values: {
        inputMethod: "link",
        title: "",
        originalUrl: "https://tiktok.com/example",
        content: "补充内容",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: {
        source: "link_generic",
        platform: "unknown",
        outcome: "partial",
        originalUrl: "https://tiktok.com/example",
        detectedTitle: "旧标题",
        detectedContent: "旧内容",
        contentCompleteness: "partial",
        availableTracks: [],
        selectedTrackId: null,
        warnings: [],
        canCreateRecord: true,
        shouldPromptManualInput: true
      },
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.sourcePlatform).toBe("tiktok");
  });

  it("builds a blank draft without losing manual content", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "blank",
      values: {
        inputMethod: "manual",
        title: "",
        originalUrl: "",
        content: "从空白开始写下的内容",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: null,
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.inputMethod).toBe("manual");
    expect(draft.sourceType).toBe("manual");
    expect(draft.originalContent).toBe("从空白开始写下的内容");
    expect(draft.contentCompleteness).toBe("minimal");
  });

  it("preserves internal whitespace in manual draft content", () => {
    const draft = buildCreateRecordDraft({
      uiMode: "blank",
      values: {
        inputMethod: "manual",
        title: "",
        originalUrl: "",
        content: "第一行  保留空格\n第二行继续保留",
        folderId: null,
        tagsText: ""
      },
      transcriptionResult: null,
      importResult: null,
      createdAt: "2026-04-06T12:00:00.000Z"
    });

    expect(draft.originalContent).toBe("第一行  保留空格\n第二行继续保留");
    expect(draft.contentCompleteness).toBe("minimal");
  });
});
