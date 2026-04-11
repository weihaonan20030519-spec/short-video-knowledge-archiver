import { describe, expect, it } from "vitest";

import {
  type EmphasisSpan,
  normalizeSentenceEmphasisPresentation,
  normalizeEmphasisSpansForSentence,
  normalizeHighlightsForItem,
  splitSentenceWithEmphasis,
  splitTextWithHighlights
} from "./highlight";

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

describe("normalizeEmphasisSpansForSentence", () => {
  it("returns at most two optional emphasis spans while keeping the full sentence outside the helper", () => {
    const spans = normalizeEmphasisSpansForSentence("专家认为核心问题不在成本，而在信号失真。", [
      { text: "专家认为核心问题不在成本", tone: "core" },
      { text: "而在信号失真", tone: "warning" }
    ], "core", "coreConclusion");

    expect(spans).toEqual([
      { text: "而在信号失真", tone: "core" }
    ]);
  });

  it("does not return a whole-sentence emphasis span", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作。",
      [
        {
          text: "增长的关键不是把所有动作都做一遍，而是先找到真正能带来反馈回路的那个动作",
          tone: "core"
        }
      ],
      "core",
      "coreConclusion"
    );

    expect(spans).toEqual([
      { text: "先找到真正能带来反馈回路的那个动作", tone: "core" }
    ]);
  });

  it("skips framework sentences rather than breaking parallel members apart", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。",
      [
        { text: "信息层（Context Engineering）", tone: "method" },
        { text: "约束层（Architectural Constraints）", tone: "method" }
      ],
      "method",
      "logicFramework"
    );

    expect(spans).toEqual([]);
  });

  it("rejects mixed-script fragments that split identifiers like AGENTS.md, but still allows a safer fallback emphasis", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "AGENTS.md 的正确使用方法：作为目录而非百科全书。",
      [{ text: "md 的正确使用方法", tone: "action" }],
      "action",
      "reusablePoints"
    );

    expect(spans).toEqual([{ text: "作为目录而非百科全书", tone: "action" }]);
  });

  it("allows no emphasis when only low-signal labels are available", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "OpenAI 的内部实验战绩：展示 Harness 工程的实际效果。",
      [{ text: "内部实验战绩", tone: "warning" }],
      "warning",
      "keyDetails"
    );

    expect(spans).toEqual([]);
  });

  it("does not highlight a book-title fragment unless it can act as a trustworthy information center", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "推荐阅读《Harness engineering》来理解 Harness 工程。",
      [{ text: "Harness engineering", tone: "core" }],
      "core",
      "coreConclusion"
    );

    expect(spans).toEqual([]);
  });

  it("does not leave parenthetical fragments half-open when the glossary itself is not worth emphasizing", () => {
    const spans = normalizeEmphasisSpansForSentence(
      "约束层（Architectural Constraints）决定系统边界。",
      [{ text: "Architectural Constraints", tone: "method" }],
      "method",
      "logicFramework"
    );

    expect(spans).toEqual([{ text: "决定系统边界", tone: "method" }]);
  });
});

describe("splitSentenceWithEmphasis", () => {
  it("embeds safe emphasis spans back into the sentence for inline rendering", () => {
    const spans: EmphasisSpan[] = [
      { text: "明确目标", tone: "core" },
      { text: "拆步骤", tone: "action" }
    ];

    expect(splitSentenceWithEmphasis("先明确目标，再拆步骤。", spans)).toEqual([
      { text: "先", tone: null },
      { text: "明确目标", tone: "core" },
      { text: "，再", tone: null },
      { text: "拆步骤", tone: "action" },
      { text: "。", tone: null }
    ]);
  });

  it("falls back to plain sentence rendering when there is no safe emphasis", () => {
    expect(
      splitSentenceWithEmphasis(
        "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。",
        [{ text: "信息层（Context Engineering）", tone: "method" }]
      )
    ).toEqual([
      {
        text:
          "Harness 工程的三大支柱：信息层（Context Engineering）、约束层（Architectural Constraints）、熵管理层（Entropy Management）。",
        tone: null
      }
    ]);
  });

  it("does not reintroduce broken mixed-script inline highlights", () => {
    expect(
      splitSentenceWithEmphasis("AGENTS.md 的正确使用方法：作为目录而非百科全书。", [
        { text: "md 的正确使用方法", tone: "action" }
      ])
    ).toEqual([
      { text: "AGENTS.md 的正确使用方法：作为目录而非百科全书。", tone: null }
    ]);
  });
});

describe("normalizeSentenceEmphasisPresentation", () => {
  it("does not keep example lists without their governor word", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "常见问题包括 Agent 漂移、缺乏反馈机制和目标错位。",
      [{ text: "Agent 漂移、缺乏反馈机制和目标错位", tone: "warning" }],
      "warning",
      "keyDetails"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.quoteHighlight).toBeNull();
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "常见问题包括 Agent 漂移",
      tone: "warning"
    });
  });

  it("binds evidence fragments into a single result-oriented fallback unit", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "OpenAI 内部实验显示，3-7名工程师通过 Harness 工程把复杂任务拆成可复用流程，整体效率提升约10倍。",
      [
        { text: "3-7名", tone: "warning" },
        { text: "Harness 工程", tone: "warning" },
        { text: "效率提升约10倍", tone: "warning" }
      ],
      "warning",
      "keyDetails"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.quoteHighlight).toBeNull();
    expect(presentation.emphasisSpans).toEqual([
      { text: "效率提升约10倍", tone: "warning" }
    ]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });

  it("falls back when inline emphasis would become too fragmented", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "先定义目标，再补充上下文，最后在真实流程里复盘结果。",
      [
        { text: "定义目标", tone: "action" },
        { text: "补充上下文", tone: "action" },
        { text: "复盘结果", tone: "action" }
      ],
      "action",
      "reusablePoints"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "定义目标→补充上下文→在真实流程里复盘结果",
      tone: "action"
    });
  });

  it("renders a compact quote block only when the quoted substring is trustworthy and not too repetitive", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "作者反复强调，真正要避免的是“不要把局部优化当作系统优化”这种误区。",
      [{ text: "不要把局部优化当作系统优化", tone: "core" }],
      "core",
      "summary"
    );

    expect(presentation.mode).toBe("quote");
    expect(presentation.quoteHighlight).toEqual({
      text: "“不要把局部优化当作系统优化”",
      tone: "core"
    });
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });

  it("refuses to turn a near full-sentence duplicate into a quote block", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "关键不在工具数量，而在反馈回路是否闭环。",
      [{ text: "关键不在工具数量，而在反馈回路是否闭环。", tone: "core" }],
      "core",
      "coreConclusion"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.quoteHighlight).toBeNull();
    expect(presentation.emphasisSpans).toEqual([
      { text: "而在反馈回路是否闭环", tone: "core" }
    ]);
  });

  it("uses a single judgment anchor for coreConclusion items", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "Harness 工程的核心价值不在于堆砌提示词，而在于构建可复用系统。",
      [],
      "core",
      "coreConclusion"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "构建可复用系统", tone: "core" }
    ]);
  });

  it("uses a mechanism node for logicFramework items", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "混杂输入会遮蔽信息层级，导致输出退化为事实罗列。",
      [],
      "method",
      "logicFramework"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "导致输出退化为事实罗列", tone: "method" }
    ]);
  });

  it("prefers the evidence body over the publication shell for keyDetails items", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "OpenAI 在报告《Harness engineering》中明确指出其关注点是系统级稳定性。",
      [],
      "warning",
      "keyDetails"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "其关注点是系统级稳定性", tone: "warning" }
    ]);
  });

  it("prefers a concrete action rule for reusablePoints items", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "设计阶段需显式划分提示层与系统层职责，避免用提示工程掩盖架构缺陷。",
      [],
      "action",
      "reusablePoints"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "显式划分提示层与系统层职责", tone: "action" }
    ]);
  });

  it("keeps logicFramework anchors off sentence-opening scenario shells", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "面向终端用户部署AI模型时，尺寸分层与运行框架封装比单点优化更关键。",
      [],
      "method",
      "logicFramework"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "尺寸分层与运行框架封装", tone: "method" }
    ]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });

  it("falls back to a full evidence unit when keyDetails would otherwise highlight only an abstract tail", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "构建隐私优先型AI应用时，完全免费、数据保留本地、断网可用才是关键差异。",
      [],
      "warning",
      "keyDetails"
    );

    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "完全免费、数据保留本地、断网可用",
      tone: "warning"
    });
  });

  it("keeps reusablePoints on the action rule instead of the scenario prefix", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "面向终端用户部署AI模型时，应以内存容量为首要判据。",
      [],
      "action",
      "reusablePoints"
    );

    expect(presentation.emphasisSpans).toEqual([
      { text: "以内存容量为首要判据", tone: "action" }
    ]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });

  it("prefers the post-turn conclusion over the front-half background shell in contrast sentences", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "Coze平台上存在数百个类似智能体，却只有SBTI形成人传人传播。",
      [],
      "method",
      "logicFramework"
    );

    const highlighted = presentation.emphasisSpans[0]?.text || presentation.fallbackEmphasis?.text || "";

    expect(presentation.mode).toBe("emphasis");
    expect(highlighted).toBe("却只有SBTI形成人传人传播");
    expect(highlighted).not.toContain("Coze平台上存在数百个类似智能体");
  });

  it("prefers the after-turn action rule over a front-half negation shell", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "这不是宣传点，而是部署时必须优先确认本地运行模式。",
      [],
      "action",
      "reusablePoints"
    );

    const highlighted = presentation.emphasisSpans[0]?.text || presentation.fallbackEmphasis?.text || "";

    expect(presentation.mode).toBe("emphasis");
    expect(highlighted).toBe("必须优先确认本地运行模式");
    expect(highlighted).not.toContain("这不是宣传点");
  });

  it("uses a mechanism-core inline anchor for the Gemma multi-size architecture sentence", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "Gemma 4采用多尺寸架构（E2B/E4B/26B MoE/31B）与Ollama自动适配机制，使不同算力设备均可加载对应优化版本。",
      [],
      "method",
      "logicFramework"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([
      { text: "多尺寸架构", tone: "method" }
    ]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });

  it("uses a value-cluster fallback instead of a long inline slice for zero-outbound local-run logic", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "本地运行彻底消除网络传输环节，所有输入输出均驻留终端内存，实现零数据出域、零服务依赖、零排队延迟。",
      [],
      "method",
      "logicFramework"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "零数据出域、零服务依赖、零排队延迟",
      tone: "method"
    });
  });

  it("falls back to the full memory-tier decision rule instead of a consequence fragment", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "当设备内存为8GB时，优先选用E2B版本，避免强行运行E4B导致卡顿；当内存≥16GB时，可选用E4B获得流畅体验；当内存≥32GB且需最强能力时，才启用31B版本。",
      [],
      "action",
      "reusablePoints"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "8GB选E2B，≥16GB选E4B，≥32GB启用31B",
      tone: "action"
    });
  });

  it("falls back to the ordered deployment rule instead of highlighting only the final step", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "部署时必须按顺序执行：先安装Ollama，再执行ollama pull gemma4（自动匹配硬件最优版本），最后ollama run gemma4；跳过pull步骤将无法加载模型。",
      [],
      "action",
      "reusablePoints"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([]);
    expect(presentation.fallbackEmphasis).toEqual({
      text: "安装Ollama→pull gemma4→run gemma4",
      tone: "action"
    });
  });

  it("keeps condition-action rules on the action body instead of the condition prefix", () => {
    const presentation = normalizeSentenceEmphasisPresentation(
      "处理公司文档或个人隐私数据时，必须使用本地运行模式，禁用任何联网AI服务；断网环境优先验证本地模型是否已预加载完成，而非依赖实时下载。",
      [],
      "action",
      "reusablePoints"
    );

    expect(presentation.mode).toBe("emphasis");
    expect(presentation.emphasisSpans).toEqual([
      { text: "必须使用本地运行模式", tone: "action" }
    ]);
    expect(presentation.fallbackEmphasis).toBeNull();
  });
});
