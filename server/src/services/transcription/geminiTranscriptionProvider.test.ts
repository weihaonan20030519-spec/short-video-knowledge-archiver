import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, createPartFromTextMock, createPartFromUriMock, loggerErrorMock } = vi.hoisted(() => ({
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
  createPartFromUriMock: vi.fn((uri: string, mimeType: string) => ({ uri, mimeType })),
  loggerErrorMock: vi.fn()
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

vi.mock("../../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: loggerErrorMock
  }
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

  it("falls back to candidate text parts when response.text is empty", async () => {
    mockClient.files.upload.mockResolvedValue({
      name: "files/mock-2"
    });
    mockClient.files.get.mockResolvedValue({
      state: "ACTIVE",
      uri: "https://example.test/files/mock-2",
      mimeType: "audio/mpeg"
    });
    mockClient.models.generateContent.mockResolvedValue({
      text: "",
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: '{"transcriptText":"hello world","language":"en","warnings":[]}'
              }
            ]
          }
        }
      ]
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
    ).resolves.toMatchObject({
      transcriptText: "hello world",
      language: "en"
    });

    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it("retries once when Gemini returns an empty transcription response", async () => {
    mockClient.files.upload.mockResolvedValue({
      name: "files/mock-3"
    });
    mockClient.files.get.mockResolvedValue({
      state: "ACTIVE",
      uri: "https://example.test/files/mock-3",
      mimeType: "video/mp4"
    });
    mockClient.models.generateContent
      .mockResolvedValueOnce({
        text: "",
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: []
            }
          }
        ],
        responseId: "resp-1",
        modelVersion: "gemini-test"
      })
      .mockResolvedValueOnce({
        text: '{"transcriptText":"retry success","language":"en","warnings":[]}'
      });
    mockClient.files.delete.mockResolvedValue(undefined);

    const { GeminiTranscriptionProvider } = await import("./geminiTranscriptionProvider.js");
    const provider = new GeminiTranscriptionProvider();

    await expect(
      provider.transcribe({
        filePath: "/tmp/demo.mp4",
        mimeType: "video/mp4",
        fileName: "demo.mp4",
        sourceType: "video",
        languageHint: "en"
      })
    ).resolves.toMatchObject({
      transcriptText: "retry success"
    });

    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(2);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Gemini transcription returned an empty response",
      expect.objectContaining({
        attempt: 1,
        maxAttempts: 2,
        candidateCount: 1,
        hasDirectText: false
      })
    );
  });

  it("maps Gemini quota exceeded errors to TRANSCRIPTION_QUOTA_EXCEEDED with status 429", async () => {
    mockClient.files.upload.mockResolvedValue({
      name: "files/mock-4"
    });
    mockClient.files.get.mockResolvedValue({
      state: "ACTIVE",
      uri: "https://example.test/files/mock-4",
      mimeType: "audio/mpeg"
    });
    mockClient.models.generateContent.mockRejectedValue(
      new Error("429 RESOURCE_EXHAUSTED: quota exceeded for gemini transcription")
    );
    mockClient.files.delete.mockResolvedValue(undefined);

    const { GeminiTranscriptionProvider } = await import("./geminiTranscriptionProvider.js");
    const provider = new GeminiTranscriptionProvider();

    await expect(
      provider.transcribe({
        filePath: "/tmp/demo.mp3",
        mimeType: "audio/mpeg",
        fileName: "demo.mp3",
        sourceType: "audio",
        languageHint: "zh-CN"
      })
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_QUOTA_EXCEEDED",
      status: 429
    });
  });
});
