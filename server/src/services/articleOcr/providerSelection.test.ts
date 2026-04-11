import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerErrorMock } = vi.hoisted(() => ({
  loggerErrorMock: vi.fn()
}));

vi.mock("../../utils/env.js", () => ({
  env: {
    ARTICLE_OCR_PROVIDER: "gemini",
    GEMINI_API_KEY: undefined,
    DASHSCOPE_API_KEY: undefined,
    DASHSCOPE_BASE_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    QWEN_OCR_MODEL: "qwen-vl-ocr"
  },
  resolveDashscopeBaseUrl: () => "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: loggerErrorMock
  }
}));

import { createArticleOcrProvider } from "./providerSelection.js";
import { NoopArticleOcrProvider } from "./noopArticleOcrProvider.js";
import { GeminiArticleOcrProvider } from "./geminiArticleOcrProvider.js";
import { QwenArticleOcrProvider } from "./qwenArticleOcrProvider.js";
import { env } from "../../utils/env.js";

describe("createArticleOcrProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.ARTICLE_OCR_PROVIDER = "gemini";
    env.GEMINI_API_KEY = undefined;
    env.DASHSCOPE_API_KEY = undefined;
  });

  it("returns NoopArticleOcrProvider by default", () => {
    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(NoopArticleOcrProvider);
    expect(provider.providerAvailable).toBe(false);
  });

  it("returns GeminiArticleOcrProvider when ARTICLE_OCR_PROVIDER=gemini and GEMINI_API_KEY is set", () => {
    env.ARTICLE_OCR_PROVIDER = "gemini";
    env.GEMINI_API_KEY = "test-key";

    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(GeminiArticleOcrProvider);
    expect(provider.providerAvailable).toBe(true);
  });

  it("falls back to NoopArticleOcrProvider when ARTICLE_OCR_PROVIDER=gemini but GEMINI_API_KEY is missing", () => {
    env.ARTICLE_OCR_PROVIDER = "gemini";
    env.GEMINI_API_KEY = undefined;

    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(NoopArticleOcrProvider);
    expect(provider.providerAvailable).toBe(false);
  });

  it("returns NoopArticleOcrProvider for invalid provider name", () => {
    (env as any).ARTICLE_OCR_PROVIDER = "invalid";

    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(NoopArticleOcrProvider);
  });

  it("accepts explicit provider name override", () => {
    env.ARTICLE_OCR_PROVIDER = "noop";
    env.GEMINI_API_KEY = "test-key";

    const provider = createArticleOcrProvider("gemini");

    expect(provider).toBeInstanceOf(GeminiArticleOcrProvider);
  });

  it("returns QwenArticleOcrProvider when ARTICLE_OCR_PROVIDER=qwen_ocr and DASHSCOPE_API_KEY is set", () => {
    env.ARTICLE_OCR_PROVIDER = "qwen_ocr";
    env.DASHSCOPE_API_KEY = "dashscope-key";

    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(QwenArticleOcrProvider);
    expect(provider.providerAvailable).toBe(true);
  });

  it("falls back to NoopArticleOcrProvider when ARTICLE_OCR_PROVIDER=qwen_ocr but DASHSCOPE_API_KEY is missing", () => {
    env.ARTICLE_OCR_PROVIDER = "qwen_ocr";
    env.DASHSCOPE_API_KEY = undefined;

    const provider = createArticleOcrProvider();

    expect(provider).toBeInstanceOf(NoopArticleOcrProvider);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Article OCR provider unavailable",
      expect.objectContaining({
        providerName: "qwen_ocr",
        reason: "missing DASHSCOPE_API_KEY"
      })
    );
  });
}); 
