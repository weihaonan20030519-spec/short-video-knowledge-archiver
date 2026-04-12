import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiKnowledgeView } from "./AiKnowledgeView";
import type { KnowledgeSection, KnowledgeSectionItem } from "../../lib/aiPresentation";

function createItem(overrides: Partial<KnowledgeSectionItem>): KnowledgeSectionItem {
  return {
    sentence: "先明确目标，再拆步骤。",
    mode: "none",
    quoteHighlight: null,
    emphasisSpans: [],
    fallbackEmphasis: null,
    coverageFallback: null,
    ...overrides
  };
}

function renderView(sections: KnowledgeSection[]) {
  return render(
    <AiKnowledgeView
      sections={sections}
      previewHint="AI 会先保留完整句，再补充少量辅助强调。"
    />
  );
}

describe("AiKnowledgeView", () => {
  it("renders the complete sentence without emphasis chrome", () => {
    const { container } = renderView([
      {
        key: "core",
        title: "核心结论",
        items: [
          createItem({
            emphasisSpans: [{ text: "明确目标", tone: "core" }]
          })
        ]
      }
    ]);

    const listItem = screen.getByRole("listitem");
    expect(listItem).toHaveTextContent("1.先明确目标，再拆步骤。");
    expect(listItem.querySelector("mark")).toBeNull();
    expect(listItem.querySelector("blockquote")).toBeNull();
    expect(container.querySelector("[data-testid='learning-emphasis-fallback']")).toBeNull();
    expect(container.querySelector("[data-testid='learning-quote-highlight']")).toBeNull();
  });

  it("keeps quote-like text as plain body content", () => {
    const { container } = renderView([
      {
        key: "quote",
        title: "关键细节",
        items: [
          createItem({
            sentence: "作者反复强调，真正要避免的是“不要把局部优化当作系统优化”这种误区。",
            quoteHighlight: {
              text: "“不要把局部优化当作系统优化”",
              tone: "core"
            },
            emphasisSpans: [{ text: "不要把局部优化当作系统优化", tone: "core" }]
          })
        ]
      }
    ]);

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "作者反复强调，真正要避免的是“不要把局部优化当作系统优化”这种误区。"
    );
    expect(screen.getByRole("listitem").querySelector("mark")).toBeNull();
    expect(screen.getByRole("listitem").querySelector("blockquote")).toBeNull();
    expect(container.querySelector("[data-testid='learning-quote-highlight']")).toBeNull();
    expect(container.querySelector("[data-testid='learning-emphasis-fallback']")).toBeNull();
  });

  it("keeps fallback emphasis data hidden from the UI", () => {
    const { container } = renderView([
      {
        key: "fallback",
        title: "关键细节",
        items: [
          createItem({
            sentence:
              "OpenAI 内部实验显示，3-7名工程师通过 Harness 工程把复杂任务拆成可复用流程，整体效率提升约10倍。",
            emphasisSpans: [],
            fallbackEmphasis: {
              text: "3-7名工程师 · Harness 工程 · 效率约10倍",
              tone: "warning"
            }
          })
        ]
      }
    ]);

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "OpenAI 内部实验显示，3-7名工程师通过 Harness 工程把复杂任务拆成可复用流程，整体效率提升约10倍。"
    );
    expect(screen.getByRole("listitem").querySelector("mark")).toBeNull();
    expect(screen.getByRole("listitem").querySelector("blockquote")).toBeNull();
    expect(container.querySelector("[data-testid='learning-emphasis-fallback']")).toBeNull();
    expect(container.querySelector("[data-testid='learning-quote-highlight']")).toBeNull();
  });

  it("renders plain text cleanly when no emphasis signal is available", () => {
    renderView([
      {
        key: "plain",
        title: "可复用点",
        items: [createItem({ sentence: "先写出最小动作。", emphasisSpans: [] })]
      }
    ]);

    const listItem = screen.getByRole("listitem");
    expect(listItem).toHaveTextContent("1.先写出最小动作。");
    expect(listItem.querySelector("mark")).toBeNull();
    expect(listItem.querySelector("blockquote")).toBeNull();
  });

  it("keeps framework sentences intact without breaking parallel members apart", () => {
    renderView([
      {
        key: "framework",
        title: "逻辑框架",
        items: [
          createItem({
            sentence:
              "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。"
          })
        ]
      }
    ]);

    const listItem = screen.getByRole("listitem");
    expect(listItem).toHaveTextContent(
      "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。"
    );
    expect(listItem.querySelector("mark")).toBeNull();
  });

  it("does not render deprecated secondary labels or chips anymore", () => {
    const { container } = renderView([
      {
        key: "legend",
        title: "核心结论",
        items: [
          createItem({
            emphasisSpans: [{ text: "明确目标", tone: "core" }]
          })
        ]
      }
    ]);

    expect(screen.queryByText("辅助重点")).not.toBeInTheDocument();
    expect(screen.queryByText("secondary")).not.toBeInTheDocument();
    expect(container.querySelector("mark")).toBeNull();
    expect(container.querySelector("blockquote")).toBeNull();
    expect(container.querySelector("[data-testid='learning-emphasis-fallback']")).toBeNull();
    expect(container.querySelector("[data-testid='learning-quote-highlight']")).toBeNull();
  });
});
