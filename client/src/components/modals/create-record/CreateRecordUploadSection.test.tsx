import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateRecordUploadSection } from "./CreateRecordUploadSection";
import type { MessageDictionary } from "../../../lib/i18n";

const t = {
  common: {
    emptyValue: "-"
  },
  errors: {
    youCanContinueEditingManually: "你仍可继续手动编辑。"
  },
  modals: {
    uploadTitle: "上传视频或音频",
    uploadDescription: "选择文件后开始转写。",
    uploadHint: () => "建议上传较短文件。",
    uploadInputLabel: "选择视频或音频文件",
    archiveModePlaceholderTitle: "本地归档模式",
    archiveModePlaceholderDescription: "后续会支持直接保存原始媒体。",
    archiveModePlaceholderAction: "即将支持",
    uploadWorkflowLabelUpload: "上传",
    uploadWorkflowLabelTranscribe: "转写",
    uploadWorkflowLabelProcess: "处理",
    uploadTimeoutDescription: "处理超时。",
    uploadFailureDescription: "处理失败。",
    uploadSuccessDescription: "处理完成。",
    uploadProcessingDescription: "处理中。",
    uploadStateLabel: {
      idle: "空闲",
      uploading: "上传中",
      processing: "处理中",
      success: "完成",
      timeout: "超时",
      too_large: "文件过大",
      failed: "失败"
    },
    uploadLargeFileHint: "大文件需要更久。",
    uploadStatusCardTitle: "当前状态",
    fileName: "文件名",
    fileType: "文件类型",
    uploadFileSize: "文件大小",
    uploadCurrentStatus: "当前进度",
    uploadSteps: "处理步骤",
    uploadWorkflowDescriptionUploading: "上传中。",
    uploadWorkflowDescriptionProcessing: "处理中。",
    uploadWorkflowDescriptionSuccess: "已完成。",
    uploadWorkflowDescriptionTimeout: "超时。",
    uploadWorkflowDescriptionFailed: "失败。",
    uploadWorkflowVideoHelper: "视频处理中。",
    uploadModelLabelUsed: "使用模型",
    uploadModelLabelAttempts: "尝试模型",
    uploadModelFallbackNotice: "已自动回退模型。",
    transcriptMetadata: "转写元信息",
    language: "语言",
    segments: "分段",
    timestamps: "时间戳",
    uploadModelUsed: "使用模型",
    failureStagePrefix: "失败阶段"
  }
} as unknown as MessageDictionary;

describe("CreateRecordUploadSection", () => {
  it("shows the archive placeholder only in the empty state", () => {
    const { rerender } = render(
      <CreateRecordUploadSection
        t={t}
        appLanguage="zh-CN"
        fileInputRef={{ current: null }}
        onFileChange={() => undefined}
        uploadUiStatus="idle"
        selectedFileName={null}
        selectedFileSize={null}
        selectedFileSourceType={null}
        hasUploadCompleted={false}
        transcriptionResult={null}
        transcriptionError={null}
      />
    );

    expect(screen.getByTestId("create-record-upload-placeholder")).toBeInTheDocument();
    expect(screen.queryByTestId("upload-status-card")).not.toBeInTheDocument();

    rerender(
      <CreateRecordUploadSection
        t={t}
        appLanguage="zh-CN"
        fileInputRef={{ current: null }}
        onFileChange={() => undefined}
        uploadUiStatus="processing"
        selectedFileName="lesson.mp3"
        selectedFileSize={2048}
        selectedFileSourceType="audio"
        hasUploadCompleted={true}
        transcriptionResult={null}
        transcriptionError={null}
      />
    );

    expect(screen.queryByTestId("create-record-upload-placeholder")).not.toBeInTheDocument();
    expect(screen.getByTestId("upload-status-card")).toBeInTheDocument();
  });

  it("keeps a single status card in failure states without reviving the placeholder", () => {
    render(
      <CreateRecordUploadSection
        t={t}
        appLanguage="zh-CN"
        fileInputRef={{ current: null }}
        onFileChange={() => undefined}
        uploadUiStatus="failed"
        selectedFileName="lesson.mp3"
        selectedFileSize={2048}
        selectedFileSourceType="audio"
        hasUploadCompleted={true}
        transcriptionResult={null}
        transcriptionError={{
          code: "TRANSCRIPTION_FAILED",
          message: "failed",
          phase: "failed",
          failureStage: "transcription",
          transcriptionModelUsed: null,
          transcriptionModelAttempts: []
        }}
      />
    );

    expect(screen.getAllByTestId("upload-status-card")).toHaveLength(1);
    expect(screen.queryByTestId("create-record-upload-placeholder")).not.toBeInTheDocument();
  });

  it("keeps processing and success states inside a single upload result block", () => {
    const { rerender } = render(
      <CreateRecordUploadSection
        t={t}
        appLanguage="zh-CN"
        fileInputRef={{ current: null }}
        onFileChange={() => undefined}
        uploadUiStatus="processing"
        selectedFileName="demo.mp4"
        selectedFileSize={4 * 1024 * 1024}
        selectedFileSourceType="video"
        hasUploadCompleted={true}
        transcriptionResult={null}
        transcriptionError={null}
      />
    );

    const processingCard = screen.getByTestId("upload-status-card");
    expect(screen.queryByTestId("create-record-upload-placeholder")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("upload-status-card")).toHaveLength(1);
    expect(within(processingCard).getByTestId("upload-workflow-step-process")).toBeInTheDocument();

    rerender(
      <CreateRecordUploadSection
        t={t}
        appLanguage="zh-CN"
        fileInputRef={{ current: null }}
        onFileChange={() => undefined}
        uploadUiStatus="success"
        selectedFileName="demo.mp4"
        selectedFileSize={4 * 1024 * 1024}
        selectedFileSourceType="video"
        hasUploadCompleted={true}
        transcriptionResult={{
          phase: "transcript_ready",
          sourceType: "video",
          suggestedTitle: "Demo",
          transcriptText: "正文",
          transcriptionStatus: "transcript_needs_review",
          transcriptMeta: {
            fileName: "demo.mp4",
            mimeType: "video/mp4",
            size: 4 * 1024 * 1024,
            duration: undefined,
            language: "zh-CN",
            segments: [{ startMs: 0, endMs: 1000, text: "片段" }],
            timestamps: [{ startMs: 0, endMs: 1000, label: "00:00" }]
          },
          transcriptionModelUsed: "gemini-2.5-flash",
          transcriptionModelAttempts: ["gemini-2.5-flash"],
          warnings: []
        }}
        transcriptionError={null}
      />
    );

    const successCard = screen.getByTestId("upload-status-card");
    expect(screen.getAllByTestId("upload-status-card")).toHaveLength(1);
    expect(screen.queryByTestId("create-record-upload-placeholder")).not.toBeInTheDocument();
    expect(within(successCard).getByTestId("upload-metadata-group")).toBeInTheDocument();
    expect(screen.queryByText("转写元信息")).not.toBeNull();
  });
});
