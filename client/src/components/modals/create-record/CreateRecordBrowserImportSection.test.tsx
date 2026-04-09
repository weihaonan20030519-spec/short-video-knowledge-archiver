import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MessageDictionary } from "../../../lib/i18n";
import { CreateRecordBrowserImportSection } from "./CreateRecordBrowserImportSection";
import type { ImportResult, ImportSession } from "../../../services/import/importTypes";

function createImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
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

describe("CreateRecordBrowserImportSection", () => {
  const t = {
    modals: {
      browserImport: {
        trigger: "导入浏览器内容",
        waitingTitle: "浏览器导入",
        waitingDescription: "等待浏览器扩展回传页面内容。",
        syncing: "正在同步浏览器内容…",
        ready: "浏览器导入已完成。",
        incomplete: "浏览器导入已完成，但正文仍不足，建议补充字幕或笔记。",
        failed: "浏览器导入未完成，但仍可继续创建记录。"
      },
      bilibiliImport: {
        trackSelectLabel: "字幕轨"
      }
    }
  } as MessageDictionary;

  const baseSession: ImportSession = {
    flowState: "idle",
    result: null
  };

  it("keeps complete browser imports on a single primary result block", () => {
    render(
      <CreateRecordBrowserImportSection
        t={t}
        appLanguage="zh-CN"
        browserImportState={{ status: "ready" }}
        importSession={baseSession}
        importResult={createImportResult({
          outcome: "complete",
          contentCompleteness: "full",
          detectedContent: "浏览器带回了完整正文。"
        })}
        trackOptions={[]}
        selectedTrackId=""
        onTrackChange={() => undefined}
        onTrigger={() => undefined}
      />
    );

    const resultPanel = screen.getByTestId("browser-import-result-panel");
    expect(screen.getAllByTestId("browser-import-result-panel")).toHaveLength(1);
    expect(within(resultPanel).getByText("已获取足够内容，创建后可直接进入整理。")).toBeInTheDocument();
    expect(screen.queryByTestId("browser-import-helper-message")).not.toBeInTheDocument();
    expect(screen.queryByTestId("browser-import-warning-group")).not.toBeInTheDocument();
  });

  it("shows a conservative primary/helper summary for partial browser results", () => {
    render(
      <CreateRecordBrowserImportSection
        t={t}
        appLanguage="zh-CN"
        browserImportState={{ status: "incomplete" }}
        importSession={baseSession}
        importResult={createImportResult({
          warnings: [{ code: "TRANSCRIPT_TOO_SHORT", message: "当前只捕获到极短字幕。" }]
        })}
        trackOptions={[]}
        selectedTrackId=""
        onTrackChange={() => undefined}
        onTrigger={() => undefined}
      />
    );

    expect(screen.getByText("已导入部分内容，建议先补充正文再整理。")).toBeInTheDocument();
    expect(screen.getByText("当前只拿到部分可整理文本，建议在下方继续补充原始内容。")).toBeInTheDocument();
    expect(screen.getByText("导入提示")).toBeInTheDocument();
    expect(screen.getByText("当前只捕获到极短字幕。")).toBeInTheDocument();
    const resultPanel = screen.getByTestId("browser-import-result-panel");
    expect(within(resultPanel).getByTestId("browser-import-warning-group")).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("browser-import-helper-message")).toBeInTheDocument();
    expect(screen.getAllByTestId("browser-import-result-panel")).toHaveLength(1);
  });

  it("keeps non-warning OCR notes out of the browser warning container and does not show raw English text", () => {
    render(
      <CreateRecordBrowserImportSection
        t={t}
        appLanguage="zh-CN"
        browserImportState={{ status: "incomplete" }}
        importSession={baseSession}
        importResult={createImportResult({
          warnings: [{ code: "OCR_NOT_ATTEMPTED", message: "OCR was not attempted for this import." }]
        })}
        trackOptions={[]}
        selectedTrackId=""
        onTrackChange={() => undefined}
        onTrigger={() => undefined}
      />
    );

    expect(screen.queryByText("导入提示")).not.toBeInTheDocument();
    expect(screen.getByText("已导入部分内容，建议先补充正文再整理。")).toBeInTheDocument();
    expect(screen.queryByText("OCR was not attempted for this import.")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("browser-import-result-panel")).toHaveLength(1);
  });

  it("keeps failed browser imports inside the same result block without creating a second card", () => {
    render(
      <CreateRecordBrowserImportSection
        t={t}
        appLanguage="zh-CN"
        browserImportState={{ status: "failed" }}
        importSession={baseSession}
        importResult={createImportResult({
          outcome: "failed_but_creatable",
          detectedContent: "",
          contentCompleteness: "empty",
          warnings: [{ code: "NETWORK_ERROR", message: "浏览器连接已中断，请稍后重试。" }]
        })}
        trackOptions={[]}
        selectedTrackId=""
        onTrackChange={() => undefined}
        onTrigger={() => undefined}
      />
    );

    const resultPanel = screen.getByTestId("browser-import-result-panel");
    expect(screen.getAllByTestId("browser-import-result-panel")).toHaveLength(1);
    expect(within(resultPanel).getByText("自动导入流程未完成，但不会阻止你先创建记录。")).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("browser-import-helper-message")).toBeInTheDocument();
    expect(within(resultPanel).getByTestId("browser-import-warning-group")).toBeInTheDocument();
  });
});
