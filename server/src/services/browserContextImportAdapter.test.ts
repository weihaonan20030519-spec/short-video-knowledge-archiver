import { describe, expect, it } from "vitest";

import { buildBrowserContextImportResult } from "./browserContextImportAdapter.js";

describe("browserContextImportAdapter", () => {
  it("maps full subtitle-track content to complete without treating it as a single cue", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "B站视频标题",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili",
        bvid: "BV1xx411c7mD",
        cid: "12345"
      },
      subtitleTracks: [
        {
          id: "track-ai",
          label: "中文（自动）",
          language: "zh-CN",
          isAiSubtitle: true,
          contentSource: "full_track",
          cueCount: 8,
          contentText:
            "这是一段足够长的浏览器字幕内容，会被映射为完整导入，并直接用于后续整理。这里继续补充执行细节、适用条件和风险提醒，确保长度超过完整导入阈值。再补上案例背景、关键动作、风险边界和后续建议，让正文长度稳定超过 full 的判断线。最后补充一段总结和复用建议，确保样本长度明显超过完整内容阈值。"
        }
      ],
      selectedTrackId: "track-ai",
      debug: {
        notes: ["read from browser context"],
        fetchStrategy: "browser-context"
      }
    });

    expect(result.outcome).toBe("complete");
    expect(result.selectedTrackId).toBe("track-ai");
    expect(result.contentCompleteness).toBe("full");
    expect(result.warningCodes).not.toContain("TRANSCRIPT_TOO_SHORT");
    expect(result.debugMeta?.notes).toContain("import_result_source:full_track");
    expect(result.debugMeta?.notes).toContain("selected_track_body_status:loaded");
  });

  it("does not treat a visible single caption as complete", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "只有当前字幕句",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili"
      },
      subtitleTracks: [
        {
          id: "track-visible",
          label: "中文（自动）",
          contentSource: "unavailable",
          cueCount: 0,
          contentText: ""
        }
      ],
      visibleCaptionText: "这一句只是播放器当前正在显示的字幕。"
    });

    expect(result.outcome).not.toBe("complete");
    expect(result.warningCodes).toContain("VISIBLE_CAPTION_ONLY");
    expect(result.warningCodes).toContain("TRANSCRIPT_TOO_SHORT");
    expect(result.warningCodes).toContain("MANUAL_COMPLETION_REQUIRED");
  });

  it("keeps subtitle tracks visible when tracks exist but the selected track cannot be fetched", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "只有部分文本",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili"
      },
      descriptionText:
        "这是部分文本，但还不够完整。不过它已经包含了问题背景、一个关键步骤和初步建议，所以应该被识别为 partial。",
      subtitleTracks: [
        {
          id: "track-1",
          label: "中文",
          contentSource: "unavailable",
          cueCount: 0,
          contentText: "",
          bodyLoadStatus: "fetch_failed"
        },
        {
          id: "track-2",
          label: "中文（自动）",
          contentSource: "unavailable",
          cueCount: 0,
          contentText: ""
        }
      ]
    });

    expect(result.outcome).toBe("partial");
    expect(result.selectedTrackId).toBe("track-1");
    expect(result.warningCodes).toContain("MULTIPLE_TRACKS_NEED_SELECTION");
    expect(result.warningCodes).toContain("SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE");
    expect(result.warningCodes).toContain("SUBTITLE_BODY_FETCH_FAILED");
    expect(result.warningCodes).toContain("FALLBACK_TO_VISIBLE_TEXT");
    expect(result.warningCodes).toContain("MANUAL_COMPLETION_REQUIRED");
    expect(result.debugMeta?.notes).toContain("import_result_source:visible_text");
    expect(result.debugMeta?.notes).toContain("selected_track_body_status:fallback");
  });

  it("does not treat track metadata without body text as complete even when a track is selected", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "检测到轨道但没正文",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili"
      },
      selectedTrackId: "track-ai",
      subtitleTracks: [
        {
          id: "track-ai",
          label: "中文（自动）",
          contentSource: "unavailable",
          cueCount: 0,
          contentText: "",
          bodyLoadStatus: "empty"
        }
      ],
      visibleText: "这里只拿到了简介和少量页面文本，还不足以视为完整字幕正文。"
    });

    expect(result.selectedTrackId).toBe("track-ai");
    expect(result.outcome).not.toBe("complete");
    expect(result.warningCodes).toContain("SUBTITLE_BODY_EMPTY");
    expect(result.warningCodes).toContain("FALLBACK_TO_VISIBLE_TEXT");
    expect(result.warningCodes).toContain("MANUAL_COMPLETION_REQUIRED");
  });

  it("maps title and page text without a transcript to partial or needs_user_input instead of complete", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "没有字幕",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili"
      },
      descriptionText: "这里有一小段简介，但没有完整字幕或转写，仍然需要用户自行补充正文。"
    });

    expect(result.outcome).toBe("partial");
    expect(result.warningCodes).toContain("SUBTITLE_TRACK_UNAVAILABLE");
    expect(result.warningCodes).toContain("MANUAL_COMPLETION_REQUIRED");
  });

  it("maps missing text to needs_user_input without treating it as a process failure", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "没有正文",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        platform: "bilibili"
      }
    });

    expect(result.outcome).toBe("needs_user_input");
    expect(result.warningCodes).toContain("TRANSCRIPT_NOT_FOUND");
    expect(result.warningCodes).toContain("SUBTITLE_TRACK_UNAVAILABLE");
  });

  it("maps invalid browser payloads to failed_but_creatable", () => {
    const result = buildBrowserContextImportResult({
      page: {
        title: "坏链接",
        url: "",
        platform: "bilibili"
      }
    });

    expect(result.outcome).toBe("failed_but_creatable");
    expect(result.warningCodes).toContain("INVALID_URL");
  });
});
