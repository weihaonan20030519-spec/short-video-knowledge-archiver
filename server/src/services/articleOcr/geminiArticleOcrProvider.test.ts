import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient, loggerInfoMock, loggerErrorMock } = vi.hoisted(() => ({
  mockClient: {
    models: {
      generateContent: vi.fn()
    }
  },
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn()
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => mockClient)
}));

vi.mock("./imageFetchHelper.js", () => ({
  fetchImageAsBase64: vi.fn()
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    info: loggerInfoMock,
    error: loggerErrorMock
  }
}));

import { GeminiArticleOcrProvider } from "./geminiArticleOcrProvider.js";
import { fetchImageAsBase64 } from "./imageFetchHelper.js";

describe("GeminiArticleOcrProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("ARTICLE_OCR_MODEL", "gemini-2.5-flash");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("provider is available", () => {
    const provider = new GeminiArticleOcrProvider();
    expect(provider.providerAvailable).toBe(true);
  });

  it("extracts text from single image successfully", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    mockClient.models.generateContent.mockResolvedValue({
      text: "Extracted text from image"
    });

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.attempted).toBe(1);
    expect(result.succeededCount).toBe(1);
    expect(result.imageResults).toEqual([
      {
        ordinal: 1,
        imageUrl: "https://example.com/image1.png",
        source: "content",
        succeeded: true,
        text: "Extracted text from image"
      }
    ]);
    expect(result.recognizedText).toBe("[Image OCR 1]\nExtracted text from image");
    expect(result.recognizedTextLength).toBe(39);
    expect(result.warnings).toEqual([]);
  });

  it("aggregates text from multiple images", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    mockClient.models.generateContent
      .mockResolvedValueOnce({ text: "Text from image 1" })
      .mockResolvedValueOnce({ text: "Text from image 2" });

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image2.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.attempted).toBe(2);
    expect(result.succeededCount).toBe(2);
    expect(result.imageResults).toEqual([
      {
        ordinal: 1,
        imageUrl: "https://example.com/image1.png",
        source: "content",
        succeeded: true,
        text: "Text from image 1"
      },
      {
        ordinal: 2,
        imageUrl: "https://example.com/image2.png",
        source: "content",
        succeeded: true,
        text: "Text from image 2"
      }
    ]);
    expect(result.recognizedText).toBe("[Image OCR 1]\nText from image 1\n\n[Image OCR 2]\nText from image 2");
    expect(result.warnings).toEqual([]);
  });

  it("handles image download failure", async () => {
    (fetchImageAsBase64 as any).mockRejectedValue(new Error("IMAGE_TOO_LARGE"));

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/large.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.attempted).toBe(1);
    expect(result.succeededCount).toBe(0);
    expect(result.recognizedText).toBeNull();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].code).toBe("OCR_BAD_REQUEST");
    expect(result.warnings[0].message).toContain("too large");
  });

  it("handles unsupported MIME type", async () => {
    const unsupportedMimeError = Object.assign(new Error("IMAGE_UNSUPPORTED_CONTENT_TYPE"), {
      imageUrl: "https://example.com/unsupported.bmp",
      imageHost: "example.com",
      mimeType: "image/bmp"
    });
    (fetchImageAsBase64 as any).mockRejectedValue(unsupportedMimeError);

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/unsupported.bmp", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].code).toBe("OCR_BAD_REQUEST");
    expect(result.warnings[0].message).toContain("format is not supported");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image failed",
      expect.objectContaining({
        imageHost: "example.com",
        mimeType: "image/bmp",
        warningCode: "OCR_BAD_REQUEST"
      })
    );
  });

  it("handles fetch failure", async () => {
    (fetchImageAsBase64 as any).mockRejectedValue(new Error("IMAGE_FETCH_FAILED"));

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/missing.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].code).toBe("OCR_UNKNOWN_ERROR");
    expect(result.warnings[0].message).toContain("could not fetch");
  });

  it("retries a transient soft-rate-limit 429 when the provider retry delay stays within the interactive cap", async () => {
    vi.useFakeTimers();
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error('429 Too Many Requests. RetryInfo retryDelay: "4s"');
    (error as Error & { status?: number }).status = 429;
    mockClient.models.generateContent.mockRejectedValueOnce(error).mockResolvedValueOnce({
      text: "Retry success text"
    });

    const provider = new GeminiArticleOcrProvider();
    const pending = provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(fetchImageAsBase64).toHaveBeenCalledTimes(2);
    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(2);
    expect(result.succeededCount).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(result.recognizedText).toContain("Retry success text");
    expect(result.runMeta).toEqual(
      expect.objectContaining({
        candidateCount: 1,
        attemptedCount: 1,
        earlyStopped: false,
        remainingImagesSkipped: 0,
        errorCounts: {}
      })
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image retry scheduled",
      expect.objectContaining({
        imageOrdinal: 1,
        warningCode: "OCR_RATE_LIMITED",
        rateLimitKind: "soft_rate_limit",
        providerRetryDelayMs: 4000,
        effectiveRetryDelayMs: 4000,
        shouldAbortBatch: false,
        attempt: 1,
        maxAttempts: 2
      })
    );
  });

  it("retries a transient Gemini 503 once before succeeding", async () => {
    vi.useFakeTimers();
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error("503 ServiceUnavailable: high demand");
    (error as Error & { status?: number }).status = 503;
    mockClient.models.generateContent.mockRejectedValueOnce(error).mockResolvedValueOnce({
      text: "Recovered from service unavailable"
    });

    const provider = new GeminiArticleOcrProvider();
    const pending = provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(fetchImageAsBase64).toHaveBeenCalledTimes(2);
    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(2);
    expect(result.succeededCount).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image retry scheduled",
      expect.objectContaining({
        imageOrdinal: 1,
        warningCode: "OCR_SERVICE_UNAVAILABLE",
        rateLimitKind: null,
        providerRetryDelayMs: null,
        effectiveRetryDelayMs: 3000,
        shouldAbortBatch: false,
        attempt: 1,
        maxAttempts: 2
      })
    );
  });

  it("maps Gemini 400 errors to OCR_BAD_REQUEST", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error("400 BadRequest: invalid argument");
    (error as Error & { status?: number }).status = 400;
    mockClient.models.generateContent.mockRejectedValue(error);

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].code).toBe("OCR_BAD_REQUEST");
    expect(result.warnings[0].message).toContain("400 BadRequest");
  });

  it("maps unknown Gemini API failures to OCR_UNKNOWN_ERROR", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    mockClient.models.generateContent.mockRejectedValue(new Error("API Error"));

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].code).toBe("OCR_UNKNOWN_ERROR");
    expect(result.warnings[0].message).toContain("unexpected provider error");
  });

  it("handles successful OCR but no text detected", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    mockClient.models.generateContent.mockResolvedValue({ text: "" });

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/empty.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.succeededCount).toBe(0);
    expect(result.warnings[0].code).toBe("OCR_NO_TEXT_DETECTED");
    expect(result.warnings[0].message).toContain("no text was detected");
  });

  it("continues processing when one image fails", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any)
      .mockRejectedValueOnce(new Error("IMAGE_TOO_LARGE"))
      .mockResolvedValueOnce(mockImagePayload);
    mockClient.models.generateContent.mockResolvedValue({ text: "Text from second image" });

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/large.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/good.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.attempted).toBe(2);
    expect(result.succeededCount).toBe(1);
    expect(result.imageResults).toEqual([
      {
        ordinal: 1,
        imageUrl: "https://example.com/large.png",
        source: "content",
        succeeded: false,
        text: null,
        warningCode: "OCR_BAD_REQUEST",
        warningMessage: expect.stringContaining("too large")
      },
      {
        ordinal: 2,
        imageUrl: "https://example.com/good.png",
        source: "content",
        succeeded: true,
        text: "Text from second image"
      }
    ]);
    expect(result.recognizedText).toBe("[Image OCR 2]\nText from second image");
    expect(result.warnings).toHaveLength(1);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR run completed",
      expect.objectContaining({
        attemptedCount: 2,
        succeededCount: 1,
        earlyStopped: false,
        remainingImagesSkipped: 0,
        errorCounts: {
          OCR_BAD_REQUEST: 1
        }
      })
    );
  });

  it("does not stop the batch on the first retryable failure, but stops after repeated busy failures", async () => {
    vi.useFakeTimers();
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error('429 Too Many Requests. RetryInfo retryDelay: "4s"');
    (error as Error & { status?: number }).status = 429;
    mockClient.models.generateContent.mockRejectedValue(error);

    const provider = new GeminiArticleOcrProvider();
    const pending = provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image2.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image3.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(fetchImageAsBase64).toHaveBeenCalledTimes(4);
    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(4);
    expect(result.attempted).toBe(2);
    expect(result.imageResults).toHaveLength(2);
    expect(result.warnings[0].code).toBe("OCR_RATE_LIMITED");
    expect(result.warnings[1].code).toBe("OCR_RATE_LIMITED");
    expect(result.warnings[1].message).toContain("remaining images in this import");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR run completed",
      expect.objectContaining({
        candidateCount: 3,
        attemptedCount: 2,
        succeededCount: 0,
        earlyStopped: true,
        earlyStopAt: 2,
        remainingImagesSkipped: 1,
        errorCounts: {
          OCR_RATE_LIMITED: 2
        }
      })
    );
  });

  it("does not retry a hard quota 429 and aborts the current batch", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error("429 RESOURCE_EXHAUSTED: free tier quota exceeded");
    (error as Error & { status?: number }).status = 429;
    mockClient.models.generateContent.mockRejectedValue(error);

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image2.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(fetchImageAsBase64).toHaveBeenCalledTimes(1);
    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);
    expect(loggerInfoMock).not.toHaveBeenCalledWith("OCR image retry scheduled", expect.anything());
    expect(result.warnings[0].code).toBe("OCR_RATE_LIMITED");
    expect(result.warnings[0].message).toContain("remaining images in this import");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image failed",
      expect.objectContaining({
        warningCode: "OCR_RATE_LIMITED",
        rateLimitKind: "hard_quota",
        providerRetryDelayMs: null,
        effectiveRetryDelayMs: null,
        shouldAbortBatch: true,
        stopRemaining: true
      })
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR run completed",
      expect.objectContaining({
        attemptedCount: 1,
        earlyStopped: true,
        earlyStopReason: "OCR_RATE_LIMITED",
        remainingImagesSkipped: 1,
        errorCounts: {
          OCR_RATE_LIMITED: 1
        }
      })
    );
  });

  it("does not retry a soft-rate-limit 429 when the provider retry delay is too long for interactive import", async () => {
    const mockImagePayload = { base64: "mock-base64", mimeType: "image/png" };
    (fetchImageAsBase64 as any).mockResolvedValue(mockImagePayload);
    const error = new Error('429 Too Many Requests. RetryInfo retryDelay: "24s"');
    (error as Error & { status?: number }).status = 429;
    mockClient.models.generateContent.mockRejectedValue(error);

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image2.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(fetchImageAsBase64).toHaveBeenCalledTimes(1);
    expect(mockClient.models.generateContent).toHaveBeenCalledTimes(1);
    expect(loggerInfoMock).not.toHaveBeenCalledWith("OCR image retry scheduled", expect.anything());
    expect(result.warnings[0].code).toBe("OCR_RATE_LIMITED");
    expect(result.warnings[0].message).toContain("remaining images in this import");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image failed",
      expect.objectContaining({
        warningCode: "OCR_RATE_LIMITED",
        rateLimitKind: "soft_rate_limit",
        providerRetryDelayMs: 24000,
        effectiveRetryDelayMs: null,
        shouldAbortBatch: true,
        stopRemaining: true
      })
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR run completed",
      expect.objectContaining({
        attemptedCount: 1,
        earlyStopped: true,
        earlyStopReason: "OCR_RATE_LIMITED",
        remainingImagesSkipped: 1
      })
    );
  });

  it("returns null text when all images fail", async () => {
    (fetchImageAsBase64 as any).mockRejectedValue(new Error("IMAGE_FETCH_FAILED"));

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/fail1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/fail2.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.recognizedText).toBeNull();
    expect(result.succeededCount).toBe(0);
    expect(result.imageResults).toEqual([
      {
        ordinal: 1,
        imageUrl: "https://example.com/fail1.png",
        source: "content",
        succeeded: false,
        text: null,
        warningCode: "OCR_UNKNOWN_ERROR",
        warningMessage: "Image OCR could not fetch the image content."
      },
      {
        ordinal: 2,
        imageUrl: "https://example.com/fail2.png",
        source: "content",
        succeeded: false,
        text: null,
        warningCode: "OCR_UNKNOWN_ERROR",
        warningMessage: "Image OCR could not fetch the image content."
      }
    ]);
    expect(result.warnings).toHaveLength(2);
  });
});
