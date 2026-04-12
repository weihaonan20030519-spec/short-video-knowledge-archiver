import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DetailPane } from "./DetailPane";
import { createFolder, createRecord, createTag } from "../../test/factories";
import { createLearningAiSlot } from "../../lib/aiTransform";
import { recordRepository } from "../../db/repositories/recordRepository";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ResumeTranscriptionOutcome } from "../../lib/transcriptionResume";
import type { AnalyzeFeedback } from "../../types/api";
import type { RecordItem } from "../../types/domain";

function mockResizeObserverWidth(width: number) {
  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: { width } as DOMRectReadOnly
          } as ResizeObserverEntry
        ],
        this as unknown as ResizeObserver
      );
    }

    disconnect() {}

    unobserve() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
}

afterEach(() => {
  useSettingsStore.getState().setAppLanguage("zh-CN");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DetailPane AI knowledge view", () => {
  it("renders learning output as sections without highlight chrome", () => {
    const folder = createFolder({ id: "folder-1", name: "研究素材" });
    const tag = createTag({ id: "tag-1", name: "方法" });
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "done",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "先明确目标，再拆步骤。",
            logicFramework: ["先定义目标", "再拆解路径", "最后复盘修正"],
            keyDetails: ["注意前提条件是否成立", "避免直接照搬他人案例"],
            reusablePoints: ["先写出最小动作", "给每一步设结果检查点"],
            highlights: {
              coreConclusion: [{ text: "明确目标", tone: "core" }],
              logicFramework: [{ text: "拆解路径", tone: "method" }],
              keyDetails: [{ text: "注意前提条件", tone: "warning" }],
              reusablePoints: [{ text: "最小动作", tone: "action" }]
            }
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[folder]}
        tags={[tag]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: "核心结论" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "逻辑框架" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "关键细节" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "可复用点" })).toBeInTheDocument();

    const coreSection = screen.getByRole("heading", { name: "核心结论" }).closest("section");
    expect(coreSection).not.toBeNull();
    expect(coreSection).toHaveTextContent("先明确目标，再拆步骤");
    expect(coreSection).toHaveTextContent("先明确目标，再拆步骤。");
    expect(coreSection?.querySelector("mark")).toBeNull();
    expect(coreSection?.querySelector("blockquote")).toBeNull();
    expect(within(coreSection as HTMLElement).queryByTestId("learning-emphasis-fallback")).not.toBeInTheDocument();
    expect(within(coreSection as HTMLElement).queryByTestId("learning-quote-highlight")).not.toBeInTheDocument();
  });

  it("still renders learning output cleanly when no highlights are provided", () => {
    const folder = createFolder({ id: "folder-2", name: "归档" });
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "done",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "先搭框架，再填细节。",
            logicFramework: ["搭框架", "填细节"],
            keyDetails: ["先定义边界", "再补充事实"],
            reusablePoints: ["从最小动作开始"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[folder]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const coreSection = screen.getByRole("heading", { name: "核心结论" }).closest("section");
    expect(coreSection).not.toBeNull();

    const listItem = within(coreSection as HTMLElement).getByRole("listitem");
    expect(listItem).toHaveTextContent("1.先搭框架，再填细节。");
    expect(listItem).toHaveTextContent("先搭框架，再填细节");
  });

  it("switches learning section titles with the current UI language", () => {
    useSettingsStore.getState().setAppLanguage("en");

    const record = createRecord({
      currentMode: "learning",
      aiStatus: "done",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "Lead with the conclusion.",
            logicFramework: ["Define the problem", "Map the logic"],
            keyDetails: ["Keep the constraints visible"],
            reusablePoints: ["Turn the idea into a checklist"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-en", name: "Inbox" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: "Core Conclusion" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Logic Framework" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Key Details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reusable Points" })).toBeInTheDocument();
  });

  it("renders tag toggles as direct buttons instead of hidden checkboxes", () => {
    const tag = createTag({ id: "tag-button", name: "方法" });
    const record = createRecord({
      tagIds: [tag.id]
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-tag", name: "研究素材" })]}
        tags={[tag]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const classificationSection = screen.getByRole("heading", { name: "分类" }).closest("section");
    expect(classificationSection).not.toBeNull();
    expect(within(classificationSection as HTMLElement).getByRole("button", { name: "#方法" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(classificationSection as HTMLElement).queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shortens and copies the original url without breaking the layout", async () => {
    useSettingsStore.getState().setAppLanguage("zh-CN");

    const originalUrl =
      "https://www.example.com/really/long/path/that/should/stay/compact/while/still/being/copyable?with=query&another=value#section";
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    try {
      const record = createRecord({
        originalUrl
      });

      render(
        <DetailPane
          record={record}
          folders={[createFolder({ id: "folder-url", name: "研究素材" })]}
          tags={[]}
          onAnalyze={vi.fn().mockResolvedValue(undefined)}
          onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
        />
      );

      const originalUrlRow = screen.getByTestId("detail-original-url");
      const originalUrlLabel = within(originalUrlRow).getByText((_, node) => {
        const text = node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return text === "原始链接";
      });
      const originalUrlLayout = screen.getByTestId("detail-original-url-row");
      expect(originalUrlLayout).toHaveClass("grid", "min-w-0");
      expect(originalUrlLayout).toHaveClass("grid-cols-[minmax(0,1fr)_auto]");
      expect(originalUrlLabel).toHaveClass("text-xs", "font-semibold");
      expect(originalUrlRow).not.toHaveTextContent(originalUrl);
      expect(within(originalUrlRow).getByTitle(originalUrl)).toBeInTheDocument();

      const copyButton = within(originalUrlRow).getByRole("button", { name: "复制" });
      expect(copyButton).toHaveClass("shrink-0");

      fireEvent.click(copyButton);

      expect(writeText).toHaveBeenCalledWith(originalUrl);
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true
      });
    }
  });

  it("renders a conservative source summary for mixed html + ocr link imports", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial",
        sourceSignals: {
          hasHtmlText: true,
          hasImageOcrText: true
        }
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-source-summary", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const sourceSummary = screen.getByTestId("detail-source-summary");
    expect(within(sourceSummary).getByText("来源摘要")).toBeInTheDocument();
    expect(within(sourceSummary).getByText("主要来自网页正文 + OCR 补充")).toBeInTheDocument();
  });

  it("puts original content ahead of ai and auxiliary metadata for unorganized records", () => {
    const record = createRecord({
      inputMethod: "manual",
      sourceType: "text",
      originalContent: "这是未整理记录的原始内容。"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-reading-flow", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const headerSummary = screen.getByTestId("detail-header-summary");
    const primaryReadingRegion = screen.getByTestId("detail-primary-reading-region");
    const originalContentSection = screen.getByTestId("detail-original-content-section");
    const aiSection = screen.getByTestId("detail-ai-section");
    const supportingInfoRegion = screen.getByTestId("detail-supporting-info-region");
    const actionRegion = screen.getByTestId("detail-action-region");

    expect(headerSummary.compareDocumentPosition(primaryReadingRegion)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(originalContentSection.compareDocumentPosition(aiSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(primaryReadingRegion.compareDocumentPosition(supportingInfoRegion)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(supportingInfoRegion.compareDocumentPosition(actionRegion)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("puts ai reading ahead of original content once a record already has organized output", () => {
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "done",
      originalContent: "这是原始内容。",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "这是已经整理好的结论。",
            logicFramework: ["定义问题", "再拆逻辑"],
            keyDetails: ["保留上下文"],
            reusablePoints: ["复用整理框架"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-organized-flow", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const originalContentSection = screen.getByTestId("detail-original-content-section");
    const aiSection = screen.getByTestId("detail-ai-section");

    expect(aiSection.compareDocumentPosition(originalContentSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getAllByText("已整理").length).toBeGreaterThan(0);
  });

  it("keeps header chips semantically distinct instead of repeating the same pending label", () => {
    const record = {
      ...createRecord(),
      inputMethod: "manual" as const,
      sourceType: "text" as const,
      aiStatus: "not_started" as const,
      originalContent: ""
    };

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-header-chips", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const headerChips = screen.getByTestId("detail-header-chips");
    expect(within(headerChips).getAllByText("未开始")).toHaveLength(1);
    expect(within(headerChips).queryByText("AI 整理中")).not.toBeInTheDocument();
    expect(within(headerChips).queryByText("AI 整理失败")).not.toBeInTheDocument();
  });

  it("reuses the same summary semantics as the record list header contract", () => {
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
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-detail-summary", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const headerChips = screen.getByTestId("detail-header-chips");
    expect(headerChips).toHaveTextContent("整理待复核");
    expect(headerChips).toHaveTextContent("浏览器导入");
    expect(headerChips).toHaveTextContent("小红书");
    expect(headerChips).toHaveTextContent("需复查");
  });

  it("keeps low-value platform placeholders out of the detail header", () => {
    const record = createRecord({
      inputMethod: "text",
      sourceType: "text",
      sourcePlatform: "other",
      aiStatus: "not_started",
      originalContent: "这里已经有正文，但还没有 AI 结果。"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-detail-platform", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const headerChips = screen.getByTestId("detail-header-chips");
    expect(headerChips).toHaveTextContent("整理待复核");
    expect(headerChips).toHaveTextContent("粘贴文本");
    expect(headerChips).not.toHaveTextContent("其他");
    expect(headerChips).not.toHaveTextContent("未知");
  });

  it("disables ai organize action and hides result controls when source content is still empty", () => {
    const record = {
      ...createRecord(),
      inputMethod: "manual" as const,
      sourceType: "text" as const,
      originalContent: "",
      aiStatus: "not_started" as const,
      aiOutputs: {
        concise: null,
        learning: null
      }
    };

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-empty", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("请先补充原始内容。")).toBeInTheDocument();
    expect(screen.getByText("补充正文后再开始整理，AI 才能基于这里的文本生成结果。")).toBeInTheDocument();
    expect(screen.getByTestId("detail-ai-primary-action")).toHaveTextContent("先补充内容");
    expect(screen.getByTestId("detail-ai-primary-action")).toBeDisabled();
    expect(screen.queryByTestId("detail-ai-result-controls")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "阅读视图" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑结果" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("查看 AI 原始版")).not.toBeInTheDocument();
  });

  it("keeps analyze available once source content exists and only restores result controls after results exist", () => {
    const record = createRecord({
      inputMethod: "manual",
      sourceType: "text",
      originalContent: "这里已经有可以整理的正文。",
      aiStatus: "not_started",
      aiOutputs: {
        concise: null,
        learning: null
      }
    });

    const { rerender } = render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-ready", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByTestId("detail-ai-primary-action")).toHaveTextContent("开始整理");
    expect(screen.getByTestId("detail-ai-primary-action")).toBeEnabled();
    expect(screen.getByTestId("detail-ai-toolbar")).toHaveClass("flex-wrap");
    expect(screen.queryByTestId("detail-ai-result-controls")).not.toBeInTheDocument();

    rerender(
      <DetailPane
        record={createRecord({
          ...record,
          aiStatus: "done",
          currentMode: "concise",
          aiOutputs: {
            concise: {
              mode: "concise",
              generatedAt: "2026-04-06T10:00:00.000Z",
              lastEditedAt: null,
              originalResult: {
                summary: "已经生成整理结果。",
                bullets: ["第一点", "第二点"]
              },
              currentResult: {
                summary: "已经生成整理结果。",
                bullets: ["第一点", "第二点"]
              },
              version: 1
            },
            learning: null
          }
        })}
        folders={[createFolder({ id: "folder-ai-ready", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByTestId("detail-ai-result-controls")).toBeInTheDocument();
    expect(screen.getByTestId("detail-ai-result-controls")).toHaveClass("flex", "flex-wrap");
    expect(screen.getByTestId("detail-segmented-control-layout")).toHaveClass("flex-wrap", "max-w-full");
    expect(screen.getByRole("button", { name: "阅读视图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑结果" })).toBeInTheDocument();
  });

  it("shows a review notice when the current mode needs review and has no renderable output", () => {
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "needs_review",
      originalContent: "这里有正文，但当前还不足以稳定生成学习版结果。",
      aiOutputs: {
        concise: null,
        learning: null
      }
    });
    const analyzeFeedback: AnalyzeFeedback = {
      recordId: record.id,
      mode: "learning",
      generatedAt: "2026-04-09T12:00:00.000Z",
      source: "local",
      review: {
        reasonCode: "source_text_needs_review",
        recommendedAction: "edit_source_text"
      }
    };

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-review", name: "研究素材" })]}
        tags={[]}
        analyzeFeedback={analyzeFeedback}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const notice = screen.getByTestId("detail-ai-review-notice");
    expect(within(notice).getByText("这次先不生成整理结果")).toBeInTheDocument();
    expect(
      within(notice).getByText("当前原文还不足以稳定生成这一模式的整理结果，建议先补充或澄清原文。")
    ).toBeInTheDocument();
    expect(within(notice).getByText("建议先补充原文，再重新整理。")).toBeInTheDocument();
    expect(within(notice).getByText("这次由本地决策先拦截，尚未调用模型。")).toBeInTheDocument();
    expect(screen.queryByText("还没有该模式的整理结果。")).not.toBeInTheDocument();
    expect(screen.queryByText("点击“开始整理”生成内容。")).not.toBeInTheDocument();
  });

  it("hides the review notice when the current mode already has a renderable result", () => {
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "needs_review",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "已有正式结果。",
            logicFramework: ["先看正式结果"],
            keyDetails: ["不要并列展示 review notice"],
            reusablePoints: ["结果优先"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });
    const analyzeFeedback: AnalyzeFeedback = {
      recordId: record.id,
      mode: "learning",
      generatedAt: "2026-04-09T12:00:00.000Z",
      source: "local",
      review: {
        reasonCode: "source_text_needs_review",
        recommendedAction: "edit_source_text"
      }
    };

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-review-hidden", name: "研究素材" })]}
        tags={[]}
        analyzeFeedback={analyzeFeedback}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.queryByTestId("detail-ai-review-notice")).not.toBeInTheDocument();
    expect(screen.getByText("已有正式结果。")).toBeInTheDocument();
  });

  it("does not show the review notice when feedback belongs to a different mode", () => {
    const record = createRecord({
      currentMode: "concise",
      aiStatus: "needs_review",
      originalContent: "这里有正文，但当前模式与反馈模式不同。",
      aiOutputs: {
        concise: null,
        learning: null
      }
    });
    const analyzeFeedback: AnalyzeFeedback = {
      recordId: record.id,
      mode: "learning",
      generatedAt: "2026-04-09T12:00:00.000Z",
      source: "local",
      review: {
        reasonCode: "source_text_needs_review",
        recommendedAction: "edit_source_text"
      }
    };

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-review-mode", name: "研究素材" })]}
        tags={[]}
        analyzeFeedback={analyzeFeedback}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.queryByTestId("detail-ai-review-notice")).not.toBeInTheDocument();
  });

  it("keeps the ai workspace header and controls compact-friendly in english", () => {
    useSettingsStore.getState().setAppLanguage("en");
    mockResizeObserverWidth(220);

    const record = createRecord({
      inputMethod: "manual",
      sourceType: "text",
      originalContent: "This record already has source content and an existing AI result.",
      currentMode: "concise",
      aiStatus: "done",
      aiOutputs: {
        concise: {
          mode: "concise",
          generatedAt: "2026-04-06T10:00:00.000Z",
          lastEditedAt: null,
          originalResult: {
            summary: "A concise summary.",
            bullets: ["One", "Two"]
          },
          currentResult: {
            summary: "A concise summary.",
            bullets: ["One", "Two"]
          },
          version: 1
        },
        learning: null
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ai-en", name: "Research" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("heading", { name: /AI workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Concise" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learning" })).toBeInTheDocument();

    expect(screen.getByTestId("detail-ai-workspace-header")).toHaveClass("flex-wrap", "items-start");
    expect(screen.getByTestId("detail-ai-workspace-controls")).toHaveClass("flex", "flex-wrap", "max-w-full");
    expect(screen.getByTestId("detail-ai-workspace-controls")).toHaveAttribute("data-layout", "expanded");
    expect(screen.getByRole("button", { name: "Concise" })).toHaveClass(
      "min-w-[6.5rem]",
      "px-5",
      "py-2",
      "leading-none"
    );
    expect(screen.getByRole("button", { name: "Learning" })).toHaveClass(
      "min-w-[6.5rem]",
      "px-5",
      "py-2",
      "leading-none"
    );
    expect(screen.getByTestId("detail-ai-primary-action")).toHaveClass("max-w-full", "whitespace-normal");
    expect(screen.getByTestId("detail-ai-result-controls")).toHaveClass("flex", "flex-wrap");
    expect(screen.getByTestId("detail-segmented-control-layout")).toHaveClass("flex-wrap", "max-w-full", "p-1.5");
  });

  it("keeps source-summary detail cautious for summary-only and changed-content cases", () => {
    const summaryOnlyRecord = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      importSummary: {
        source: "link_generic",
        outcome: "needs_user_input",
        contentCompleteness: "empty",
        sourceSignals: {
          isSummaryOnly: true
        }
      }
    });
    const changedRecord = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalContent: "当前正文已经存在。",
      createdAt: "2026-04-02T10:00:00.000Z",
      updatedAt: "2026-04-03T10:00:00.000Z",
      importSummary: {
        source: "link_generic",
        outcome: "partial",
        contentCompleteness: "partial",
        sourceSignals: {
          hasHtmlText: true
        }
      }
    });

    const { rerender } = render(
      <DetailPane
        record={summaryOnlyRecord}
        folders={[createFolder({ id: "folder-summary-only", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const summaryOnlyBlock = screen.getByTestId("detail-source-summary");
    expect(within(summaryOnlyBlock).getByText("当前仅带回摘要级内容，不等于完整正文。")).toBeInTheDocument();

    rerender(
      <DetailPane
        record={changedRecord}
        folders={[createFolder({ id: "folder-changed-source", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const changedBlock = screen.getByTestId("detail-source-summary");
    expect(
      within(changedBlock).getByText("当前原文可能与初次导入结果不同，也可能包含后续补充或调整。")
    ).toBeInTheDocument();
    expect(within(changedBlock).queryByText("用户后来补了正文")).not.toBeInTheDocument();
    expect(within(changedBlock).queryByText("包含用户补充正文")).not.toBeInTheDocument();
  });

  it("moves a transcript out of needs review after original content is edited and autosaved", async () => {
    const record = createRecord({
      id: "record-needs-review",
      originalContent: "这是初始转写文本。",
      sourceType: "audio",
      transcriptionStatus: "transcript_needs_review",
      transcriptMeta: {
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        language: "zh-CN"
      }
    });

    await recordRepository.create(record);

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-3", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const contentField = screen.getByPlaceholderText("请粘贴字幕、笔记或你补充的正文内容。AI 只能基于这里的文本整理。");
    expect(contentField).toHaveClass("whitespace-pre-wrap", "break-words");

    fireEvent.change(contentField, { target: { value: "这是用户修正后的正文。" } });

    await waitFor(async () => {
      const saved = await recordRepository.getById(record.id);
      expect(saved?.originalContent).toBe("这是用户修正后的正文。");
      expect(saved?.transcriptionStatus).toBe("transcript_ready");
    });

    const transcriptionStatusField = screen.getByTestId("detail-transcription-status");
    expect(transcriptionStatusField).toHaveTextContent("转写状态: 转写已就绪");
  }, 10000);

  it("persists the review-later toggle without affecting transcription status", async () => {
    const record = createRecord({
      id: "record-review-later",
      originalContent: "这是稍后还要回来处理的记录。",
      transcriptionStatus: "transcript_needs_review",
      reviewLater: false
    });

    await recordRepository.create(record);

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-review", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const toggleButton = screen.getByRole("button", { name: "加入需复查队列" });
    expect(screen.getByText("需复查队列")).toBeInTheDocument();
    expect(screen.getByTestId("detail-action-card-layout")).toHaveClass("flex-wrap");
    expect(screen.getByTestId("detail-action-card-content")).toHaveClass("min-w-0", "break-words");
    expect(screen.getByTestId("detail-action-card-button")).toHaveClass("max-w-full", "flex-none");

    await userEvent.setup().click(toggleButton);

    await waitFor(async () => {
      const saved = await recordRepository.getById(record.id);
      expect(saved?.reviewLater).toBe(true);
      expect(saved?.transcriptionStatus).toBe("transcript_needs_review");
    });

    expect(screen.getByRole("button", { name: "取消加入需复查队列" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the action card readable in english with a compact wrapping layout", () => {
    useSettingsStore.getState().setAppLanguage("en");

    const record = createRecord({
      id: "record-review-later-en",
      originalContent: "Source content that still needs follow-up.",
      reviewLater: false
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-review-en", name: "Research" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("Review-later queue")).toBeInTheDocument();
    expect(screen.getByText("Use this when you want to come back and finish this record later.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to review-later queue" })).toBeInTheDocument();

    const layout = screen.getByTestId("detail-action-card-layout");
    const content = screen.getByTestId("detail-action-card-content");
    const button = screen.getByTestId("detail-action-card-button");

    expect(layout).toHaveClass("flex", "flex-wrap", "items-start");
    expect(content).toHaveClass("min-w-0", "break-words", "flex-[1_1_16rem]");
    expect(button).toHaveClass("max-w-full", "flex-none");
  });

  it("shows a resume-transcription CTA for eligible idle link records and calls the handler", async () => {
    const record = createRecord({
      id: "record-resume-link",
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/resume-me",
      originalContent: " ",
      transcriptionStatus: "idle"
    });
    const onResumeTranscriptionSpy = vi.fn(async (_record: RecordItem): Promise<ResumeTranscriptionOutcome> => ({
      status: "patched"
    }));
    const onResumeTranscription =
      onResumeTranscriptionSpy as unknown as (record: RecordItem) => Promise<ResumeTranscriptionOutcome>;

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-resume", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onResumeTranscription={onResumeTranscription}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("button", { name: "继续转写" })).toBeInTheDocument();
    expect(screen.getByText("将复用已保存链接，无需重新输入。")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "继续转写" }));

    expect(onResumeTranscriptionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "record-resume-link" })
    );
  });

  it("shows loading feedback while resume transcription is pending", async () => {
    let resolveResume!: (value: "patched") => void;
    const onResumeTranscription = async () =>
      new Promise<ResumeTranscriptionOutcome>((resolve) => {
        resolveResume = () => resolve({ status: "patched" });
      });
    const record = createRecord({
      id: "record-resume-loading",
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/resume-loading",
      originalContent: " ",
      transcriptionStatus: "idle"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-resume-loading", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onResumeTranscription={onResumeTranscription}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "继续转写" }));

    expect(screen.getByRole("button", { name: "继续转写中…" })).toBeDisabled();

    resolveResume("patched");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "继续转写" })).toBeInTheDocument();
    });
  });

  it("shows a specific error when resume transcription gets no detected content", async () => {
    const onResumeTranscription = async (
      _record: RecordItem
    ): Promise<ResumeTranscriptionOutcome> => ({
      status: "failed",
      reason: "no_detected_content"
    });
    const record = createRecord({
      id: "record-resume-no-content",
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/resume-no-content",
      originalContent: " ",
      transcriptionStatus: "idle"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-resume-no-content", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onResumeTranscription={onResumeTranscription}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "继续转写" }));

    expect(
      await screen.findByText("导入结果返回了，但没有抓到正文。")
    ).toBeInTheDocument();
  });

  it("does not show the resume-transcription CTA when the record already has source content", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/already-filled",
      originalContent: "这里已经有正文了。",
      transcriptionStatus: "idle"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-resume-hidden", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onResumeTranscription={async () => ({ status: "patched" } as const)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.queryByRole("button", { name: "继续转写" })).not.toBeInTheDocument();
    expect(screen.queryByText("将复用已保存链接，无需重新输入。")).not.toBeInTheDocument();
  });

  it("shows ready-to-organize instead of idle when a link record already has source content", () => {
    const record = createRecord({
      inputMethod: "link",
      sourceType: "link",
      sourcePlatform: "other",
      originalUrl: "https://example.com/article/filled",
      originalContent: "已经补回的原文内容。",
      transcriptionStatus: "idle"
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-ready", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const transcriptionStatusField = screen.getByTestId("detail-transcription-status");
    expect(transcriptionStatusField).toHaveTextContent("转写状态: 待整理");
    expect(screen.queryByRole("button", { name: "继续转写" })).not.toBeInTheDocument();
  });

  it("renders transcript and media asset details inside the supporting info region", () => {
    const record = createRecord({
      mediaAsset: {
        storageMode: "none",
        rootId: null,
        relativePath: null,
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        duration: 15,
        sourceType: "audio",
        availability: "not_archived",
        lastVerifiedAt: null,
        lastKnownError: null
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-media", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const supportingInfo = screen.getByTestId("detail-supporting-info-region");
    expect(within(supportingInfo).getByText("媒体资产")).toBeInTheDocument();
    expect(within(supportingInfo).getByText("存储模式:")).toBeInTheDocument();
    expect(within(supportingInfo).getByText("未归档")).toBeInTheDocument();
    expect(within(supportingInfo).getByText("媒体状态:")).toBeInTheDocument();
    expect(within(supportingInfo).getByText("未保留原始媒体")).toBeInTheDocument();
    expect(
      within(supportingInfo).getByText("当前记录未保留原始媒体，仅保存文本归档与相关元信息。")
    ).toBeInTheDocument();
    expect(screen.getByTestId("detail-more-metadata")).toBeInTheDocument();
    expect(screen.getByTestId("detail-action-region")).toBeInTheDocument();
  });

  it("shows loading feedback immediately and preserves the previous result while re-analyzing", async () => {
    let resolveAnalyze: (() => void) | undefined;
    const onAnalyze = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAnalyze = resolve;
        })
    );
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "done",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "先从结论开始。",
            logicFramework: ["定义问题", "拆解逻辑"],
            keyDetails: ["保留条件限制"],
            reusablePoints: ["提炼可复用表达"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-loading", name: "研究素材" })]}
        tags={[]}
        onAnalyze={onAnalyze}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "重新整理" }));

    expect(screen.queryByTestId("detail-ai-primary-action")).not.toBeInTheDocument();
    const loadingNotice = screen.getByTestId("learning-loading-notice");
    expect(within(loadingNotice).getByText("当前结果已保留")).toBeInTheDocument();
    expect(within(loadingNotice).getByText("正在生成新的学习版结果，请稍候。")).toBeInTheDocument();
    expect(screen.getByText("先从结论开始。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "简洁版" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "学习版" })).toBeDisabled();

    resolveAnalyze?.();
  });

  it("keeps the initial learning loading state as a secondary notice instead of repeating the button copy", () => {
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "processing",
      aiOutputs: {
        concise: null,
        learning: null
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-learning-skeleton", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.queryByTestId("detail-ai-primary-action")).not.toBeInTheDocument();
    const skeleton = screen.getByTestId("ai-knowledge-skeleton");
    expect(within(skeleton).getByText("请稍候")).toBeInTheDocument();
    expect(within(skeleton).getByText("正在生成学习版结果，请稍候。")).toBeInTheDocument();
    expect(within(skeleton).queryByText("正在整理学习版…")).not.toBeInTheDocument();
  });

  it("shows a localized failure banner and keeps the last successful result visible", async () => {
    const record = createRecord({
      currentMode: "learning",
      aiStatus: "failed",
      aiErrorCode: "AI_REQUEST_FAILED",
      aiOutputs: {
        concise: null,
        learning: createLearningAiSlot(
          {
            coreConclusion: "旧结果依然可读。",
            logicFramework: ["保留旧结果"],
            keyDetails: ["只提示本次失败"],
            reusablePoints: ["允许用户重试"]
          },
          "2026-04-02T10:00:00.000Z"
        )
      }
    });

    render(
      <DetailPane
        record={record}
        folders={[createFolder({ id: "folder-failed", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("本次整理失败，当前结果已保留。")).toBeInTheDocument();
    expect(screen.getAllByText("AI 请求失败，请检查服务状态后重试。")).toHaveLength(1);
    expect(screen.getByText("旧结果依然可读。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新整理" })).toBeEnabled();
  });

  it("shows a fresh-result cue after a new analyze result arrives", () => {
    const initialRecord = createRecord({
      currentMode: "concise",
      aiStatus: "processing",
      aiOutputs: {
        concise: null,
        learning: null
      }
    });

    const { rerender } = render(
      <DetailPane
        record={initialRecord}
        folders={[createFolder({ id: "folder-updated", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    rerender(
      <DetailPane
        record={createRecord({
          ...initialRecord,
          aiStatus: "done",
          aiOutputs: {
            concise: {
              mode: "concise",
              generatedAt: "2026-04-05T16:00:00.000Z",
              lastEditedAt: null,
              originalResult: {
                summary: "新结果已返回。",
                bullets: ["第一点", "第二点", "第三点"]
              },
              currentResult: {
                summary: "新结果已返回。",
                bullets: ["第一点", "第二点", "第三点"]
              },
              version: 1
            },
            learning: null
          }
        })}
        folders={[createFolder({ id: "folder-updated", name: "研究素材" })]}
        tags={[]}
        onAnalyze={vi.fn().mockResolvedValue(undefined)}
        onDeleteRecord={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText("刚刚更新")).toBeInTheDocument();
    expect(screen.getByText("新结果已返回。")).toBeInTheDocument();
  });
});
