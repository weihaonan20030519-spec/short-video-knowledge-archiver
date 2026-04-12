export interface AnalyzeInputAuditFixture {
  sampleId: string;
  rawText: string;
  failureModes: string[];
  expectedMainJudgment: string;
  expectedHasMechanismLayer: boolean;
  expectedOcrIsSupplementOnly: boolean;
}

export const analyzeInputAuditFixtures: AnalyzeInputAuditFixture[] = [
  {
    sampleId: "xhs-harness-ocr-supplement",
    rawText:
      "文章真正要说明的是，Harness 工程的关键不在提示词堆砌，而在把任务拆成可复用系统。 [图片文字补充] OpenAI 内部实验显示，3-7名工程师通过 Harness 工程后效率约10倍。",
    failureModes: ["ocr_supplement_present", "numeric_fact_is_salient"],
    expectedMainJudgment: "Harness 工程的关键在于把任务拆成可复用系统",
    expectedHasMechanismLayer: true,
    expectedOcrIsSupplementOnly: true
  },
  {
    sampleId: "background-and-report-shells",
    rawText:
      "2026年2月5日，HashiCorp 联合创始人首次提出 Harness 工程。六天后，OpenAI 发布报告《Harness engineering》。文章真正想说明的是，Harness 工程关注的是整个系统如何稳定运行，而不是单次提示词优化。",
    failureModes: ["background_meta_pollution", "report_title_shell"],
    expectedMainJudgment: "Harness 工程关注整个系统如何稳定运行",
    expectedHasMechanismLayer: true,
    expectedOcrIsSupplementOnly: false
  },
  {
    sampleId: "example-list-heavy",
    rawText:
      "文章核心判断是：AI 整理不能只抽显眼句。常见问题包括标题堆砌、数字冒充结论、传播信息挤占主体、例子清单被误当框架。真正需要的是先判断，再总结。",
    failureModes: ["example_list_overweight", "salient_fact_overfit"],
    expectedMainJudgment: "AI 整理不能只抽显眼句",
    expectedHasMechanismLayer: true,
    expectedOcrIsSupplementOnly: false
  },
  {
    sampleId: "mechanism-mixed-with-facts",
    rawText:
      "作者认为真正的问题不在模型是否更强，而在输入混杂了背景、例子和 OCR 补充，导致整理结果只会提取显眼事实。解决思路是先区分主体、证据和背景，再做学习版整理。",
    failureModes: ["mechanism-hidden-under-surface-facts"],
    expectedMainJudgment: "问题在于输入混杂而非模型强弱",
    expectedHasMechanismLayer: true,
    expectedOcrIsSupplementOnly: false
  },
  {
    sampleId: "platform-and-url-metadata",
    rawText:
      "来源：https://www.xiaohongshu.com/explore/123 平台：小红书 这条笔记真正的重点不是传播数据，而是说明 AGENTS.md 应作为目录而不是百科全书。",
    failureModes: ["url_platform_noise", "meta_leads_input"],
    expectedMainJudgment: "AGENTS.md 应作为目录而不是百科全书",
    expectedHasMechanismLayer: false,
    expectedOcrIsSupplementOnly: false
  },
  {
    sampleId: "report-propagation-vs-real-value",
    rawText:
      "OpenAI 的报告《Leveraging Codex in an agent-first world》在社交平台广泛传播。真正有价值的部分是：Harness 工程的关键不在模型回答得更像人，而在把流程、约束和反馈做成系统。",
    failureModes: ["propagation_info_as_subject", "title_salience_bias"],
    expectedMainJudgment: "Harness 工程的关键在于把流程、约束和反馈做成系统",
    expectedHasMechanismLayer: true,
    expectedOcrIsSupplementOnly: false
  }
];
