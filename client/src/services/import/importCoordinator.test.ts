import { describe, expect, it, vi } from "vitest";

import {
  buildRecordImportSnapshot,
  deriveImportFlowState,
  resolveImport
} from "./importCoordinator";

function createBilibiliPayload(overrides: Partial<{
  title: string | null;
  normalizedTranscriptText: string;
  selectedTrackId: string | null;
  subtitleTracks: Array<{
    id: string;
    label: string;
    language: string | null;
    isAiSubtitle: boolean;
    subtitleUrl: string | null;
  }>;
  usedCookie: boolean;
}> = {}) {
  return {
    title: overrides.title ?? "B站方法论视频",
    bvid: "BV1XX411C7MD",
    originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
    subtitleTracks:
      overrides.subtitleTracks ??
      [
        {
          id: "track-manual",
          label: "中文",
          language: "zh-CN",
          isAiSubtitle: false,
          subtitleUrl: "https://example.com/manual.json"
        }
      ],
    selectedTrackId: overrides.selectedTrackId ?? "track-manual",
    rawTranscriptText: "第一句\n第二句",
    normalizedTranscriptText:
      overrides.normalizedTranscriptText ??
      "这是一段足够长的字幕内容，用来验证完整导入场景是否会被映射为 complete，并且允许创建后直接进入 AI 整理。这里继续补充更多步骤说明、方法拆解和注意事项，让导入内容稳定达到完整阈值。随后再追加案例背景、执行顺序、复盘建议、风险提醒和适用条件，确保正文长度明显高于完整导入阈值。",
    sourceMeta: {
      cid: "12345",
      usedCookie: overrides.usedCookie ?? false,
      fetchStrategy: "player-v2",
      playerStrategiesTried: ["player-wbi", "player-v2"],
      subtitleLanguage: "zh-CN"
    },
    debug: {
      selectedTrackReason: "auto-priority",
      availableTrackCount: overrides.subtitleTracks?.length ?? 1,
      failureStage: null,
      notes: []
    }
  };
}

function createArticleExtractionReport(overrides: Partial<{
  extractionSources: Array<"html_text" | "meta_excerpt" | "image_ocr">;
  hasHtmlText: boolean;
  hasImageOcrText: boolean;
  htmlTextLength: number;
  imageSignalsFound: number;
  candidateImagesSelected: number;
  ocrAttemptLimit: number;
  candidateSelectionReasons: Array<"limited_by_cap" | "filtered_non_body_images" | "partial_page_signals_only">;
  imageOcrAttempted: number;
  imageOcrSucceeded: number;
  imageOcrTextLength: number;
  ocrStatus: "not_applicable" | "not_attempted" | "provider_unavailable" | "attempted_no_text" | "partial" | "successful";
  coverageLevel: "full" | "partial" | "limited" | "minimal";
}> = {}) {
  return {
    extractionSources: overrides.extractionSources ?? ["html_text"],
    hasHtmlText: overrides.hasHtmlText ?? true,
    hasImageOcrText: overrides.hasImageOcrText ?? false,
    htmlTextLength: overrides.htmlTextLength ?? 180,
    imageSignalsFound: overrides.imageSignalsFound ?? 0,
    candidateImagesSelected: overrides.candidateImagesSelected ?? 0,
    ocrAttemptLimit: overrides.ocrAttemptLimit ?? 3,
    candidateSelectionReasons: overrides.candidateSelectionReasons ?? [],
    imageOcrAttempted: overrides.imageOcrAttempted ?? 0,
    imageOcrSucceeded: overrides.imageOcrSucceeded ?? 0,
    imageOcrTextLength: overrides.imageOcrTextLength ?? 0,
    ocrStatus: overrides.ocrStatus ?? "not_applicable",
    coverageLevel: overrides.coverageLevel ?? "full"
  };
}

describe("importCoordinator", () => {
  it("maps manual text with enough content to a complete import result", async () => {
    const session = await resolveImport({
      inputMethod: "text",
      content:
        "这是一段足够长的原始内容，用来确保手动文本导入会进入 complete 状态，并且创建后可以直接去做 AI 整理。这里继续补充额外的上下文、做法、限制条件和行动建议，让文本长度稳定超过完整导入阈值。再追加一段案例说明、失败原因、操作细节、复盘建议和可执行步骤，用来覆盖完整导入场景所需的正文长度。",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("complete");
    expect(session.result?.contentCompleteness).toBe("full");
    expect(session.result?.shouldPromptManualInput).toBe(false);
    expect(deriveImportFlowState(session.result)).toBe("ready_complete");
  });

  it("maps meta-only article imports to needs_user_input without blocking creation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          originalUrl: "https://example.com/article/123",
          resolvedUrl: "https://example.com/article/123",
          platform: "other",
          title: "Example Article",
          excerpt: "Only a short summary is available.",
          contentText: "Only a short summary is available.",
          fetchSucceeded: true,
          extractionMethod: "meta_fallback",
          extractionReport: createArticleExtractionReport({
            extractionSources: ["meta_excerpt"],
            hasHtmlText: false,
            htmlTextLength: 0,
            coverageLevel: "minimal"
          }),
          warnings: [
            {
              code: "META_ONLY",
              message: "meta only"
            },
            {
              code: "MANUAL_COMPLETION_REQUIRED",
              message: "manual completion required"
            }
          ]
        },
        error: null
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://example.com/article/123",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("needs_user_input");
    expect(session.result?.canCreateRecord).toBe(true);
    expect(session.result?.warnings.map((warning) => warning.code)).toEqual(["META_ONLY", "MANUAL_COMPLETION_REQUIRED"]);
    expect(deriveImportFlowState(session.result)).toBe("ready_manual_completion");
  });

  it("maps article import network failures to failed_but_creatable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failed")));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://www.xiaohongshu.com/explore/abc123",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("failed_but_creatable");
    expect(session.result?.platform).toBe("other");
    expect(session.result?.warnings.map((warning) => warning.code)).toContain("FETCH_FAILED");
    expect(deriveImportFlowState(session.result)).toBe("error_but_can_continue");
  });

  it("maps blocked article targets to failed_but_creatable without pretending extraction succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          originalUrl: "http://127.0.0.1/private",
          resolvedUrl: "http://127.0.0.1/private",
          platform: "unknown",
          title: null,
          excerpt: null,
          contentText: null,
          fetchSucceeded: false,
          extractionMethod: "none",
          extractionReport: createArticleExtractionReport({
            extractionSources: [],
            hasHtmlText: false,
            htmlTextLength: 0,
            coverageLevel: "minimal"
          }),
          warnings: [
            {
              code: "SECURITY_BLOCKED",
              message: "blocked"
            }
          ]
        },
        error: null
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "http://127.0.0.1/private",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("failed_but_creatable");
    expect(session.result?.warnings.map((warning) => warning.code)).toContain("SECURITY_BLOCKED");
    expect(deriveImportFlowState(session.result)).toBe("error_but_can_continue");
  });

  it("maps a successful bilibili transcript import to complete and preserves import summary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: createBilibiliPayload(),
        error: null
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("complete");
    expect(session.result?.contentCompleteness).toBe("full");

    expect(buildRecordImportSnapshot(session.result).importSummary).toEqual({
      source: "link_bilibili_server",
      outcome: "complete",
      contentCompleteness: "full"
    });
  });

  it("keeps html-only imports with unresolved image coverage out of the complete state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          originalUrl: "https://www.xiaohongshu.com/explore/ocr-gap",
          resolvedUrl: "https://www.xiaohongshu.com/explore/ocr-gap",
          platform: "xiaohongshu",
          title: "图文笔记",
          excerpt: null,
          contentText:
            "这里已经提取到较长的网页正文，但页面里还有正文图片没有完成 OCR，所以这一轮不应该再被映射成 complete。这里继续补充足够长度的段落，确保纯文本长度本身已经超过完整阈值。",
          fetchSucceeded: true,
          extractionMethod: "readability",
          extractionReport: createArticleExtractionReport({
            extractionSources: ["html_text"],
            htmlTextLength: 160,
            imageSignalsFound: 4,
            candidateImagesSelected: 2,
            candidateSelectionReasons: ["filtered_non_body_images"],
            ocrStatus: "provider_unavailable",
            coverageLevel: "partial"
          }),
          warnings: [
            {
              code: "OCR_PROVIDER_UNAVAILABLE",
              message: "ocr unavailable"
            }
          ]
        },
        error: null
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://www.xiaohongshu.com/explore/ocr-gap",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("partial");
    expect(session.result?.contentCompleteness).toBe("partial");
    expect(session.result?.platform).toBe("other");
    expect(session.result?.linkExtractionReport?.ocrStatus).toBe("provider_unavailable");
  });

  it("keeps multi-track imports in awaiting_track_selection and marks weak content as needs_user_input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: createBilibiliPayload({
          normalizedTranscriptText: "",
          selectedTrackId: null,
          subtitleTracks: [
            {
              id: "track-manual",
              label: "中文",
              language: "zh-CN",
              isAiSubtitle: false,
              subtitleUrl: "https://example.com/manual.json"
            },
            {
              id: "track-ai",
              label: "中文（自动）",
              language: "zh-CN",
              isAiSubtitle: true,
              subtitleUrl: "https://example.com/ai.json"
            }
          ]
        }),
        error: null
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("needs_user_input");
    expect(session.result?.warnings.map((warning) => warning.code)).toContain("MULTIPLE_TRACKS_NEED_SELECTION");
    expect(session.flowState).toBe("awaiting_track_selection");
  });

  it("maps request failures to failed_but_creatable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        data: createBilibiliPayload({
          normalizedTranscriptText: "",
          selectedTrackId: null
        }),
        error: {
          code: "BILIBILI_REQUEST_FAILED",
          message: "network failed"
        }
      })
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      appLanguage: "zh-CN"
    });

    expect(session.result?.outcome).toBe("failed_but_creatable");
    expect(session.result?.warnings.map((warning) => warning.code)).toContain("NETWORK_ERROR");
    expect(session.flowState).toBe("error_but_can_continue");
  });
});
