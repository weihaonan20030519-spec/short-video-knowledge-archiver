import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    models: {
      generateContent: vi.fn()
    }
  }
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => mockClient)
}));

vi.mock("./imageFetchHelper.js", () => ({
  fetchImageAsBase64: vi.fn()
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
    expect(result.warnings[0].code).toBe("OCR_NO_TEXT_DETECTED");
    expect(result.warnings[0].message).toContain("too large");
  });

  it("handles unsupported MIME type", async () => {
    (fetchImageAsBase64 as any).mockRejectedValue(new Error("IMAGE_UNSUPPORTED_CONTENT_TYPE"));

    const provider = new GeminiArticleOcrProvider();
    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/unsupported.bmp", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].message).toContain("format is not supported");
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

    expect(result.warnings[0].message).toContain("could not be fetched");
  });

  it("handles Gemini API failure", async () => {
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

    expect(result.warnings[0].message).toContain("unexpected error occurred");
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
        warningCode: "OCR_NO_TEXT_DETECTED",
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
        warningCode: "OCR_NO_TEXT_DETECTED",
        warningMessage: expect.stringContaining("could not be fetched")
      },
      {
        ordinal: 2,
        imageUrl: "https://example.com/fail2.png",
        source: "content",
        succeeded: false,
        text: null,
        warningCode: "OCR_NO_TEXT_DETECTED",
        warningMessage: expect.stringContaining("could not be fetched")
      }
    ]);
    expect(result.warnings).toHaveLength(2);
  });
});