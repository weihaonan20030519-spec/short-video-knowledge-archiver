import { describe, expect, it } from "vitest";

import {
  getPasteLinkHelperMessage,
  getPasteLinkResultPrimaryMessage
} from "./createRecordImportUi";
import type { ImportResult } from "../../services/import/importTypes";

function createLinkImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    source: "link_generic",
    platform: "other",
    outcome: "partial",
    originalUrl: "https://example.com/post",
    detectedTitle: "Example",
    detectedContent: "网页正文",
    contentCompleteness: "partial",
    availableTracks: [],
    selectedTrackId: null,
    warnings: [],
    canCreateRecord: true,
    shouldPromptManualInput: true,
    linkExtractionReport: {
      extractionSources: ["html_text"],
      hasHtmlText: true,
      hasImageOcrText: false,
      htmlTextLength: 80,
      imageSignalsFound: 2,
      candidateImagesSelected: 2,
      ocrAttemptLimit: 3,
      candidateSelectionReasons: [],
      imageOcrAttempted: 0,
      imageOcrSucceeded: 0,
      imageOcrFailed: 0,
      imageOcrTextLength: 0,
      coverageLevel: "partial",
      ocrStatus: "provider_unavailable"
    },
    ...overrides
  };
}

describe("createRecordImportUi", () => {
  it("distinguishes OCR_NOT_ATTEMPTED from OCR_PROVIDER_UNAVAILABLE in paste-link messaging", () => {
    const providerUnavailableResult = createLinkImportResult({
      warnings: [{ code: "OCR_PROVIDER_UNAVAILABLE", message: "provider unavailable" }]
    });
    const notAttemptedResult = createLinkImportResult({
      warnings: [{ code: "OCR_NOT_ATTEMPTED", message: "not attempted" }],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        ocrStatus: "not_attempted"
      }
    });

    expect(getPasteLinkResultPrimaryMessage(providerUnavailableResult, "zh-CN")).toBe(
      "已提取网页文本，但图片中的文字尚未识别（当前未配置 OCR 能力）。"
    );
    expect(getPasteLinkHelperMessage(providerUnavailableResult, "zh-CN")).toContain("检测到 2 张图片信号");
    expect(getPasteLinkHelperMessage(providerUnavailableResult, "zh-CN")).toContain("当前仅分析前 2 张正文候选图");
    expect(getPasteLinkHelperMessage(providerUnavailableResult, "zh-CN")).toContain("图片中的文字尚未识别");

    expect(getPasteLinkResultPrimaryMessage(notAttemptedResult, "zh-CN")).toBe(
      "已提取网页文本，但图片中的文字尚未识别（本次未尝试 OCR）。"
    );
    expect(getPasteLinkHelperMessage(notAttemptedResult, "zh-CN")).toContain("检测到 2 张图片信号");
    expect(getPasteLinkHelperMessage(notAttemptedResult, "zh-CN")).toContain("当前仅分析前 2 张正文候选图");
    expect(getPasteLinkHelperMessage(notAttemptedResult, "zh-CN")).toContain("图片文字本次未尝试识别");
  });

  it("explains when more image signals were found than the current candidate cap allows", () => {
    const cappedResult = createLinkImportResult({
      warnings: [{ code: "OCR_PROVIDER_UNAVAILABLE", message: "provider unavailable" }],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        imageSignalsFound: 9,
        candidateImagesSelected: 3,
        ocrAttemptLimit: 3,
        candidateSelectionReasons: ["partial_page_signals_only", "limited_by_cap"]
      }
    });

    const helper = getPasteLinkHelperMessage(cappedResult, "zh-CN");
    expect(helper).toContain("检测到 9 张图片信号");
    expect(helper).toContain("当前仅分析前 3 张正文候选图");
    expect(helper).toContain("图片中的文字尚未识别");
  });

  it("keeps the analysis-range gap visible when OCR succeeded on only part of the candidate images", () => {
    const partialOcrResult = createLinkImportResult({
      warnings: [],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        imageSignalsFound: 9,
        candidateImagesSelected: 3,
        imageOcrAttempted: 3,
        imageOcrSucceeded: 2,
        hasImageOcrText: true,
        ocrStatus: "partial"
      }
    });

    expect(getPasteLinkResultPrimaryMessage(partialOcrResult, "zh-CN")).toBe(
      "已提取网页文本，并补充识别了部分图片文字。"
    );

    const helper = getPasteLinkHelperMessage(partialOcrResult, "zh-CN");
    expect(helper).toContain("9 张图片信号");
    expect(helper).toContain("3 张正文候选图");
    expect(helper).toContain("部分图片文字已识别");
    expect(helper).not.toContain("本次未尝试识别");
  });

  it("keeps the analysis-range gap visible when OCR was attempted but no text was found", () => {
    const noTextResult = createLinkImportResult({
      warnings: [{ code: "OCR_NO_TEXT_DETECTED", message: "no text" }],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        imageSignalsFound: 9,
        candidateImagesSelected: 3,
        imageOcrAttempted: 3,
        ocrStatus: "attempted_no_text"
      }
    });

    const helper = getPasteLinkHelperMessage(noTextResult, "zh-CN");
    expect(helper).toContain("9 张图片信号");
    expect(helper).toContain("3 张正文候选图");
    expect(helper).toContain("图片文字本次已尝试识别");
    expect(helper).toContain("未成功识别");
    expect(helper).not.toContain("本次未尝试识别");
  });

  it("keeps partial results concise without sounding complete", () => {
    const partialResult = createLinkImportResult({
      warnings: [],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        imageSignalsFound: 0,
        candidateImagesSelected: 0,
        hasImageOcrText: false,
        coverageLevel: "partial",
        ocrStatus: "not_applicable"
      }
    });

    expect(getPasteLinkResultPrimaryMessage(partialResult, "zh-CN")).toBe(
      "已导入部分内容，建议先补充正文再整理。"
    );
    expect(getPasteLinkHelperMessage(partialResult, "zh-CN")).toBe(
      "当前只拿到部分可整理文本，建议在下方继续补充原始内容。"
    );
  });
});
