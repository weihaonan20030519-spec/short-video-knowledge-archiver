import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DetailPane } from "./DetailPane";
import { createFolder, createRecord, createTag } from "../../test/factories";
import { createLearningAiSlot } from "../../lib/aiTransform";
import { recordRepository } from "../../db/repositories/recordRepository";
import { useSettingsStore } from "../../stores/settingsStore";

describe("DetailPane AI knowledge view", () => {
  it("renders learning output as sections with highlights", () => {
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

    const mark = within(coreSection as HTMLElement).getByText("先明确目标，再拆步骤").closest("mark");
    expect(mark).not.toBeNull();
    expect(mark).toHaveClass("bg-amber-200/90");
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

    fireEvent.change(contentField, { target: { value: "这是用户修正后的正文。" } });

    await waitFor(async () => {
      const saved = await recordRepository.getById(record.id);
      expect(saved?.originalContent).toBe("这是用户修正后的正文。");
      expect(saved?.transcriptionStatus).toBe("transcript_ready");
    });

    const transcriptionStatusField = screen.getByText((_, node) => {
      const text = node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return text === "转写状态: 转写已就绪";
    });
    expect(transcriptionStatusField).not.toBeNull();
    expect(transcriptionStatusField).toHaveTextContent("转写状态: 转写已就绪");
  }, 10000);

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

    expect(screen.getByRole("button", { name: "正在整理学习版…" })).toBeDisabled();
    expect(screen.getByText("本次整理完成前，当前结果会继续保留。")).toBeInTheDocument();
    expect(screen.getByText("先从结论开始。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "简洁版" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "学习版" })).toBeDisabled();

    resolveAnalyze?.();
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
    expect(screen.getAllByText("AI 请求失败，请检查服务状态后重试。")).toHaveLength(2);
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
