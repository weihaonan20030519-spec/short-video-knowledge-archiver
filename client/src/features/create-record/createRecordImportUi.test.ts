import { describe, expect, it } from "vitest";

import {
  getBrowserImportHelperMessage,
  getBrowserImportPrimaryMessage,
  getVisibleImportWarnings,
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

function createBrowserImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    source: "browser_context",
    platform: "other",
    outcome: "partial",
    originalUrl: "https://example.com/video",
    detectedTitle: "Browser Import Example",
    detectedContent: "浏览器带回了一部分正文。",
    contentCompleteness: "partial",
    availableTracks: [],
    selectedTrackId: null,
    warnings: [],
    canCreateRecord: true,
    shouldPromptManualInput: true,
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
      "已提取网页文本；检测到页面还包含可能有信息的图片，但当前无法执行 OCR，因此未提取图片中的文字。"
    );
    expect(getPasteLinkHelperMessage(providerUnavailableResult, "zh-CN")).toBeNull();

    expect(getPasteLinkResultPrimaryMessage(notAttemptedResult, "zh-CN")).toBe(
      "已提取网页文本；检测到页面还包含可能有信息的图片，但本次未尝试 OCR，因此未提取图片中的文字。"
    );
    expect(getPasteLinkHelperMessage(notAttemptedResult, "zh-CN")).toBeNull();
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
    expect(helper).toBe(
      "检测到页面包含 9 张图片信号，当前仅纳入 3 张正文候选图，仍有 6 张未纳入本轮处理范围。"
    );
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
    expect(helper).toBe("检测到页面包含 9 张图片信号，当前仅纳入 3 张正文候选图，仍有 6 张未纳入本轮处理范围。");
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
    expect(helper).toBe(
      "检测到页面包含 9 张图片信号，当前仅纳入 3 张正文候选图，仍有 6 张未纳入本轮处理范围。本轮 OCR 未从已纳入的图片中提取到可用于整理的文字。"
    );
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

  it("keeps browser import complete messaging reserved for full reusable content", () => {
    const completeResult = createBrowserImportResult({
      outcome: "complete",
      contentCompleteness: "full",
      detectedContent: "这是完整正文。"
    });
    const partialResult = createBrowserImportResult();
    const needsInputResult = createBrowserImportResult({
      outcome: "needs_user_input",
      contentCompleteness: "partial",
      detectedContent: "只拿到可整理的一部分。"
    });

    expect(getBrowserImportPrimaryMessage(completeResult, "zh-CN")).toBe(
      "已获取足够内容，创建后可直接进入整理。"
    );
    expect(getBrowserImportPrimaryMessage(partialResult, "zh-CN")).toBe(
      "已导入部分内容，建议先补充正文再整理。"
    );
    expect(getBrowserImportPrimaryMessage(needsInputResult, "zh-CN")).toBe(
      "已导入部分内容，建议先补充正文再整理。"
    );
  });

  it("keeps browser import helper messaging conservative for partial and failed results", () => {
    const partialResult = createBrowserImportResult();
    const failedResult = createBrowserImportResult({
      outcome: "failed_but_creatable",
      detectedContent: null,
      contentCompleteness: "empty"
    });
    const noContentResult = createBrowserImportResult({
      outcome: "needs_user_input",
      detectedContent: null,
      contentCompleteness: "empty"
    });

    expect(getBrowserImportHelperMessage(partialResult, "zh-CN")).toBe(
      "当前只拿到部分可整理文本，建议在下方继续补充原始内容。"
    );
    expect(getBrowserImportHelperMessage(failedResult, "zh-CN")).toBe(
      "未能自动提取可用正文，但仍可在下方手动补充后继续创建记录。"
    );
    expect(getBrowserImportHelperMessage(noContentResult, "zh-CN")).toBe(
      "当前只拿到标题或摘要，建议在下方补充正文。"
    );
  });

  it("filters blank browser import warnings before the warning container renders", () => {
    const result = createBrowserImportResult({
      warnings: [
        { code: "NETWORK_ERROR", message: " " },
        { code: "TRANSCRIPT_TOO_SHORT", message: "当前只捕获到极短字幕。" }
      ]
    });

    expect(getVisibleImportWarnings(result, "zh-CN")).toEqual([
      { code: "NETWORK_ERROR", message: "远程导入流程发生网络问题，但不会阻止你先创建记录。" },
      { code: "TRANSCRIPT_TOO_SHORT", message: "当前只捕获到极短字幕。" }
    ]);
    expect(
      getVisibleImportWarnings(createBrowserImportResult({ warnings: [{ code: "NETWORK_ERROR", message: "  " }] }), "zh-CN")
    ).toEqual([
      { code: "NETWORK_ERROR", message: "远程导入流程发生网络问题，但不会阻止你先创建记录。" }
    ]);
  });

  it("deduplicates warnings by code and folds away generic manual-completion prompts when a more specific warning exists", () => {
    const result = createLinkImportResult({
      warnings: [
        { code: "OCR_SERVICE_UNAVAILABLE", message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。" },
        { code: "OCR_SERVICE_UNAVAILABLE", message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。" },
        { code: "MANUAL_COMPLETION_REQUIRED", message: "可稍后重试或手动补充正文。" }
      ]
    });

    expect(getVisibleImportWarnings(result, "zh-CN")).toEqual([
      {
        code: "OCR_SERVICE_UNAVAILABLE",
        message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
      }
    ]);
  });

  it("deduplicates warnings that normalize to the same final message even when their codes differ", () => {
    const result = createLinkImportResult({
      warnings: [
        { code: "OCR_SERVICE_UNAVAILABLE", message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。" },
        { code: "OCR_UNKNOWN_ERROR", message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。" }
      ]
    });

    expect(getVisibleImportWarnings(result, "zh-CN")).toEqual([
      {
        code: "OCR_SERVICE_UNAVAILABLE",
        message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
      }
    ]);
  });

  it("keeps OCR not-attempted notes out of warnings and localizes raw English warnings in Chinese UI", () => {
    const result = createLinkImportResult({
      warnings: [
        { code: "OCR_NOT_ATTEMPTED", message: "OCR was not attempted for this import." },
        { code: "NETWORK_ERROR", message: "remote import failed" }
      ],
      linkExtractionReport: {
        ...createLinkImportResult().linkExtractionReport!,
        ocrStatus: "not_attempted"
      }
    });

    expect(getVisibleImportWarnings(result, "zh-CN")).toEqual([
      {
        code: "NETWORK_ERROR",
        message: "远程导入流程发生网络问题，但不会阻止你先创建记录。"
      }
    ]);
  });
});
