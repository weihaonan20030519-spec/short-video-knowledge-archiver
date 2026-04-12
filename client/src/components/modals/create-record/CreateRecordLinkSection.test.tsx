import { render, screen, within } from "@testing-library/react";
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
  const t = {
    modals: {
      linkImport: {
        title: "链接辅助导入",
        description: "通过链接提取内容。",
        idleHint: "输入链接后，可在这里查看提取结果、缺口和提示。",
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

  it("shows a lightweight placeholder before any link import attempt", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        hasAttemptedImport={false}
        importResult={null}
      />
    );

    expect(screen.getByTestId("link-import-empty-panel")).toBeInTheDocument();
    expect(screen.getByText("输入链接后，可在这里查看提取结果、缺口和提示。")).toBeInTheDocument();
    expect(screen.queryByTestId("link-import-result-panel")).not.toBeInTheDocument();
  });

  it("keeps a single primary result block for full link imports", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        primaryMessage="已提取到可整理正文。"
        helperMessage={null}
        importResult={createImportResult([])}
      />
    );

    const resultPanel = screen.getByTestId("link-import-result-panel");
    expect(screen.getAllByTestId("link-import-result-panel")).toHaveLength(1);
    expect(screen.queryByTestId("link-import-empty-panel")).not.toBeInTheDocument();
    expect(within(resultPanel).getByText("已提取到可整理正文。")).toBeInTheDocument();
    expect(screen.queryByTestId("link-import-helper-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-import-warning-group")).not.toBeInTheDocument();
  });

  it("keeps helper and warnings subordinate inside the same result block for gap-like imports", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        primaryMessage="已提取网页文本，但仍有图片内容未覆盖。"
        helperMessage="检测到页面包含更多图片信号，建议继续补正文。"
        importResult={createImportResult([
          {
            code: "OCR_SERVICE_UNAVAILABLE",
            message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
          }
        ])}
      />
    );

    const resultPanel = screen.getByTestId("link-import-result-panel");
    expect(screen.getAllByTestId("link-import-result-panel")).toHaveLength(1);
    expect(screen.queryByTestId("link-import-empty-panel")).not.toBeInTheDocument();
    expect(within(resultPanel).getByText("已提取网页文本，但仍有图片内容未覆盖。")).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("link-import-helper-message")).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("link-import-warning-group")).toBeInTheDocument();
  });

  it("keeps failed-but-editable link states inside the same result block", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        statusTone="border-rose-200 bg-rose-50 text-rose-700"
        primaryMessage="这次未能稳定提取可整理正文。"
        helperMessage="你仍可直接创建记录，并在下方手动补充原始内容。"
        importResult={createImportResult([
          {
            code: "OCR_UNKNOWN_ERROR",
            message: "图片文字识别失败：本次 OCR 处理出现异常，可稍后重试。"
          }
        ])}
      />
    );

    expect(screen.getAllByTestId("link-import-result-panel")).toHaveLength(1);
    expect(screen.queryByTestId("link-import-empty-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("link-import-helper-message")).toBeInTheDocument();
    expect(screen.getByTestId("link-import-warning-group")).toBeInTheDocument();
  });

  it("hides the warning container when messages are blank and still shows real warnings", () => {
    const { container, rerender } = render(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([{ code: "OCR_SERVICE_UNAVAILABLE", message: "   " }])}
      />
    );

    expect(screen.getByText("导入提示")).toBeInTheDocument();

    rerender(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([])}
      />
    );

    expect(screen.queryByText("导入提示")).toBeNull();

    rerender(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([
          {
            code: "OCR_SERVICE_UNAVAILABLE",
            message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
          }
        ])}
      />
    );

    expect(screen.getByText("导入提示")).toBeInTheDocument();
    expect(screen.getByText("图片文字识别已中断：当前模型服务繁忙，请稍后重试。")).toBeInTheDocument();
    const resultPanel = screen.getByTestId("link-import-result-panel");
    expect(resultPanel).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("link-import-warning-group")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="link-import-result-panel"]')).toHaveLength(1);
  });

  it("renders normalized duplicate warnings only once", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        importResult={createImportResult([
          {
            code: "OCR_SERVICE_UNAVAILABLE",
            message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
          },
          {
            code: "OCR_UNKNOWN_ERROR",
            message: "图片文字识别已中断：当前模型服务繁忙，请稍后重试。"
          },
          {
            code: "MANUAL_COMPLETION_REQUIRED",
            message: "可稍后重试或手动补充正文。"
          }
        ])}
      />
    );

    expect(screen.getAllByText("图片文字识别已中断：当前模型服务繁忙，请稍后重试。")).toHaveLength(1);
    expect(screen.queryByText("可稍后重试或手动补充正文。")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("link-import-result-panel")).toHaveLength(1);
  });

  it("does not elevate OCR-not-attempted notes into a warning block", () => {
    render(
      <CreateRecordLinkSection
        {...baseProps}
        primaryMessage="已提取网页文本；检测到页面还包含可能有信息的图片，但本次未尝试 OCR，因此未提取图片中的文字。"
        helperMessage={null}
        importResult={createImportResult([{ code: "OCR_NOT_ATTEMPTED", message: "OCR was not attempted for this import." }])}
      />
    );

    expect(screen.getAllByTestId("link-import-result-panel")).toHaveLength(1);
    expect(screen.queryByTestId("link-import-warning-group")).not.toBeInTheDocument();
    expect(screen.queryByText("OCR was not attempted for this import.")).not.toBeInTheDocument();
  });
});
