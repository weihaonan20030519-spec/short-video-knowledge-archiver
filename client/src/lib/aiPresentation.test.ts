import { describe, expect, it } from "vitest";

import { buildKnowledgeSections } from "./aiPresentation";
import type { LearningOutput } from "../types/domain";

const labels = {
  summary: "摘要",
  bullets: "要点",
  coreConclusion: "核心结论",
  logicFramework: "逻辑框架",
  keyDetails: "关键细节",
  reusablePoints: "可复用点"
};

describe("buildKnowledgeSections", () => {
  it("keeps each learning item as a complete sentence and only adds optional inline emphasis", () => {
    const result: LearningOutput = {
      coreConclusion: "先明确目标，再拆步骤。",
      logicFramework: ["先定义目标，再拆步骤", "最后复盘修正"],
      keyDetails: ["注意前提条件是否成立"],
      reusablePoints: ["先写出最小动作"],
      highlights: {
        logicFramework: [
          { text: "先定义目标", tone: "method" },
          { text: "再拆步骤", tone: "action" }
        ]
      }
    };

    const sections = buildKnowledgeSections("learning", result, labels);
    const logicSection = sections.find((section) => section.key === "logicFramework");

    expect(logicSection?.items[0]?.sentence).toBe("先定义目标，再拆步骤");
    expect(logicSection?.items[0]?.mode).toBe("emphasis");
    expect(logicSection?.items[0]?.quoteHighlight).toBeNull();
    expect(logicSection?.items[0]?.emphasisSpans).toEqual([
      { text: "定义目标", tone: "method" }
    ]);
    expect(logicSection?.items[0]?.fallbackEmphasis).toBeNull();
    expect(logicSection?.items[1]?.sentence).toBe("最后复盘修正");
    expect(logicSection?.items[1]?.emphasisSpans).toEqual([]);
  });

  it("keeps learning coreConclusion in inline emphasis mode instead of promoting quote blocks", () => {
    const result: LearningOutput = {
      coreConclusion: "作者反复强调，真正要避免的是“不要把局部优化当作系统优化”这种误区。",
      logicFramework: [],
      keyDetails: [],
      reusablePoints: [],
      highlights: {
        coreConclusion: [{ text: "不要把局部优化当作系统优化", tone: "core" }]
      }
    };

    const sections = buildKnowledgeSections("learning", result, labels);

    expect(sections[0]?.items[0]).toEqual({
      sentence: "作者反复强调，真正要避免的是“不要把局部优化当作系统优化”这种误区。",
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans: [{ text: "不要把局部优化当作系统优化", tone: "core" }],
      fallbackEmphasis: null,
      coverageFallback: {
        text: "不要把局部优化当作系统优化",
        tone: "core"
      }
    });
  });

  it("does not promote framework sentences by cutting parallel members apart", () => {
    const result: LearningOutput = {
      coreConclusion: "",
      logicFramework: [
        "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。"
      ],
      keyDetails: [],
      reusablePoints: [],
      highlights: {
        logicFramework: [
          { text: "信息层（Context Engineering）", tone: "method" },
          { text: "约束层（Architectural Constraints）", tone: "method" }
        ]
      }
    };

    const sections = buildKnowledgeSections("learning", result, labels);

    expect(sections[0]?.items[0]?.sentence).toContain("Harness 工程的三大支柱");
    expect(sections[0]?.items[0]?.mode).toBe("none");
    expect(sections[0]?.items[0]?.emphasisSpans).toEqual([]);
    expect(sections[0]?.items[0]?.fallbackEmphasis).toBeNull();
    expect(sections[0]?.items[0]?.coverageFallback).toEqual({
      text: "Harness 工程",
      tone: "method"
    });
  });

  it("falls back to a compact evidence emphasis instead of rendering a long repeated quote block", () => {
    const result: LearningOutput = {
      coreConclusion: "",
      logicFramework: [],
      keyDetails: [
        "OpenAI 内部实验显示，3-7名工程师通过 Harness 工程把复杂任务拆成可复用流程，整体效率提升约10倍。"
      ],
      reusablePoints: [],
      highlights: {
        keyDetails: [
          { text: "3-7名", tone: "warning" },
          { text: "Harness 工程", tone: "warning" },
          { text: "效率提升约10倍", tone: "warning" }
        ]
      }
    };

    const sections = buildKnowledgeSections("learning", result, labels);

    expect(sections[0]?.items[0]?.mode).toBe("emphasis");
    expect(sections[0]?.items[0]?.quoteHighlight).toBeNull();
    expect(sections[0]?.items[0]?.emphasisSpans).toEqual([
      { text: "效率提升约10倍", tone: "warning" }
    ]);
    expect(sections[0]?.items[0]?.fallbackEmphasis).toBeNull();
  });

  it("uses section-specific navigation anchors across learning sections", () => {
    const result: LearningOutput = {
      coreConclusion: "Harness 工程的核心价值不在于堆砌提示词，而在于构建可复用系统。",
      logicFramework: ["混杂输入会遮蔽信息层级，导致输出退化为事实罗列。"],
      keyDetails: ["OpenAI 在报告《Harness engineering》中明确指出其关注点是系统级稳定性。"],
      reusablePoints: ["设计阶段需显式划分提示层与系统层职责，避免用提示工程掩盖架构缺陷。"]
    };

    const sections = buildKnowledgeSections("learning", result, labels);

    expect(sections.find((section) => section.key === "coreConclusion")?.items[0]?.emphasisSpans).toEqual([
      { text: "构建可复用系统", tone: "core" }
    ]);
    expect(sections.find((section) => section.key === "logicFramework")?.items[0]?.emphasisSpans).toEqual([
      { text: "导致输出退化为事实罗列", tone: "method" }
    ]);
    expect(sections.find((section) => section.key === "keyDetails")?.items[0]?.emphasisSpans).toEqual([
      { text: "其关注点是系统级稳定性", tone: "warning" }
    ]);
    expect(sections.find((section) => section.key === "reusablePoints")?.items[0]?.emphasisSpans).toEqual([
      { text: "显式划分提示层与系统层职责", tone: "action" }
    ]);
  });

  it("keeps governor words when list fragments are too scattered for inline emphasis", () => {
    const result: LearningOutput = {
      coreConclusion: "",
      logicFramework: [],
      keyDetails: ["常见问题包括 Agent 漂移、缺乏反馈机制和目标错位。"],
      reusablePoints: [],
      highlights: {
        keyDetails: [{ text: "Agent 漂移、缺乏反馈机制和目标错位", tone: "warning" }]
      }
    };

    const sections = buildKnowledgeSections("learning", result, labels);

    expect(sections[0]?.items[0]?.emphasisSpans).toEqual([]);
    expect(sections[0]?.items[0]?.fallbackEmphasis).toEqual({
      text: "常见问题包括 Agent 漂移",
      tone: "warning"
    });
  });

  it("uses coverage fallback after consecutive no-signal cards so the section does not become a highlight desert", () => {
    const result: LearningOutput = {
      coreConclusion: "",
      logicFramework: [
        "HashiCorp 联合提出 Harness 工程。",
        "OpenAI 推出 Codex。",
        "提示词工程仍关注单次回答质量。"
      ],
      keyDetails: [],
      reusablePoints: [],
      highlights: undefined
    };

    const sections = buildKnowledgeSections("learning", result, labels);
    const items = sections[0]?.items || [];

    expect(items[0]?.mode).toBe("none");
    expect(items[0]?.fallbackEmphasis).toBeNull();
    expect(items[1]).toEqual({
      sentence: "OpenAI 推出 Codex。",
      mode: "emphasis",
      quoteHighlight: null,
      emphasisSpans: [],
      fallbackEmphasis: {
        text: "Codex",
        tone: "method"
      },
      coverageFallback: {
        text: "Codex",
        tone: "method"
      }
    });
  });
});
