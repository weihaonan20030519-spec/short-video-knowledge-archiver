import { describe, expect, it } from "vitest";

import { scoreAnalyzeDecisionSignals } from "./confidenceScorer.js";

describe("scoreAnalyzeDecisionSignals", () => {
  it("marks clearly short learning content as insufficient", () => {
    const signals = scoreAnalyzeDecisionSignals({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText: "这是一段很短的内容，没有太多结构，也不足以支撑完整学习整理。"
    });

    expect(signals.sufficiency).toBe("insufficient");
    expect(signals.ambiguity).toBe("high");
    expect(signals.localityFit).toBe("not_applicable");
  });

  it("marks mid-length learning content as borderline", () => {
    const signals = scoreAnalyzeDecisionSignals({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "阶段总结",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText:
        "第一步先确认目标。第二步拆出执行动作。第三步记录观察结果。最后补一条注意事项，避免只保留零散印象。"
    });

    expect(signals.sufficiency).toBe("borderline");
    expect(signals.ambiguity).toBe("low");
  });

  it("marks long structured learning content as sufficient", () => {
    const signals = scoreAnalyzeDecisionSignals({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "复盘方法",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText:
        "先界定问题的边界，再说明为什么原方案失效。接着把新的拆解方法分成三段：目标判断、执行动作、复盘记录。每一段都给出具体例子和适用条件。最后补充常见误区，以及什么时候应该停止追加动作、转向重新定义问题。"
    });

    expect(signals.sufficiency).toBe("sufficient");
    expect(signals.ambiguity).toBe("low");
    expect(signals.localityFit).toBe("not_applicable");
  });

  it("produces a strong localityFit for compact structured concise text", () => {
    const signals = scoreAnalyzeDecisionSignals({
      mode: "concise",
      appLanguage: "zh-CN",
      title: "三步法",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText: "先定目标。再拆步骤。最后复盘结果，补充注意事项。"
    });

    expect(signals.localityFit).toBe("strong");
  });
});
