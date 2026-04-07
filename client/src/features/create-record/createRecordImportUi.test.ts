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
    expect(getPasteLinkHelperMessage(providerUnavailableResult, "zh-CN")).toBe(
      "检测到 2 张可能承载正文的图片，但当前服务端未配置 OCR 能力。"
    );

    expect(getPasteLinkResultPrimaryMessage(notAttemptedResult, "zh-CN")).toBe(
      "已提取网页文本，但图片中的文字尚未识别（本次未尝试 OCR）。"
    );
    expect(getPasteLinkHelperMessage(notAttemptedResult, "zh-CN")).toBe(
      "检测到 2 张可能承载正文的图片，但本次未尝试 OCR。"
    );
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

    expect(getPasteLinkHelperMessage(cappedResult, "zh-CN")).toBe(
      "检测到 9 张图片信号，当前仅选取前 3 张作为正文候选图，但当前服务端未配置 OCR 能力。"
    );
  });
});
