import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateRecordModal } from "./CreateRecordModal";
import { useSettingsStore } from "../../stores/settingsStore";
import { createFolder } from "../../test/factories";
import { TRANSCRIPTION_MAX_FILE_SIZE_BYTES } from "../../services/transcription/transcriptionTypes";
import { transcribeFile } from "../../services/transcription/transcriptionClient";

vi.mock("../../services/transcription/transcriptionClient", () => ({
  transcribeFile: vi.fn()
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("CreateRecordModal upload flow", () => {
  it("fills the existing content field from transcription and submits through the same original content path", async () => {
    const folder = createFolder({ id: "folder-1", name: "研究素材" });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const mockedTranscribeFile = vi.mocked(transcribeFile);

    mockedTranscribeFile.mockResolvedValue({
      success: true,
      data: {
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
        warnings: []
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
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

    await user.upload(screen.getByLabelText("选择视频或音频文件"), file);

    expect(await screen.findByTestId("upload-status-card")).toBeInTheDocument();
    expect(screen.getByText("文件名")).toBeInTheDocument();
    expect(screen.getByText("lesson.mp3")).toBeInTheDocument();
    expect(screen.getByText("文件类型")).toBeInTheDocument();
    expect(screen.getByText("音频")).toBeInTheDocument();
    expect(screen.getByText("文件大小")).toBeInTheDocument();
    expect(await screen.findByText("转写完成")).toBeInTheDocument();
    expect(screen.getByText("转写完成，已自动填入原始内容区。")).toBeInTheDocument();
    expect(screen.getByDisplayValue("方法课音频")).toBeInTheDocument();

    const contentField = screen.getByRole("textbox", { name: "原始转写文本" }) as HTMLTextAreaElement;
    expect(contentField.value).toBe("这是转写后的正文，会直接进入唯一的原始内容编辑区。");
    expect(container.querySelectorAll("textarea")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "创建记录" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          inputMethod: "upload",
          title: "方法课音频",
          content: "这是转写后的正文，会直接进入唯一的原始内容编辑区。"
        }),
        null,
        expect.objectContaining({
          transcriptText: "这是转写后的正文，会直接进入唯一的原始内容编辑区。"
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
    expect(screen.getByText("Other import methods")).toBeInTheDocument();

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
    expect(screen.getByText("Extracting Audio")).toBeInTheDocument();
    expect(screen.getAllByText("Transcribing").length).toBeGreaterThan(0);
    expect(screen.getByText("Processing has started. Keep this window open while the transcript is prepared.")).toBeInTheDocument();

    pending.resolve({
      success: true,
      data: {
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
        warnings: []
      },
      error: null
    });

    expect(await screen.findByText("Transcription Complete")).toBeInTheDocument();
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
    expect(screen.getAllByText("Processing timed out. Please retry.").length).toBeGreaterThan(0);
    expect(screen.getByText("You Can Continue Editing Manually")).toBeInTheDocument();
  });
});
