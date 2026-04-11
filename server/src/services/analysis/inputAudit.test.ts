import { describe, expect, it } from "vitest";

import { analyzeInputAuditFixtures } from "./inputAudit.fixtures.js";
import { buildAnalyzeInputAudit } from "./inputAudit.js";

describe("buildAnalyzeInputAudit", () => {
  it("extracts ocrSupplement from the explicit OCR heading", () => {
    const audit = buildAnalyzeInputAudit({
      rawText:
        "主体内容说明真正重点。 [图片文字补充] 图中文字补充说明了额外证据。"
    });

    expect(audit.primaryBody).toBe("主体内容说明真正重点。");
    expect(audit.ocrSupplement).toBe("图中文字补充说明了额外证据。");
    expect(audit.auditFlags).toContain("has_ocr_supplement");
  });

  it("routes source, time, report and propagation sentences into backgroundOrMeta", () => {
    const audit = buildAnalyzeInputAudit({
      rawText:
        "2026年2月5日，OpenAI 发布报告《Harness engineering》。该文真正想说明的是整理必须先判断，再总结。"
    });

    expect(audit.backgroundOrMeta).toEqual([
      "2026年2月5日，OpenAI 发布报告《Harness engineering》。"
    ]);
    expect(audit.primaryBody).toContain("该文真正想说明的是整理必须先判断，再总结。");
  });

  it("routes list-heavy example sentences into possibleExamplesOrLists", () => {
    const audit = buildAnalyzeInputAudit({
      rawText:
        "文章核心判断是：AI 整理不能只抽显眼句。常见问题包括标题堆砌、数字冒充结论、传播信息挤占主体。真正需要的是先判断，再总结。"
    });

    expect(audit.possibleExamplesOrLists).toEqual([
      "常见问题包括标题堆砌、数字冒充结论、传播信息挤占主体。"
    ]);
    expect(audit.primaryBody).toContain("文章核心判断是：AI 整理不能只抽显眼句。");
    expect(audit.primaryBody).toContain("真正需要的是先判断，再总结。");
    expect(audit.auditFlags).toContain("example_or_list_heavy");
  });

  it("keeps ordinary body text intact when no ocr/meta/list structure is present", () => {
    const rawText =
      "作者认为真正的问题不在模型是否更强，而在输入混杂了背景、例子和 OCR 补充，导致整理结果只会提取显眼事实。解决思路是先区分主体、证据和背景，再做学习版整理。";
    const audit = buildAnalyzeInputAudit({ rawText });

    expect(audit.primaryBody).toBe(rawText);
    expect(audit.ocrSupplement).toBeNull();
    expect(audit.backgroundOrMeta).toEqual([]);
    expect(audit.possibleExamplesOrLists).toEqual([]);
  });

  it("does not mutate the normalized rawText used by analyze", () => {
    const audit = buildAnalyzeInputAudit({
      rawText: "  来源：https://example.com   真正重点是先判断，再总结。  "
    });

    expect(audit.rawText).toBe("来源：https://example.com 真正重点是先判断，再总结。");
  });

  it("produces stable audit outputs for the long-form link import fixture baseline", () => {
    for (const fixture of analyzeInputAuditFixtures) {
      const audit = buildAnalyzeInputAudit({
        rawText: fixture.rawText
      });

      expect(audit.rawText).toBeTruthy();
      expect(audit.primaryBody).toBeTruthy();
      expect(fixture.failureModes.length).toBeGreaterThan(0);
      expect(fixture.expectedMainJudgment).toBeTruthy();

      if (fixture.expectedOcrIsSupplementOnly) {
        expect(audit.ocrSupplement).toBeTruthy();
        expect(audit.auditFlags).toContain("has_ocr_supplement");
      }

      if (fixture.failureModes.includes("background_meta_pollution") || fixture.failureModes.includes("url_platform_noise")) {
        expect(audit.backgroundOrMeta.length).toBeGreaterThan(0);
      }

      if (fixture.failureModes.includes("example_list_overweight")) {
        expect(audit.possibleExamplesOrLists.length).toBeGreaterThan(0);
      }
    }
  });
});
