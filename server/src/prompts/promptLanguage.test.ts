import { describe, expect, it } from "vitest";

import { buildConcisePrompt } from "./concisePrompt.js";
import { buildLearningPrompt } from "./learningPrompt.js";

describe("analyze prompts", () => {
  it("forces concise output to follow English app language", () => {
    const prompt = buildConcisePrompt({
      mode: "concise",
      appLanguage: "en",
      title: "Prompt test",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText:
        "The real point is to judge first, then summarize. [图片文字补充] Screenshot text adds extra evidence."
    });

    expect(prompt.systemInstruction).toContain("The output language is mandatory: English");
    expect(prompt.userPrompt).toContain("App language: en");
    expect(prompt.userPrompt).toContain('"bullets"');
    expect(prompt.userPrompt).not.toContain('"highlights"');
    expect(prompt.userPrompt).toContain("Input layers and priority:");
    expect(prompt.userPrompt).toContain("primary_body:");
    expect(prompt.userPrompt).toContain("ocr_supplement:");
    expect(prompt.userPrompt).toContain("background_or_meta:");
    expect(prompt.userPrompt).toContain("must not dominate summary");
  });

  it("forces learning output to follow Simplified Chinese app language", () => {
    const prompt = buildLearningPrompt({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "提示测试",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText:
        "真正重点是学习版必须先判断主结论，再解释为什么成立，并提炼可迁移的方法。包括背景信息、传播信息和标题壳都不该主导结论。"
    });

    expect(prompt.systemInstruction).toContain("Simplified Chinese");
    expect(prompt.userPrompt).toContain("App language: zh-CN");
    expect(prompt.userPrompt).toContain('"claimCore"');
    expect(prompt.userPrompt).toContain('"actionRules"');
    expect(prompt.userPrompt).not.toContain('"highlights"');
    expect(prompt.userPrompt).toContain("Generation units you must produce before section mapping:");
    expect(prompt.userPrompt).toContain("claimCore: one sharp judgment kernel");
    expect(prompt.userPrompt).toContain("claimContrast: optional");
    expect(prompt.userPrompt).toContain("decisiveEvidence: only the hardest evidence");
    expect(prompt.userPrompt).toContain("actionRules: only transferable action rules");
    expect(prompt.userPrompt).toContain("coreConclusion will be mapped from claimCore");
    expect(prompt.userPrompt).toContain("logicFramework will be mapped from claimContrast plus mechanismChain");
    expect(prompt.userPrompt).toContain("keyDetails will be mapped from decisiveEvidence");
    expect(prompt.userPrompt).toContain("reusablePoints will be mapped from actionRules");
    expect(prompt.userPrompt).toContain("must not read like a slightly longer concise summary");
    expect(prompt.userPrompt).toContain("do not let Full raw text for backup reference pull you back into representative-summary mode");
  });

  it("supports experiment matrix variants for concise prompts", () => {
    const input = {
      mode: "concise" as const,
      appLanguage: "zh-CN" as const,
      title: "标题",
      sourcePlatform: "unknown" as const,
      originalUrl: null,
      rawText: "真正重点是先判断，再总结。 [图片文字补充] 图中文字说明了额外证据。"
    };

    const legacyPrompt = buildConcisePrompt(input, {
      methodology: "legacy",
      inputVariant: "raw_text_only"
    });
    const layeredPrompt = buildConcisePrompt(input, {
      methodology: "restructured",
      inputVariant: "audited_layers"
    });

    expect(legacyPrompt.userPrompt).toContain("Raw text:");
    expect(legacyPrompt.userPrompt).not.toContain("Input layers and priority:");
    expect(legacyPrompt.userPrompt).not.toContain("must not dominate summary");
    expect(layeredPrompt.userPrompt).toContain("Input layers and priority:");
    expect(layeredPrompt.userPrompt).toContain("must not dominate summary");
  });

  it("supports experiment matrix variants for learning prompts", () => {
    const input = {
      mode: "learning" as const,
      appLanguage: "zh-CN" as const,
      title: "标题",
      sourcePlatform: "unknown" as const,
      originalUrl: null,
      rawText: "真正重点是先判断主结论，再解释为什么成立，并提炼可迁移的方法。"
    };

    const legacyPrompt = buildLearningPrompt(input, {
      methodology: "legacy",
      inputVariant: "raw_text_only"
    });
    const restructuredPrompt = buildLearningPrompt(input, {
      methodology: "restructured",
      inputVariant: "audited_layers"
    });

    expect(legacyPrompt.userPrompt).toContain("logicFramework should describe the visible structure");
    expect(legacyPrompt.userPrompt).not.toContain("Generation units you must produce before section mapping:");
    expect(restructuredPrompt.userPrompt).toContain("Generation units you must produce before section mapping:");
    expect(restructuredPrompt.userPrompt).toContain('"claimCore"');
  });
});
