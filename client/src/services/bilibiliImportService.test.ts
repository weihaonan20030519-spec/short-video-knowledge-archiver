import { describe, expect, it, vi } from "vitest";

import { importBilibiliSubtitle } from "./bilibiliImportService";

describe("importBilibiliSubtitle", () => {
  it("calls the bilibili import endpoint with an optional preferred track id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          title: "测试视频",
          bvid: "BV1XX411C7MD",
          originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
          subtitleTracks: [
            {
              id: "track-manual",
              label: "中文",
              language: "zh-CN",
              isAiSubtitle: false,
              subtitleUrl: "https://example.com/manual.json"
            }
          ],
          selectedTrackId: "track-manual",
          rawTranscriptText: "第一句\n第二句",
          normalizedTranscriptText: "第一句第二句",
          sourceMeta: {
            cid: "12345",
            usedCookie: false,
            fetchStrategy: "player-v2",
            playerStrategiesTried: ["player-wbi", "player-v2"],
            subtitleLanguage: "中文"
          },
          debug: {
            selectedTrackReason: "preferred-track",
            availableTrackCount: 1,
            failureStage: null,
            notes: []
          }
        },
        error: null
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await importBilibiliSubtitle(
      "https://www.bilibili.com/video/BV1xx411c7mD/",
      "track-manual"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/import/bilibili",
      expect.objectContaining<RequestInit>({
        method: "POST"
      })
    );
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(options.body))).toEqual({
      url: "https://www.bilibili.com/video/BV1xx411c7mD/",
      preferredTrackId: "track-manual"
    });
    expect(result.success).toBe(true);
  });
});
