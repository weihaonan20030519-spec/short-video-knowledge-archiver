import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MessageDictionary } from "../../../lib/i18n";
import { CreateRecordLinkSection } from "./CreateRecordLinkSection";
import type { ImportResult } from "../../../services/import/importTypes";

function createImportResult(warnings: ImportResult["warnings"]): ImportResult {
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
    warnings,
    canCreateRecord: true,
    shouldPromptManualInput: true,
    linkExtractionReport: {
      extractionSources: ["html_text"],
      hasHtmlText: true,
      hasImageOcrText: false,
      htmlTextLength: 80,
      imageSignalsFound: 0,
      candidateImagesSelected: 0,
      ocrAttemptLimit: 3,
      candidateSelectionReasons: [],
      imageOcrAttempted: 0,
      imageOcrSucceeded: 0,
      imageOcrFailed: 0,
      imageOcrTextLength: 0,
      coverageLevel: "partial",
      ocrStatus: "not_applicable"
    }
  };
}

describe("CreateRecordLinkSection", () => {
  it("hides the warning container when messages are blank and still shows real warnings", () => {
    const t = {
      modals: {
        linkImport: {
          title: "链接辅助导入",
          description: "通过链接提取内容。",
          trigger: "尝试提取链接内容"
        },
        bilibiliImport: {
          trackSelectLabel: "字幕轨"
        }
      }
    } as MessageDictionary;

    const baseProps = {
      t,
      appLanguage: "zh-CN" as const,
      canTriggerImport: true,
      hasAttemptedImport: true,
      isTriggerDisabled: false,
      linkImportUiState: "ready_partial" as const,
      primaryMessage: null,
      helperMessage: null,
      statusTone: "border-slate-200 bg-slate-50 text-slate-700",
      trackOptions: [],
      selectedTrackId: "",
      onTrackChange: () => undefined,
      onTriggerImport: () => undefined
    };

    const { container, rerender } = render(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([{ code: "OCR_PROVIDER_UNAVAILABLE", message: "   " }])}
      />
    );

    expect(screen.queryByText("导入提示")).not.toBeInTheDocument();
    expect(
      container.querySelector('[class*="bg-white"][class*="px-3"][class*="py-3"][class*="text-xs"][class*="text-slate-600"]')
    ).not.toBeInTheDocument();

    rerender(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([])}
      />
    );

    expect(screen.queryByText("导入提示")).not.toBeInTheDocument();
    expect(
      container.querySelector('[class*="bg-white"][class*="px-3"][class*="py-3"][class*="text-xs"][class*="text-slate-600"]')
    ).not.toBeInTheDocument();

    rerender(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([
          {
            code: "OCR_PROVIDER_UNAVAILABLE",
            message: "图片文字识别失败：当前模型服务繁忙，请稍后重试。"
          }
        ])}
      />
    );

    expect(screen.getByText("导入提示")).toBeInTheDocument();
    expect(screen.getByText("图片文字识别失败：当前模型服务繁忙，请稍后重试。")).toBeInTheDocument();
    expect(
      container.querySelector('[class*="bg-white"][class*="px-3"][class*="py-3"][class*="text-xs"][class*="text-slate-600"]')
    ).toBeInTheDocument();
  });
});
