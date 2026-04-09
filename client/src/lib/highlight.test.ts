import { describe, expect, it } from "vitest";

import { normalizeHighlightsForItem, splitTextWithHighlights } from "./highlight";

describe("normalizeHighlightsForItem", () => {
  it("cuts a sentence-level candidate down to phrase-level highlights", () => {
    const highlights = normalizeHighlightsForItem("如果样本量不足，就不要过早下结论。", [
      { text: "如果样本量不足，就不要过早下结论。", tone: "warning" }
    ]);

    expect(highlights).toEqual([{ text: "就不要过早下结论", priority: "primary" }]);
  });

  it("keeps at most two highlights per item", () => {
    const highlights = normalizeHighlightsForItem("先定义目标，再拆步骤，然后补关键细节，最后复盘。", [
      { text: "定义目标", tone: "core" },
      { text: "拆步骤", tone: "method" },
      { text: "关键细节", tone: "warning" },
      { text: "复盘", tone: "action" }
    ]);

    expect(highlights).toHaveLength(2);
    expect(highlights.map((item) => item.priority).sort()).toEqual(["primary", "secondary"]);
  });

  it("dedupes overlapping or near-duplicate candidates", () => {
    const highlights = normalizeHighlightsForItem("先拆步骤，再拆步骤校验结果。", [
      { text: "拆步骤", tone: "method" },
      { text: "先拆步骤", tone: "method" },
      { text: "拆步骤校验结果", tone: "action" }
    ]);

    expect(highlights).toEqual([
      { text: "先拆步骤", priority: "secondary" },
      { text: "拆步骤校验结果", priority: "primary" }
    ]);
  });

  it("never falls back to the full sentence when a candidate is too long", () => {
    const highlights = normalizeHighlightsForItem(
      "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作。",
      [{ text: "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作", tone: "core" }]
    );

    expect(highlights).not.toEqual([
      {
        text: "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作",
        priority: "primary"
      }
    ]);
    expect(highlights).toHaveLength(1);
    expect(highlights[0]?.text.length).toBeLessThan(
      "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作".length
    );
  });

  it("returns an empty list when no meaningful fragment can be formed", () => {
    const highlights = normalizeHighlightsForItem("例如，用会员体系筛选高价值用户。", [
      { text: "例如", tone: "action" }
    ]);

    expect(highlights).toEqual([]);
  });

  it("filters low-signal standalone role labels by default", () => {
    const highlights = normalizeHighlightsForItem("主持人", [{ text: "主持人", tone: "core" }]);

    expect(highlights).toEqual([]);
  });

  it("keeps a complete phrase when the role is directly tied to a judgment", () => {
    const highlights = normalizeHighlightsForItem("专家认为核心问题不在成本，而在信号失真。", [
      { text: "专家认为核心问题不在成本", tone: "core" },
      { text: "而在信号失真", tone: "warning" }
    ]);

    expect(highlights).toEqual([
      { text: "专家认为核心问题不在成本", priority: "primary" },
      { text: "而在信号失真", priority: "secondary" }
    ]);
  });

  it("prefers the claim content over an attribution shell", () => {
    const highlights = normalizeHighlightsForItem("前国家反恐中心主任乔·肯特认为俄罗斯并不可信。", [
      { text: "前国家反恐中心主任乔·肯特认为", tone: "core" },
      { text: "俄罗斯并不可信", tone: "warning" }
    ]);

    expect(highlights).toEqual([
      { text: "俄罗斯并不可信", priority: "primary" }
    ]);
  });

  it("does not promote source-group shells into the main highlight", () => {
    const highlights = normalizeHighlightsForItem("特朗普的一些支持者仍然认为停火协议并不可靠。", [
      { text: "特朗普的一些支持者", tone: "core" },
      { text: "停火协议并不可靠", tone: "warning" }
    ]);

    expect(highlights).toEqual([{ text: "停火协议并不可靠", priority: "primary" }]);
  });

  it("prefers the judgment nucleus over sentence-opening framing shells", () => {
    const highlights = normalizeHighlightsForItem("在国际冲突中，真正的问题在于信号失真会放大误判。", [
      { text: "在国际冲突中", tone: "method" },
      { text: "信号失真会放大误判", tone: "warning" }
    ]);

    expect(highlights).toEqual([{ text: "信号失真会放大误判", priority: "primary" }]);
  });

  it("downranks conditional shells so the retained highlight stays on the risk", () => {
    const highlights = normalizeHighlightsForItem("如果美国试图消灭伊朗文明，局势只会进一步升级。", [
      { text: "如果美国试图消灭伊朗文明", tone: "warning" },
      { text: "局势只会进一步升级", tone: "warning" }
    ]);

    expect(highlights).toEqual([{ text: "局势只会进一步升级", priority: "primary" }]);
  });
});

describe("splitTextWithHighlights", () => {
  it("renders sparse inline highlights without expanding them back into full sentences", () => {
    const segments = splitTextWithHighlights("先明确目标，再拆步骤。", [
      { text: "明确目标", priority: "primary" },
      { text: "拆步骤", priority: "secondary" }
    ]);

    expect(segments).toEqual([
      { text: "先", priority: null },
      { text: "明确目标", priority: "primary" },
      { text: "，再", priority: null },
      { text: "拆步骤", priority: "secondary" },
      { text: "。", priority: null }
    ]);
  });
});
