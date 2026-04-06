import { describe, expect, it, vi } from "vitest";

import {
  applyBrowserTrackSelection,
  readBrowserContextImportSession,
  startBrowserContextImportSession
} from "./browserContextImportService";
import type { ImportResult } from "./importTypes";

describe("browserContextImportService", () => {
  it("starts browser import sessions through the session endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          sessionToken: "session-123",
          expiresAt: "2026-04-04T12:00:00.000Z"
        },
        error: null
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const session = await startBrowserContextImportSession();
    expect(session.sessionToken).toBe("session-123");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/import/browser-context/session",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("maps ready browser import sessions to import results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          sessionToken: "session-123",
          status: "ready",
          expiresAt: "2026-04-04T12:00:00.000Z",
          result: {
            source: "browser_context",
            platform: "bilibili",
            outcome: "complete",
            originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
            detectedTitle: "浏览器导入标题",
            detectedContent:
              "这是一段足够长的浏览器导入正文，会被映射为可直接整理的完整内容，并保留多轨选择信息。",
            contentCompleteness: "full",
            availableTracks: [
              {
                id: "track-1",
                label: "中文",
                language: "zh-CN",
                isAiSubtitle: false,
                subtitleUrl: null,
                contentSource: "full_track",
                cueCount: 6
              }
            ],
            selectedTrackId: "track-1",
            warningCodes: [],
            canCreateRecord: true,
            shouldPromptManualInput: false,
            trackContentById: {
              "track-1": "这是一段足够长的浏览器导入正文，会被映射为可直接整理的完整内容，并保留多轨选择信息。"
            },
            debugMeta: {
              fetchStrategy: "browser-context"
            }
          }
        },
        error: null
      })
    }));

    const state = await readBrowserContextImportSession("session-123", "zh-CN");
    expect(state.status).toBe("ready");
    expect(state.importResult?.source).toBe("browser_context");
    expect(state.importResult?.outcome).toBe("complete");
  });

  it("treats sessions with an import result as terminal even if status is still pending", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          sessionToken: "session-123",
          status: "pending",
          expiresAt: "2026-04-04T12:00:00.000Z",
          result: {
            source: "browser_context",
            platform: "bilibili",
            outcome: "needs_user_input",
            originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
            detectedTitle: "只有标题的浏览器导入",
            detectedContent: null,
            contentCompleteness: "empty",
            availableTracks: [],
            selectedTrackId: null,
            warningCodes: ["MANUAL_COMPLETION_REQUIRED"],
            canCreateRecord: true,
            shouldPromptManualInput: true,
            trackContentById: {},
            debugMeta: {
              fetchStrategy: "browser-context-page-world"
            }
          }
        },
        error: null
      })
    }));

    const state = await readBrowserContextImportSession("session-123", "zh-CN");
    expect(state.status).toBe("pending");
    expect(state.importResult?.outcome).toBe("needs_user_input");
    expect(state.importResult?.shouldPromptManualInput).toBe(true);
  });

  it("turns expired sessions into failed_but_creatable import results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          sessionToken: "session-123",
          status: "expired",
          expiresAt: "2026-04-04T12:00:00.000Z",
          result: null
        },
        error: null
      })
    }));

    const state = await readBrowserContextImportSession("session-123", "zh-CN");
    expect(state.importResult?.outcome).toBe("failed_but_creatable");
    expect(state.importResult?.canCreateRecord).toBe(true);
  });

  it("recomputes the browser import result when a different track is selected", () => {
    const result: ImportResult = {
      source: "browser_context",
      platform: "bilibili",
      outcome: "partial",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      detectedTitle: "浏览器导入标题",
      detectedContent: "当前较短内容",
      contentCompleteness: "partial",
      availableTracks: [
        { id: "track-1", label: "中文", contentSource: "unavailable", cueCount: 0 },
        { id: "track-2", label: "中文（自动）", contentSource: "full_track", cueCount: 6 }
      ],
      selectedTrackId: "track-1",
      warnings: [],
      canCreateRecord: true,
      shouldPromptManualInput: true,
      trackContentById: {
        "track-1": "当前较短内容",
        "track-2":
          "这是另一条足够长的字幕内容，会在切换轨道后把结果重新映射成 complete，并允许用户直接进入整理。这里继续补充说明这条轨道里的上下文、执行步骤、注意事项和适用边界，让导入正文达到完整内容阈值。再补上一段案例拆解、关键动作、风险提示和适用范围说明，确保内容长度稳定超过完整导入阈值。"
      }
    };

    const next = applyBrowserTrackSelection(result, "track-2", "zh-CN");
    expect(next.selectedTrackId).toBe("track-2");
    expect(next.outcome).toBe("complete");
    expect(next.contentCompleteness).toBe("full");
    expect(next.debugMeta?.notes).toContain("selected_track_body_status:loaded");
    expect(next.debugMeta?.notes).toContain("import_result_source:full_track");
  });

  it("keeps visible-caption fallbacks out of complete even when text is non-empty", () => {
    const result: ImportResult = {
      source: "browser_context",
      platform: "bilibili",
      outcome: "partial",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      detectedTitle: "浏览器导入标题",
      detectedContent: "当前较短内容",
      contentCompleteness: "partial",
      availableTracks: [
        { id: "track-visible", label: "中文（当前字幕）", contentSource: "visible_caption", cueCount: 1 }
      ],
      selectedTrackId: "track-visible",
      warnings: [],
      canCreateRecord: true,
      shouldPromptManualInput: true,
      trackContentById: {
        "track-visible": "这只是播放器当前显示的一句字幕。"
      }
    };

    const next = applyBrowserTrackSelection(result, "track-visible", "zh-CN");
    expect(next.outcome).not.toBe("complete");
    expect(next.warnings.map((warning) => warning.code)).toContain("VISIBLE_CAPTION_ONLY");
    expect(next.warnings.map((warning) => warning.code)).toContain("TRANSCRIPT_TOO_SHORT");
    expect(next.debugMeta?.notes).toContain("selected_track_body_status:loaded");
    expect(next.debugMeta?.notes).toContain("import_result_source:visible_caption");
  });
});
