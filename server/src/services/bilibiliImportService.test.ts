import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BilibiliImportError,
  extractBilibiliVideoId,
  formatBilibiliTranscript,
  importBilibiliTranscript
} from "./bilibiliImportService.js";

function createJsonResponse(data: unknown, options: { ok?: boolean; status?: number; url?: string } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    url: options.url ?? "",
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as Response;
}

function createTextResponse(text: string, options: { ok?: boolean; status?: number; url?: string } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    url: options.url ?? "",
    text: async () => text,
    json: async () => JSON.parse(text)
  } as Response;
}

function createBilibiliFetchMock() {
  return vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/x/web-interface/view")) {
      return createJsonResponse({
        code: 0,
        data: {
          title: "测试视频",
          pages: [{ cid: 12345 }]
        }
      });
    }

    if (url.includes("/x/player/wbi/v2")) {
      return createJsonResponse({
        code: 0,
        data: {
          subtitle: {
            subtitles: []
          }
        }
      });
    }

    if (url.includes("/x/player/v2")) {
      return createJsonResponse({
        code: 0,
        data: {
          subtitle: {
            subtitles: [
              {
                id: 1,
                subtitle_url: "//i0.hdslb.com/bfs/subtitle/manual.json",
                lan: "zh-CN",
                lan_doc: "中文"
              },
              {
                id: 2,
                subtitle_url: "//i0.hdslb.com/bfs/subtitle/ai.json",
                lan: "zh-CN",
                lan_doc: "中文（自动）",
                ai_type: 1
              }
            ]
          }
        }
      });
    }

    if (url.includes("/video/BV1xx411c7mD/")) {
      return createTextResponse("<html><body>no playinfo</body></html>");
    }

    if (url.includes("manual.json")) {
      return createJsonResponse({
        body: [{ content: "先明确目标" }, { content: "再拆步骤。" }]
      });
    }

    if (url.includes("ai.json")) {
      return createJsonResponse({
        body: [{ content: "AI字幕第一句" }, { content: "AI字幕第二句。" }]
      });
    }

    throw new Error(`Unhandled URL: ${url} ${(options && JSON.stringify(options)) || ""}`);
  });
}

describe("extractBilibiliVideoId", () => {
  it("extracts a bvid from standard bilibili links", () => {
    expect(extractBilibiliVideoId("https://www.bilibili.com/video/BV1xx411c7mD/?spm_id_from=333.999.0.0")).toBe(
      "BV1XX411C7MD"
    );
  });

  it("returns null for non-bilibili links", () => {
    expect(extractBilibiliVideoId("https://example.com/video/BV1xx411c7mD")).toBeNull();
  });
});

describe("formatBilibiliTranscript", () => {
  it("deduplicates repeated lines and keeps readable paragraph breaks", () => {
    const result = formatBilibiliTranscript([
      { content: "先明确目标" },
      { content: "先明确目标" },
      { content: "再拆步骤。" },
      { content: "最后复盘。" }
    ]);

    expect(result.rawTranscriptText).toBe("先明确目标\n再拆步骤。\n最后复盘。");
    expect(result.normalizedTranscriptText).toContain("先明确目标再拆步骤。");
    expect(result.normalizedTranscriptText).toContain("最后复盘。");
  });
});

describe("importBilibiliTranscript", () => {
  afterEach(() => {
    delete process.env.BILIBILI_SESSDATA;
    delete process.env.BILIBILI_COOKIE;
  });

  it("returns all subtitle tracks and exposes the chosen track", async () => {
    const fetchMock = createBilibiliFetchMock();

    const result = await importBilibiliTranscript(
      { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
      fetchMock as typeof fetch
    );

    expect(result.bvid).toBe("BV1XX411C7MD");
    expect(result.title).toBe("测试视频");
    expect(result.subtitleTracks).toHaveLength(2);
    expect(result.sourceMeta.cid).toBe("12345");
    expect(result.sourceMeta.fetchStrategy).toBe("player-v2");
    expect(result.sourceMeta.playerStrategiesTried).toEqual(["player-wbi", "player-v2", "page-playinfo"]);
    expect(result.debug.availableTrackCount).toBe(2);
    expect(result.selectedTrackId).toBe(result.subtitleTracks[0]?.id);
    expect(result.normalizedTranscriptText).toBe("先明确目标再拆步骤。");
  });

  it("supports importing a user-selected subtitle track", async () => {
    const firstFetch = createBilibiliFetchMock();
    const initial = await importBilibiliTranscript(
      { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
      firstFetch as typeof fetch
    );
    const aiTrack = initial.subtitleTracks.find((track) => track.isAiSubtitle);
    expect(aiTrack).toBeDefined();

    const secondFetch = createBilibiliFetchMock();
    const result = await importBilibiliTranscript(
      { url: "https://www.bilibili.com/video/BV1xx411c7mD/", preferredTrackId: aiTrack?.id },
      secondFetch as typeof fetch
    );

    expect(result.selectedTrackId).toBe(aiTrack?.id);
    expect(result.debug.selectedTrackReason).toBe("preferred-track");
    expect(result.normalizedTranscriptText).toBe("AI字幕第一句AI字幕第二句。");
  });

  it("returns probe details when no subtitle tracks are exposed", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/x/web-interface/view")) {
        return createJsonResponse({
          code: 0,
          data: {
            title: "无字幕视频",
            pages: [{ cid: 12345 }]
          }
        });
      }

      if (url.includes("/x/player/wbi/v2") || url.includes("/x/player/v2")) {
        return createJsonResponse({
          code: 0,
          data: {
            subtitle: {
              subtitles: []
            }
          }
        });
      }

      if (url.includes("/video/BV1xx411c7mD/")) {
        return createTextResponse("<html><body>no playinfo</body></html>");
      }

      throw new Error(`Unhandled URL: ${url}`);
    });

    await expect(
      importBilibiliTranscript(
        { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
        fetchMock as typeof fetch
      )
    ).rejects.toMatchObject({
      code: "SUBTITLE_UNAVAILABLE",
      data: {
        title: "无字幕视频",
        subtitleTracks: [],
        debug: {
          selectedTrackReason: "none",
          availableTrackCount: 0,
          failureStage: "probe-subtitle-list",
          notes: expect.any(Array) as string[]
        }
      }
    });
  });

  it("uses the optional bilibili cookie when configured", async () => {
    process.env.BILIBILI_SESSDATA = "test-session";
    const fetchMock = createBilibiliFetchMock();

    const result = await importBilibiliTranscript(
      { url: "https://www.bilibili.com/video/BV1xx411c7mD/" },
      fetchMock as typeof fetch
    );

    expect(result.sourceMeta.usedCookie).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "SESSDATA=test-session"
        })
      })
    );
  });
});
