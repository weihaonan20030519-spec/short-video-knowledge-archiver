import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordListItem } from "./RecordListItem";
import { createFolder, createRecord } from "../../test/factories";
import { useSettingsStore } from "../../stores/settingsStore";

describe("RecordListItem", () => {
  it("caps long titles without letting them stretch the card", () => {
    const folder = createFolder({ id: "folder-title", name: "研究素材" });
    const longTitle =
      "这是一个很长很长很长很长很长很长很长很长很长很长的标题，用来确保列表卡片标题最多展示两行并且不会把布局撑坏";

    render(
      <RecordListItem
        record={createRecord({
          id: "record-title",
          title: longTitle,
          folderId: folder.id
        })}
        folders={[folder]}
        tags={[]}
        activeFilter="all"
        selected={false}
        onClick={vi.fn()}
      />
    );

    const title = screen.getByRole("heading", { name: longTitle });
    expect(title).toHaveClass("leading-6");
    expect(title).toHaveStyle("-webkit-line-clamp: 2");
    expect(title.parentElement).toHaveClass("min-w-0", "flex-1");
    expect(screen.getByTestId("record-list-primary-pill")).toHaveClass(
      "min-h-7",
      "max-w-[11rem]",
      "shrink-0",
      "px-3",
      "py-1.5",
      "leading-4"
    );
  });

  it("shows a compact summary contract with entry, useful platform, and review-later signals", () => {
    const folder = createFolder({ id: "folder-summary", name: "研究素材" });
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "xiaohongshu",
      reviewLater: true,
      aiStatus: "not_started",
      importSummary: {
        source: "browser_context",
        outcome: "partial",
        contentCompleteness: "partial"
      }
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="all"
        selected={false}
        onClick={vi.fn()}
      />
    );

    const chips = screen.getByTestId("record-list-summary-chips");
    expect(screen.getByTestId("record-list-primary-pill")).toHaveTextContent("待修正文稿");
    expect(chips).toHaveTextContent("浏览器导入");
    expect(chips).toHaveTextContent("小红书");
    expect(chips).toHaveTextContent("需复查");
    expect(screen.getByTestId("record-list-entry-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
    expect(screen.getByTestId("record-list-platform-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
    expect(screen.getByTestId("record-list-review-later-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
  });

  it("hides low-value platform placeholders while keeping the shared status summary", () => {
    const folder = createFolder({ id: "folder-low-value-platform", name: "研究素材" });
    const record = createRecord({
      inputMethod: "text",
      sourceType: "text",
      sourcePlatform: "other",
      aiStatus: "not_started",
      originalContent: "这里已经有正文，但还没有 AI 结果。"
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="all"
        selected={false}
        onClick={vi.fn()}
      />
    );

    const chips = screen.getByTestId("record-list-summary-chips");
    expect(screen.getByTestId("record-list-primary-pill")).toHaveTextContent("待修正文稿");
    expect(chips).toHaveTextContent("粘贴文本");
    expect(chips).not.toHaveTextContent("其他");
    expect(chips).not.toHaveTextContent("未知");
  });

  it("keeps a specific status pill so wider sidebar buckets can still be explained in the list", () => {
    const folder = createFolder({ id: "folder-pending-bucket", name: "研究素材" });
    const record = createRecord({
      inputMethod: "manual",
      sourceType: "text",
      sourcePlatform: "other",
      aiStatus: "not_started",
      transcriptionStatus: "transcript_failed",
      originalContent: " "
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="all"
        selected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("record-list-primary-pill")).toHaveTextContent("转写失败");
    expect(screen.getByTestId("record-list-summary-chips")).toHaveTextContent("手动输入");
  });

  it("keeps the exact status as the primary signal inside the broad pending bucket", () => {
    const folder = createFolder({ id: "folder-unorganized", name: "研究素材" });
    const record = createRecord({
      originalContent: " ",
      transcriptionStatus: "transcript_failed",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="unorganized"
        selected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("record-list-card-primary-signal")).toHaveTextContent("转写失败");
    expect(screen.queryByTestId("record-list-card-contextual-status")).not.toBeInTheDocument();
  });

  it("deemphasizes needs-review inside the exact needs-review filter without hiding other scan cues", () => {
    const folder = createFolder({ id: "folder-needs-review-context", name: "研究素材" });
    const record = createRecord({
      originalContent: "这里已经有正文，但还没整理。",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null },
      sourcePlatform: "xiaohongshu",
      inputMethod: "link",
      sourceType: "link"
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="needs_review"
        selected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryByTestId("record-list-primary-pill")).not.toBeInTheDocument();
    expect(screen.getByTestId("record-list-card-contextual-status")).toHaveTextContent("待修正文稿");
    expect(screen.getByTestId("record-list-secondary-chip")).toHaveClass(
      "min-h-6",
      "max-w-[10rem]",
      "px-2.5",
      "py-1",
      "leading-4"
    );
    expect(screen.getByTestId("record-list-summary-chips")).toHaveTextContent("链接导入");
    expect(screen.getByTestId("record-list-summary-chips")).toHaveTextContent("小红书");
  });

  it("keeps review-later visible but softer inside the review-later filter", () => {
    const folder = createFolder({ id: "folder-review-context", name: "研究素材" });
    const record = createRecord({
      reviewLater: true,
      originalContent: "这里已经有正文，但还没整理。",
      aiStatus: "not_started",
      aiOutputs: { concise: null, learning: null }
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="review_later"
        selected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("record-list-card-primary-signal")).toHaveTextContent("待修正文稿");
    const reviewChip = screen.getByTestId("record-list-review-later-chip");
    expect(reviewChip).toHaveClass("bg-slate-50", "text-slate-500");
  });

  it("keeps long English secondary chips on the same visual contract instead of drifting into a different shape", () => {
    useSettingsStore.getState().setAppLanguage("en");

    const folder = createFolder({ id: "folder-en-contract", name: "Research" });
    const record = createRecord({
      reviewLater: true,
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "xiaohongshu",
      importSummary: {
        source: "browser_context",
        outcome: "partial",
        contentCompleteness: "partial"
      }
    });

    render(
      <RecordListItem
        record={record}
        folders={[folder]}
        tags={[]}
        activeFilter="review_later"
        selected={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("record-list-entry-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
    expect(screen.getByTestId("record-list-platform-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
    expect(screen.getByTestId("record-list-review-later-chip")).toHaveClass("min-h-6", "max-w-[10rem]", "px-2.5", "py-1");
    expect(screen.getByTestId("record-list-entry-chip")).toHaveTextContent("Browser import");
    expect(screen.getByTestId("record-list-review-later-chip")).toHaveTextContent("Review later");
  });
});
