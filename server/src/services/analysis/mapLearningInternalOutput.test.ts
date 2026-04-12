import { describe, expect, it } from "vitest";

import { mapLearningInternalOutput } from "./mapLearningInternalOutput.js";

describe("mapLearningInternalOutput", () => {
  it("maps learning units back into the existing shared learning contract", () => {
    const result = mapLearningInternalOutput({
      claimCore: "核心判断",
      claimContrast: "不要把重点理解成表层传播",
      mechanismChain: ["先区分主张与包装壳", "再解释机制如何成立"],
      decisiveEvidence: ["最硬证据是系统级对比结果"],
      actionRules: ["先判断，再总结", "优先系统约束，不要堆砌提示词"]
    });

    expect(result).toEqual({
      coreConclusion: "核心判断",
      logicFramework: ["不要把重点理解成表层传播", "先区分主张与包装壳", "再解释机制如何成立"],
      keyDetails: ["最硬证据是系统级对比结果"],
      reusablePoints: ["先判断，再总结", "优先系统约束，不要堆砌提示词"]
    });
  });

  it("deduplicates empty and repeated values during mapping", () => {
    const result = mapLearningInternalOutput({
      claimCore: "核心判断",
      claimContrast: " ",
      mechanismChain: ["先判断主张", "先判断主张", "   "],
      decisiveEvidence: ["关键证据", "关键证据"],
      actionRules: ["先判断，再总结", "先判断，再总结"]
    });

    expect(result.logicFramework).toEqual(["先判断主张"]);
    expect(result.keyDetails).toEqual(["关键证据"]);
    expect(result.reusablePoints).toEqual(["先判断，再总结"]);
  });

  it("strips report and wrapper shells from decisive evidence when the evidence body remains intact", () => {
    const result = mapLearningInternalOutput({
      claimCore: "核心判断",
      claimContrast: null,
      mechanismChain: [],
      decisiveEvidence: [
        "OpenAI报告《Harness engineering》明确指出其关注点是整个系统如何稳定运行，而非单次提示词优化",
        "真正有价值的部分是：把流程、约束和反馈做成系统"
      ],
      actionRules: []
    });

    expect(result.keyDetails).toEqual([
      "其关注点是整个系统如何稳定运行，而非单次提示词优化",
      "把流程、约束和反馈做成系统"
    ]);
  });
});
