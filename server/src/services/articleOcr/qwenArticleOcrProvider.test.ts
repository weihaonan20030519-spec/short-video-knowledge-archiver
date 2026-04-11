import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loggerInfoMock, loggerErrorMock } = vi.hoisted(() => ({
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn()
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    info: loggerInfoMock,
    error: loggerErrorMock
  }
}));

import { QwenArticleOcrProvider } from "./qwenArticleOcrProvider.js";

describe("QwenArticleOcrProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts clean text from OpenAI-compatible content", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "```json\n{\"text\":\"第一页文字\\n第二页文字\"}\n```"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    const provider = new QwenArticleOcrProvider({
      apiKey: "dashscope-key",
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: "qwen-vl-ocr",
      fetcher
    });

    const result = await provider.extractText({
      platform: "xiaohongshu",
      images: [{ url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null }],
      discoveredImageCount: 4,
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.succeededCount).toBe(1);
    expect(result.recognizedText).toContain("第一页文字");
    expect(result.recognizedText).toContain("第二页文字");
    expect(result.warnings).toEqual([]);
    expect(result.runMeta).toEqual(
      expect.objectContaining({
        discoveredImageCount: 4,
        candidateCount: 1,
        attemptedCount: 1,
        remainingImagesSkipped: 0,
        earlyStopped: false,
        errorCounts: {}
      })
    );
  });

  it("maps 429 to OCR_RATE_LIMITED with provider retry delay when the delay is interactive", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: "Too many requests"
            }
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "4"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "提取文本：恢复后的文字"
                }
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    const provider = new QwenArticleOcrProvider({
      apiKey: "dashscope-key",
      fetcher
    });

    const pending = provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.succeededCount).toBe(1);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image retry scheduled",
      expect.objectContaining({
        warningCode: "OCR_RATE_LIMITED",
        rateLimitKind: "soft_rate_limit",
        providerRetryDelayMs: 4000,
        effectiveRetryDelayMs: 4000,
        shouldAbortBatch: false
      })
    );
  });

  it("maps 503 to OCR_SERVICE_UNAVAILABLE", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: "Service unavailable"
            }
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "恢复后的结果"
                }
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    const provider = new QwenArticleOcrProvider({
      apiKey: "dashscope-key",
      fetcher
    });

    const pending = provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.succeededCount).toBe(1);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image retry scheduled",
      expect.objectContaining({
        warningCode: "OCR_SERVICE_UNAVAILABLE",
        effectiveRetryDelayMs: 3000,
        shouldAbortBatch: false
      })
    );
  });

  it("maps 401 authentication failures to a controlled OCR warning", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Invalid API key"
          }
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    const provider = new QwenArticleOcrProvider({
      apiKey: "bad-key",
      fetcher
    });

    const result = await provider.extractText({
      platform: "other",
      images: [
        { url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null },
        { url: "https://example.com/image2.png", source: "content", width: null, height: null, alt: null }
      ],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.warnings[0].code).toBe("OCR_UNKNOWN_ERROR");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      "OCR image failed",
      expect.objectContaining({
        warningCode: "OCR_UNKNOWN_ERROR",
        shouldAbortBatch: true,
        stopRemaining: true,
        status: 401
      })
    );
  });

  it("maps 400 invalid requests to OCR_BAD_REQUEST", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Bad request"
          }
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    const provider = new QwenArticleOcrProvider({
      apiKey: "dashscope-key",
      fetcher
    });

    const result = await provider.extractText({
      platform: "other",
      images: [{ url: "https://example.com/image1.png", source: "content", width: null, height: null, alt: null }],
      originalUrl: "https://example.com/page",
      resolvedUrl: "https://example.com/page"
    });

    expect(result.warnings[0].code).toBe("OCR_BAD_REQUEST");
    expect(result.warnings[0].message).toContain("invalid");
  });
});
