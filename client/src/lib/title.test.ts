import { describe, expect, it } from "vitest";

import { buildRecordTitle } from "./title";

describe("buildRecordTitle", () => {
  it("prefers user title", () => {
    expect(
      buildRecordTitle({
        userTitle: "我的标题",
        linkTitle: "link title",
        content: "content"
      })
    ).toBe("我的标题");
  });

  it("falls back to link title and content snippet", () => {
    expect(buildRecordTitle({ linkTitle: "video page", content: "这是一些正文内容" })).toBe("video page");
    expect(buildRecordTitle({ content: "这是一些正文内容，用来测试自动标题生成逻辑" })).toContain("这是一些正文内容");
  });

  it("builds unnamed title as the final fallback", () => {
    const result = buildRecordTitle({ createdAt: "2026-04-02T10:10:00.000Z" });
    expect(result).toContain("未命名记录");
  });
});
