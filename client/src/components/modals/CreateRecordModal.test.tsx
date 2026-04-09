import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateRecordModal } from "./CreateRecordModal";
import { useSettingsStore } from "../../stores/settingsStore";
import { createFolder } from "../../test/factories";
import { TRANSCRIPTION_MAX_FILE_SIZE_BYTES } from "../../services/transcription/transcriptionTypes";
import { transcribeFile } from "../../services/transcription/transcriptionClient";

vi.mock("../../services/transcription/transcriptionClient", () => ({
  transcribeFile: vi.fn()
}));

afterEach(() => {
  useSettingsStore.getState().setAppLanguage("zh-CN");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("CreateRecordModal upload flow", () => {
  it("keeps the create-record shell aligned with the shared modal rhythm while static hints stay low-emphasis", () => {
    const { container } = render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-shell", name: "研究素材" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const overlay = container.firstElementChild as HTMLDivElement;
    const shell = screen.getByTestId("create-record-modal-shell");
    const modeHint = screen.getByTestId("create-record-mode-hint");
    const uploadPlaceholder = screen.getByTestId("create-record-upload-placeholder");

    expect(overlay).not.toHaveClass("backdrop-blur-sm");
    expect(shell).toHaveClass("shadow-[0_14px_30px_rgba(15,23,42,0.08)]");
    expect(modeHint).toHaveClass("bg-slate-100/70", "text-xs", "text-slate-500");
    expect(modeHint).not.toHaveClass("border");
    expect(uploadPlaceholder).toHaveClass("bg-slate-100/80");
    expect(uploadPlaceholder).not.toHaveClass("border");
  });

  it("fills the existing content field from transcription and submits through the same original content path", async () => {
    const folder = createFolder({ id: "folder-1", name: "研究素材" });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const mockedTranscribeFile = vi.mocked(transcribeFile);

    mockedTranscribeFile.mockResolvedValue({
      success: true,
      data: {
        phase: "transcript_ready",
        sourceType: "audio",
        suggestedTitle: "方法课音频",
        transcriptText: "这是转写后的正文，会直接进入唯一的原始内容编辑区。",
        transcriptionStatus: "transcript_needs_review",
        fileMeta: {
          fileName: "lesson.mp3",
          mimeType: "audio/mpeg",
          size: 2048
        },
        language: "zh-CN",
        segments: [],
        timestamps: [],
        warnings: [],
        transcriptionModelUsed: "gemini-2.5-flash",
        transcriptionModelAttempts: ["gemini-2.5-flash"]
      },
      error: null
    });

    const { container } = render(
      <CreateRecordModal
        open
        folders={[folder]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const user = userEvent.setup();
    const file = new File(["audio"], "lesson.mp3", { type: "audio/mpeg" });

    expect(screen.getByRole("button", { name: "上传文件" })).toBeInTheDocument();
    expect(screen.getByText("上传视频或音频")).toBeInTheDocument();
    expect(screen.getByText("本地归档目录")).toBeInTheDocument();
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

    await user.upload(screen.getByLabelText("选择视频或音频文件"), file);

    const uploadStatusCard = await screen.findByTestId("upload-status-card");
    expect(uploadStatusCard).toBeInTheDocument();
    expect(within(uploadStatusCard).getByText("文件名")).toBeInTheDocument();
    expect(within(uploadStatusCard).getAllByText("lesson.mp3").length).toBeGreaterThan(0);
    expect(within(uploadStatusCard).getByText("文件类型")).toBeInTheDocument();
    expect(within(uploadStatusCard).getAllByText("音频").length).toBeGreaterThan(0);
    expect(within(uploadStatusCard).getByText("文件大小")).toBeInTheDocument();
    expect(await screen.findByText("转写完成")).toBeInTheDocument();
    expect(screen.getByText("转写完成，已自动填入原始内容区。")).toBeInTheDocument();
    expect(
      within(uploadStatusCard).getAllByText((_, element) =>
        element?.tagName === "P" && element.textContent === "转写模型: Gemini 2.5 Flash"
      ).length
    ).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("方法课音频")).toBeInTheDocument();

    const contentField = screen.getByRole("textbox", { name: "原始转写文本" }) as HTMLTextAreaElement;
    expect(contentField.value).toBe("这是转写后的正文，会直接进入唯一的原始内容编辑区。");
    expect(contentField).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "创建记录" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          inputMethod: "upload",
          title: "方法课音频",
          originalContent: "这是转写后的正文，会直接进入唯一的原始内容编辑区。"
        })
      );
    });
  });

  it("localizes the upload flow in English and blocks oversized files before transcription", async () => {
    useSettingsStore.getState().setAppLanguage("en");
    const mockedTranscribeFile = vi.mocked(transcribeFile);
    mockedTranscribeFile.mockReset();

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-2", name: "Inbox" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    const file = new File(["video"], "oversized.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: TRANSCRIPTION_MAX_FILE_SIZE_BYTES + 1 });

    expect(screen.getByRole("button", { name: "Upload File" })).toBeInTheDocument();
    expect(screen.getByText("Upload Video or Audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Blank" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browser import (Beta)" })).toBeInTheDocument();

    await user.upload(screen.getByLabelText("Select a video or audio file"), file);

    expect((await screen.findAllByText(/File Too Large/)).length).toBeGreaterThan(0);
    expect(screen.getByText("You Can Continue Editing Manually")).toBeInTheDocument();
    expect(screen.getByText("Transcription failed. Please retry or add the content manually.")).toBeInTheDocument();
    expect(mockedTranscribeFile).not.toHaveBeenCalled();
  });

  it("shows a processing status card with spinner and video steps while transcription is running", async () => {
    useSettingsStore.getState().setAppLanguage("en");
    const mockedTranscribeFile = vi.mocked(transcribeFile);
    const pending = deferred<Awaited<ReturnType<typeof transcribeFile>>>();
    let uploadCallbacks:
      | {
          onUploadStarted?: () => void;
          onUploadComplete?: () => void;
        }
      | undefined;
    mockedTranscribeFile.mockImplementation(async (_file, _languageHint, callbacks) => {
      uploadCallbacks = callbacks;
      return pending.promise;
    });

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-3", name: "Inbox" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    const file = new File(["video"], "demo.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: 3 * 1024 * 1024 });

    await user.upload(screen.getByLabelText("Select a video or audio file"), file);

    expect(await screen.findByTestId("upload-status-card")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("Uploading").length).toBeGreaterThan(0);
    });
    uploadCallbacks?.onUploadComplete?.();
    expect(screen.getByTestId("upload-status-spinner")).toBeInTheDocument();
    expect(screen.getByText("demo.mp4")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("Current Status")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Processing")).toBeInTheDocument();
    });
    expect(screen.getByTestId("upload-workflow-step-upload")).toHaveAttribute("data-step-state", "done");
    expect(screen.getByTestId("upload-workflow-step-process")).toHaveAttribute("data-step-state", "current");
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Processing includes audio extraction and transcription.")).toBeInTheDocument();
    expect(screen.getByText("Processing has started. Keep this window open while the transcript is prepared.")).toBeInTheDocument();

    pending.resolve({
      success: true,
      data: {
        phase: "transcript_ready",
        sourceType: "video",
        suggestedTitle: "Demo Video",
        transcriptText: "Transcript body",
        transcriptionStatus: "transcript_needs_review",
        fileMeta: {
          fileName: "demo.mp4",
          mimeType: "video/mp4",
          size: 3 * 1024 * 1024
        },
        language: "en",
        segments: [],
        timestamps: [],
        warnings: [],
        transcriptionModelUsed: "gemini-2.5-flash-lite",
        transcriptionModelAttempts: ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
      },
      error: null
    });

    expect(await screen.findByText("Transcription Complete")).toBeInTheDocument();
    const uploadStatusCard = screen.getByTestId("upload-status-card");
    expect(screen.getByTestId("upload-workflow-step-upload")).toHaveAttribute("data-step-state", "done");
    expect(screen.getByTestId("upload-workflow-step-process")).toHaveAttribute("data-step-state", "done");
    expect(
      within(uploadStatusCard).getByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent === "Transcription Model Attempts: Gemini 2.5 Flash → Gemini 2.5 Flash Lite"
      )
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Demo Video")).toBeInTheDocument();
  });

  it("shows a localized timeout state when Gemini file activation times out", async () => {
    useSettingsStore.getState().setAppLanguage("en");
    const mockedTranscribeFile = vi.mocked(transcribeFile);
    mockedTranscribeFile.mockResolvedValue({
      success: false,
      data: null,
      error: {
        code: "TRANSCRIPTION_TIMEOUT",
        message: "Timed out waiting for Gemini file processing"
      },
      meta: {
        phase: "failed",
        failureStage: "transcription",
        transcriptionModelUsed: "gemini-2.5-flash-lite",
        transcriptionModelAttempts: ["gemini-2.5-flash", "gemini-2.5-flash-lite"]
      }
    });

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-4", name: "Inbox" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    const file = new File(["audio"], "session.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", { value: 4 * 1024 * 1024 });

    await user.upload(screen.getByLabelText("Select a video or audio file"), file);

    expect(await screen.findByText("Processing Timed Out")).toBeInTheDocument();
    const uploadStatusCard = screen.getByTestId("upload-status-card");
    expect(screen.getByTestId("upload-workflow-step-upload")).toHaveAttribute("data-step-state", "failed");
    expect(screen.getByTestId("upload-workflow-step-transcribe")).toHaveAttribute("data-step-state", "pending");
    expect(
      within(uploadStatusCard).getByText((_, element) =>
        element?.tagName === "P" &&
        element.textContent === "Transcription Model Attempts: Gemini 2.5 Flash → Gemini 2.5 Flash Lite"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Failure Stage: Transcription")).toBeInTheDocument();
    expect(screen.getAllByText("Processing timed out. Please retry.").length).toBeGreaterThan(0);
    expect(screen.getByText("You Can Continue Editing Manually")).toBeInTheDocument();
  });

  it("keeps shared fields while clearing upload runtime after switching modes", async () => {
    const mockedTranscribeFile = vi.mocked(transcribeFile);
    mockedTranscribeFile.mockResolvedValue({
      success: true,
      data: {
        phase: "transcript_ready",
        sourceType: "audio",
        suggestedTitle: "音频标题",
        transcriptText: "上传后的文本",
        transcriptionStatus: "transcript_needs_review",
        fileMeta: {
          fileName: "clip.mp3",
          mimeType: "audio/mpeg",
          size: 1024
        },
        language: "zh-CN",
        segments: [],
        timestamps: [],
        warnings: [],
        transcriptionModelUsed: "gemini-2.5-flash",
        transcriptionModelAttempts: ["gemini-2.5-flash"]
      },
      error: null
    });

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-keep", name: "收集箱" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    const file = new File(["audio"], "clip.mp3", { type: "audio/mpeg" });

    await user.upload(screen.getByLabelText("选择视频或音频文件"), file);
    expect(await screen.findByText("转写完成")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "空白新建" }));

    expect(screen.queryByTestId("upload-status-card")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("音频标题")).toBeInTheDocument();
    expect(screen.getByDisplayValue("上传后的文本")).toBeInTheDocument();
  });

  it("only triggers paste-link extraction after the explicit CTA and autofills the form", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          originalUrl: "https://www.xiaohongshu.com/explore/abc123",
          resolvedUrl: "https://www.xiaohongshu.com/explore/abc123",
          platform: "xiaohongshu",
          title: "小红书图文笔记",
          excerpt: "这是从链接里提取到的一段摘要。",
          contentText:
            "这是从链接里提取到的一段较完整正文，用来帮助后续 AI 整理，同时仍然允许用户继续补充自己的字幕、笔记或观察。\n这里继续补充更多细节、上下文、步骤说明和复盘提示，让内容长度稳定超过完整导入阈值，并且保留  多个空格。",
          fetchSucceeded: true,
          extractionMethod: "readability",
          extractionReport: {
            extractionSources: ["html_text"],
            hasHtmlText: true,
            hasImageOcrText: false,
            htmlTextLength: 140,
            imageSignalsFound: 5,
            candidateImagesSelected: 2,
            ocrAttemptLimit: 3,
            candidateSelectionReasons: ["filtered_non_body_images"],
            imageOcrAttempted: 0,
            imageOcrSucceeded: 0,
            imageOcrTextLength: 0,
            ocrStatus: "provider_unavailable",
            coverageLevel: "partial"
          },
          warnings: [
            {
              code: "OCR_PROVIDER_UNAVAILABLE",
              message: "ocr unavailable"
            }
          ]
        },
        error: null
      })
    }));

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-link", name: "收集箱" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "粘贴链接" }));
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.xiaohongshu.com/explore/abc123");

    expect(screen.queryByText("正在尝试获取可导入内容…")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "尝试提取链接内容" }));

    expect(
      await screen.findByText(
        "已提取网页文本；检测到页面还包含可能有信息的图片，但当前无法执行 OCR，因此未提取图片中的文字。"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("检测到页面包含 5 张图片信号，当前仅纳入 2 张正文候选图，仍有 3 张未纳入本轮处理范围。")
    ).toBeInTheDocument();
    expect(screen.queryByText("ocr unavailable")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("小红书图文笔记")).toBeInTheDocument();
    const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;
    expect(screen.getByRole("button", { name: "继续补正文" })).toBeInTheDocument();
    expect(contentField.value).toContain("这是从链接里提取到的一段较完整正文");
    expect(contentField.value).toContain("仍然允许用户继续补充自己的字幕、笔记或观察");
    expect(contentField.value).toContain("\n这里继续补充更多细节、上下文、步骤说明和复盘提示，让内容长度稳定超过完整导入阈值，并且保留  多个空格。");
    expect(contentField).toHaveClass("whitespace-pre-wrap", "break-words");

    await user.click(screen.getByRole("button", { name: "继续补正文" }));

    expect(contentField).toHaveFocus();
  });

  it("keeps paste-link and browser-import messaging separated", async () => {
    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-link-mode", name: "收集箱" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "粘贴链接" }));

    expect(screen.getByText("链接辅助导入")).toBeInTheDocument();
    expect(screen.queryByText("浏览器导入已启动")).not.toBeInTheDocument();
    expect(screen.queryByText("通过浏览器扩展辅助导入当前页面上下文，再检查并补全文本内容。")).not.toBeInTheDocument();
  });

  it("preserves user-edited fields on repeated paste-link imports unless the field still matches its last autofill snapshot", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            originalUrl: "https://example.com/post-1",
            resolvedUrl: "https://example.com/post-1",
            platform: "other",
            title: "第一次导入标题",
            excerpt: null,
            contentText: "第一次导入正文，长度足够长，适合后续整理。",
            fetchSucceeded: true,
            extractionMethod: "readability",
            extractionReport: {
              extractionSources: ["html_text"],
              hasHtmlText: true,
              hasImageOcrText: false,
              htmlTextLength: 120,
              imageSignalsFound: 0,
              candidateImagesSelected: 0,
              ocrAttemptLimit: 3,
              candidateSelectionReasons: [],
              imageOcrAttempted: 0,
              imageOcrSucceeded: 0,
              imageOcrTextLength: 0,
              ocrStatus: "not_applicable",
              coverageLevel: "full"
            },
            warnings: []
          },
          error: null
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            originalUrl: "https://example.com/post-2",
            resolvedUrl: "https://example.com/post-2",
            platform: "other",
            title: "第二次导入标题",
            excerpt: "第二次摘要",
            contentText: "第二次导入正文，仍然足够长，但不应覆盖用户已经手改过的正文。",
            fetchSucceeded: true,
            extractionMethod: "readability",
            extractionReport: {
              extractionSources: ["html_text"],
              hasHtmlText: true,
              hasImageOcrText: false,
              htmlTextLength: 110,
              imageSignalsFound: 0,
              candidateImagesSelected: 0,
              ocrAttemptLimit: 3,
              candidateSelectionReasons: [],
              imageOcrAttempted: 0,
              imageOcrSucceeded: 0,
              imageOcrTextLength: 0,
              ocrStatus: "not_applicable",
              coverageLevel: "full"
            },
            warnings: []
          },
          error: null
        })
      });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <CreateRecordModal
        open
        folders={[createFolder({ id: "folder-link-retry", name: "收集箱" })]}
        tags={[]}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "粘贴链接" }));

    const urlField = screen.getByPlaceholderText("https://...");
    const titleField = screen.getByRole("textbox", { name: "标题（可选）" }) as HTMLInputElement;
    const contentField = screen.getByRole("textbox", { name: "原始内容 / 字幕 / 备注" }) as HTMLTextAreaElement;

    await user.type(urlField, "https://example.com/post-1");
    await user.click(screen.getByRole("button", { name: "尝试提取链接内容" }));

    await screen.findByDisplayValue("第一次导入标题");
    expect(contentField.value).toContain("第一次导入正文");
    expect(screen.queryByRole("button", { name: "继续补正文" })).not.toBeInTheDocument();

    await user.clear(contentField);
    await user.type(contentField, "这是用户手动修订后的正文，不应被后续导入覆盖。");
    await user.clear(urlField);
    await user.type(urlField, "https://example.com/post-2");
    await user.click(screen.getByRole("button", { name: "尝试提取链接内容" }));

    await waitFor(() => {
      expect(titleField.value).toBe("第二次导入标题");
      expect((screen.getByPlaceholderText("https://...") as HTMLInputElement).value).toBe("https://example.com/post-2");
      expect(contentField.value).toBe("这是用户手动修订后的正文，不应被后续导入覆盖。");
    });
  });
});
