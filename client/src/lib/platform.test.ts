import { describe, expect, it } from "vitest";

import { detectPlatform, extractLinkTitle } from "./platform";

describe("platform helpers", () => {
  it("detects supported platforms", () => {
    expect(detectPlatform("https://www.tiktok.com/@a/video/1")).toBe("tiktok");
    expect(detectPlatform("https://www.bilibili.com/video/BV1xx")).toBe("bilibili");
    expect(detectPlatform("https://www.xiaohongshu.com/explore/abc")).toBe("xiaohongshu");
    expect(detectPlatform("https://example.com/page")).toBe("other");
  });

  it("extracts a readable link title", () => {
    expect(extractLinkTitle("https://example.com/path/my-video-note")).toBe("my video note");
  });
});
