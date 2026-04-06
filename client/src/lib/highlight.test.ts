import { describe, expect, it } from "vitest";

import { splitTextWithHighlights } from "./highlight";

describe("splitTextWithHighlights", () => {
  it("expands english highlights to full word boundaries", () => {
    const segments = splitTextWithHighlights("Build a camera ecosystem that compounds over time.", [
      { text: "camera ecos", tone: "method" }
    ]);

    expect(segments).toEqual([
      { text: "Build a ", tone: null },
      { text: "camera ecosystem", tone: "method" },
      { text: " that compounds over time.", tone: null }
    ]);
  });

  it("expands chinese highlights to full phrases instead of partial fragments", () => {
    const segments = splitTextWithHighlights("先明确目标，再拆步骤。", [
      { text: "明确目标", tone: "core" }
    ]);

    expect(segments).toEqual([
      { text: "先明确目标", tone: "core" },
      { text: "，再拆步骤。", tone: null }
    ]);
  });

  it("does not highlight a standalone connector with no semantic payload", () => {
    const segments = splitTextWithHighlights("例如，用会员体系筛选高价值用户。", [
      { text: "例如", tone: "action" }
    ]);

    expect(segments).toEqual([{ text: "例如，用会员体系筛选高价值用户。", tone: null }]);
  });

  it("prefers a fuller example clause over a short fragment", () => {
    const segments = splitTextWithHighlights("例如，用会员体系筛选高价值用户，再决定是否加大投放。", [
      { text: "会员体系", tone: "action" }
    ]);

    expect(segments).toEqual([
      { text: "例如，用会员体系筛选高价值用户，再决定是否加大投放", tone: "action" },
      { text: "。", tone: null }
    ]);
  });

  it("keeps comparison context instead of highlighting only half of the object", () => {
    const segments = splitTextWithHighlights("相比之下，长期复利模型比一次性爆款更稳。", [
      { text: "长期复利模型", tone: "method" }
    ]);

    expect(segments).toEqual([
      { text: "相比之下，长期复利模型比一次性爆款更稳", tone: "method" },
      { text: "。", tone: null }
    ]);
  });

  it("includes the condition and the constrained statement in one semantic span", () => {
    const segments = splitTextWithHighlights("如果样本量不足，就不要过早下结论。", [
      { text: "样本量不足", tone: "warning" }
    ]);

    expect(segments).toEqual([
      { text: "如果样本量不足，就不要过早下结论", tone: "warning" },
      { text: "。", tone: null }
    ]);
  });
});
