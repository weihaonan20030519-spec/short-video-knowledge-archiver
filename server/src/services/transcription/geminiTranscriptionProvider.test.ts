import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, createPartFromTextMock, createPartFromUriMock } = vi.hoisted(() => ({
  mockClient: {
    files: {
      upload: vi.fn(),
      get: vi.fn(),
      delete: vi.fn()
    },
    models: {
      generateContent: vi.fn()
    }
  },
  createPartFromTextMock: vi.fn((text: string) => ({ text })),
  createPartFromUriMock: vi.fn((uri: string, mimeType: string) => ({ uri, mimeType }))
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => mockClient),
  FileState: {
    ACTIVE: "ACTIVE",
    FAILED: "FAILED",
    PROCESSING: "PROCESSING"
  },
  createPartFromText: createPartFromTextMock,
  createPartFromUri: createPartFromUriMock
}));

describe("GeminiTranscriptionProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("TRANSCRIPTION_FILE_READY_POLL_INTERVAL_MS", "1");
    vi.stubEnv("TRANSCRIPTION_FILE_READY_TIMEOUT_MS", "2");
    vi.stubEnv("GEMINI_MODEL_TRANSCRIPTION", "gemini-2.5-flash");
  });

  it("throws TRANSCRIPTION_TIMEOUT only for the Gemini file-ready wait stage and still deletes the uploaded file", async () => {
    mockClient.files.upload.mockResolvedValue({
      name: "files/mock-1"
    });
    mockClient.files.get.mockResolvedValue({
      state: "PROCESSING"
    });
    mockClient.files.delete.mockResolvedValue(undefined);

    const { GeminiTranscriptionProvider } = await import("./geminiTranscriptionProvider.js");
    const provider = new GeminiTranscriptionProvider();

    await expect(
      provider.transcribe({
        filePath: "/tmp/demo.mp3",
        mimeType: "audio/mpeg",
        fileName: "demo.mp3",
        sourceType: "audio",
        languageHint: "en"
      })
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_TIMEOUT",
      status: 504
    });

    expect(mockClient.models.generateContent).not.toHaveBeenCalled();
    expect(mockClient.files.delete).toHaveBeenCalledWith({
      name: "files/mock-1"
    });
  });
});
