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
      rawText: "A long enough source text for testing."
    });

    expect(prompt.systemInstruction).toContain("The output language is mandatory: English");
    expect(prompt.userPrompt).toContain("App language: en");
    expect(prompt.userPrompt).toContain('"bullets"');
    expect(prompt.userPrompt).not.toContain('"highlights"');
  });

  it("forces learning output to follow Simplified Chinese app language", () => {
    const prompt = buildLearningPrompt({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "提示测试",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText: "这是一段足够长的原始内容，用于测试提示词。"
    });

    expect(prompt.systemInstruction).toContain("Simplified Chinese");
    expect(prompt.userPrompt).toContain("App language: zh-CN");
    expect(prompt.userPrompt).toContain('"reusablePoints"');
    expect(prompt.userPrompt).not.toContain('"highlights"');
  });
});
