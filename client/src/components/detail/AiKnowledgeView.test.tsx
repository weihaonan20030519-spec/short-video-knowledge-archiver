import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiKnowledgeView } from "./AiKnowledgeView";
import type { KnowledgeSection } from "../../lib/aiPresentation";

function renderView(sections: KnowledgeSection[]) {
  return render(
    <AiKnowledgeView
      sections={sections}
      previewHint="AI 会只标亮少量句内重点。"
      legend={{
        primary: "主重点",
        secondary: "辅助重点"
      }}
    />
  );
}

describe("AiKnowledgeView", () => {
  it("renders a single primary highlight", () => {
    renderView([
      {
        key: "core",
        title: "核心结论",
        items: [{ text: "先明确目标，再拆步骤。", highlights: [{ text: "明确目标", priority: "primary" }] }]
      }
    ]);

    const mark = screen.getByText("明确目标").closest("mark");
    expect(mark).not.toBeNull();
    expect(mark).toHaveClass("bg-amber-100");
  });

  it("renders primary and secondary highlights with different visual weight", () => {
    renderView([
      {
        key: "logic",
        title: "逻辑框架",
        items: [
          {
            text: "先定义目标，再拆步骤。",
            highlights: [
              { text: "定义目标", priority: "primary" },
              { text: "拆步骤", priority: "secondary" }
            ]
          }
        ]
      }
    ]);

    const primary = screen.getByText("定义目标").closest("mark");
    const secondary = screen.getByText("拆步骤").closest("mark");
    expect(primary).toHaveClass("bg-amber-100");
    expect(secondary).toHaveClass("bg-slate-100");
  });

  it("renders plain text cleanly when no highlights are available", () => {
    renderView([
      {
        key: "plain",
        title: "可复用点",
        items: [{ text: "先写出最小动作。", highlights: [] }]
      }
    ]);

    const listItem = screen.getByRole("listitem");
    expect(listItem).toHaveTextContent("1.先写出最小动作。");
    expect(listItem.querySelector("mark")).toBeNull();
  });

  it("marks only the intended occurrence when repeated text exists", () => {
    renderView([
      {
        key: "repeat",
        title: "关键细节",
        items: [{ text: "先拆步骤，再拆步骤校验结果。", highlights: [{ text: "拆步骤校验结果", priority: "primary" }] }]
      }
    ]);

    const listItem = screen.getByRole("listitem");
    expect(screen.getByText("拆步骤校验结果").closest("mark")).not.toBeNull();
    expect(listItem).toHaveTextContent("先拆步骤，再拆步骤校验结果。");
  });

  it("keeps highlight chips compact without introducing layout-only wrappers", () => {
    renderView([
      {
        key: "compact",
        title: "摘要",
        items: [{ text: "把重点压到短语级。", highlights: [{ text: "短语级", priority: "primary" }] }]
      }
    ]);

    const mark = screen.getByText("短语级").closest("mark");
    expect(mark).toHaveClass("rounded", "px-1.5", "py-0.5");
  });

  it("renders a lighter reading surface while keeping section cards intact", () => {
    renderView([
      {
        key: "surface",
        title: "核心结论",
        items: [{ text: "把重点压到短语级。", highlights: [{ text: "短语级", priority: "primary" }] }]
      }
    ]);

    expect(screen.getByTestId("learning-section-card")).toHaveClass("bg-white/95");
  });
});
