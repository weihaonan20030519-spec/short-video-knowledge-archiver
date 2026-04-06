import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchSubtitleBodyForTrack,
  hydrateSelectedTrackContent
} from "./browserContextTrackResolver.js";

describe("browserContextTrackResolver", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads a selected track body from subtitle json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            body: [{ content: "第一句字幕" }, { content: "第二句字幕" }]
          })
      })
    );

    const result = await fetchSubtitleBodyForTrack("https://example.com/subtitle.json");
    expect(result.bodyLoadStatus).toBe("loaded");
    expect(result.cueCount).toBe(2);
    expect(result.contentText).toContain("第一句字幕");
    expect(result.contentText).toContain("第二句字幕");
  });

  it("marks subtitle fetch failures when the track body request is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => ""
      })
    );

    const result = await fetchSubtitleBodyForTrack("https://example.com/subtitle.json");
    expect(result.bodyLoadStatus).toBe("fetch_failed");
    expect(result.bodyLoadError).toBe("http_403");
  });

  it("rehydrates the chosen track body and updates the payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              body: [{ content: "切换后的第一句" }, { content: "切换后的第二句" }]
            }
          })
      })
    );

    const hydrated = await hydrateSelectedTrackContent(
      {
        page: {
          title: "切换轨道测试",
          url: "https://www.bilibili.com/video/BV1xx411c7mD/",
          platform: "bilibili"
        },
        selectedTrackId: "track-1",
        subtitleTracks: [
          {
            id: "track-1",
            label: "中文",
            subtitleUrl: "https://example.com/track-1.json",
            contentText: "已缓存正文",
            contentSource: "full_track",
            cueCount: 2,
            bodyLoadStatus: "loaded"
          },
          {
            id: "track-2",
            label: "中文（自动）",
            subtitleUrl: "https://example.com/track-2.json",
            contentText: "",
            contentSource: "unavailable",
            cueCount: 0,
            bodyLoadStatus: "unavailable"
          }
        ],
        debug: {
          notes: [],
          fetchStrategy: "browser-context"
        }
      },
      "track-2"
    );

    expect(hydrated.payload.selectedTrackId).toBe("track-2");
    expect(hydrated.foundTrack?.contentText).toContain("切换后的第一句");
    expect(hydrated.foundTrack?.bodyLoadStatus).toBe("loaded");
    expect(hydrated.refetched).toBe(true);
  });
});
