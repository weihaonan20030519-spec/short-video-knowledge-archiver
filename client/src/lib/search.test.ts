import { describe, expect, it } from "vitest";

import { buildRecordSearchText } from "./search";
import type { RecordItem, Tag } from "../types/domain";

describe("buildRecordSearchText", () => {
  it("includes title, notes, AI result, and tags", () => {
    const tags: Tag[] = [
      {
        id: "tag-1",
        name: "运营",
        createdAt: "2026-04-02T10:00:00.000Z",
        updatedAt: "2026-04-02T10:00:00.000Z"
      }
    ];

    const record: RecordItem = {
      id: "rec-1",
      title: "爆款拆解",
      sourcePlatform: "bilibili",
      sourceType: "text",
      inputMethod: "text",
      originalUrl: null,
      folderId: "folder-1",
      tagIds: ["tag-1"],
      createdAt: "2026-04-02T10:00:00.000Z",
      updatedAt: "2026-04-02T10:00:00.000Z",
      watchedAt: null,
      lastViewedAt: null,
      originalContent: "这是一段原始内容",
      personalNote: "我自己的复盘",
      reviewLater: false,
      transcriptionStatus: "idle",
      contentCompleteness: "full",
      transcriptMeta: null,
      aiStatus: "done",
      aiErrorMessage: null,
      currentMode: "concise",
      aiOutputs: {
        concise: {
          mode: "concise",
          generatedAt: "2026-04-02T10:00:00.000Z",
          lastEditedAt: null,
          originalResult: { summary: "总结", bullets: ["要点一", "要点二", "要点三"] },
          currentResult: { summary: "总结", bullets: ["要点一", "要点二", "要点三"] },
          version: 1
        },
        learning: null
      }
    };

    const text = buildRecordSearchText(record, tags);
    expect(text).toContain("爆款拆解");
    expect(text).toContain("复盘");
    expect(text).toContain("运营");
    expect(text).toContain("要点一");
  });
});
