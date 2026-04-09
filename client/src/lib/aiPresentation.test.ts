import { describe, expect, it } from "vitest";

import { buildKnowledgeSections } from "./aiPresentation";
import type { LearningOutput } from "../types/domain";

describe("buildKnowledgeSections", () => {
  it("normalizes highlights per item instead of sharing one section-wide list", () => {
    const result: LearningOutput = {
      coreConclusion: "先明确目标，再拆步骤。",
      logicFramework: ["先定义目标，再拆步骤", "最后复盘修正"],
      keyDetails: ["注意前提条件是否成立"],
      reusablePoints: ["先写出最小动作"],
      highlights: {
        logicFramework: [{ text: "先定义目标，再拆步骤", tone: "method" }]
      }
    };

    const sections = buildKnowledgeSections("learning", result, {
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点"
    });

    const logicSection = sections.find((section) => section.key === "logicFramework");
    expect(logicSection).toBeDefined();
    expect(logicSection?.items[0]?.highlights).toEqual([
      { text: "先定义目标", priority: "primary" },
      { text: "再拆步骤", priority: "secondary" }
    ]);
    expect(logicSection?.items[1]?.highlights).toEqual([]);
  });

  it("allows empty highlights when nothing compact is trustworthy enough", () => {
    const result: LearningOutput = {
      coreConclusion: "例如，照搬别人的整套流程并不可靠。",
      logicFramework: [],
      keyDetails: [],
      reusablePoints: [],
      highlights: {
        coreConclusion: [{ text: "例如", tone: "core" }]
      }
    };

    const sections = buildKnowledgeSections("learning", result, {
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点"
    });

    expect(sections[0]?.items[0]?.highlights).toEqual([]);
  });

  it("does not promote low-signal standalone roles into learning highlights", () => {
    const result: LearningOutput = {
      coreConclusion: "主持人",
      logicFramework: [],
      keyDetails: [],
      reusablePoints: [],
      highlights: undefined
    };

    const sections = buildKnowledgeSections("learning", result, {
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点"
    });

    expect(sections[0]?.items[0]?.highlights).toEqual([]);
  });

  it("keeps explicit learning highlights without stacking extra fallback emphasis", () => {
    const result: LearningOutput = {
      coreConclusion: "专家认为核心问题不在成本，而在信号失真。",
      logicFramework: [],
      keyDetails: [],
      reusablePoints: [],
      highlights: {
        coreConclusion: [
          { text: "专家认为核心问题不在成本", tone: "core" },
          { text: "而在信号失真", tone: "warning" }
        ]
      }
    };

    const sections = buildKnowledgeSections("learning", result, {
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点"
    });

    expect(sections[0]?.items[0]?.highlights).toEqual([
      { text: "专家认为核心问题不在成本", priority: "primary" },
      { text: "而在信号失真", priority: "secondary" }
    ]);
  });

  it("prefers claim nuclei over attribution and framing shells in learning fallback", () => {
    const result: LearningOutput = {
      coreConclusion: "前国家反恐中心主任乔·肯特认为俄罗斯并不可信。",
      logicFramework: ["在国际冲突中，真正的问题在于信号失真会放大误判。"],
      keyDetails: [],
      reusablePoints: [],
      highlights: undefined
    };

    const sections = buildKnowledgeSections("learning", result, {
      summary: "摘要",
      bullets: "要点",
      coreConclusion: "核心结论",
      logicFramework: "逻辑框架",
      keyDetails: "关键细节",
      reusablePoints: "可复用点"
    });

    expect(sections[0]?.items[0]?.highlights).toEqual([{ text: "俄罗斯并不可信", priority: "primary" }]);
    expect(sections[1]?.items[0]?.highlights).toEqual([{ text: "信号失真会放大误判", priority: "primary" }]);
  });
});
