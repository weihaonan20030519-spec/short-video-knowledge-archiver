import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../utils/errors.js";
import { analyzeContent, prepareAnalyzeInput } from "./analyzeService.js";
import type { AnalysisProvider } from "./transcription/analysisProvider.js";

describe("prepareAnalyzeInput", () => {
  it("trims raw text", () => {
    const input = prepareAnalyzeInput(
      {
        mode: "concise",
        appLanguage: "zh-CN",
        title: "标题",
        sourcePlatform: "unknown",
        originalUrl: null,
        rawText: "  这是 一段   文本  "
      },
      3
    );

    expect(input.rawText).toBe("这是 一段 文本");
  });

  it("throws RAW_TEXT_REQUIRED for blank content", () => {
    expect(() =>
      prepareAnalyzeInput(
        {
          mode: "concise",
          appLanguage: "zh-CN",
          title: "标题",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText: "   "
        },
        3
      )
    ).toThrowError(ApiError);

    try {
      prepareAnalyzeInput(
        {
          mode: "concise",
          appLanguage: "zh-CN",
          title: "标题",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText: "   "
        },
        3
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("RAW_TEXT_REQUIRED");
    }
  });

  it("throws TEXT_TOO_SHORT when content is below the configured threshold", () => {
    expect(() =>
      prepareAnalyzeInput(
        {
          mode: "learning",
          appLanguage: "zh-CN",
          title: "标题",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText: "太短了"
        },
        10
      )
    ).toThrowError(ApiError);
  });

  it("defaults appLanguage to zh-CN when missing", () => {
    const input = prepareAnalyzeInput(
      {
        mode: "concise",
        title: "title",
        sourcePlatform: "unknown",
        originalUrl: null,
        rawText: "This is long enough."
      },
      3
    );

    expect(input.appLanguage).toBe("zh-CN");
  });

  it("keeps the provider input rawText unchanged after audit logging is added", async () => {
    const provider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn(async () => ({
        summary: "摘要",
        bullets: ["一", "二", "三"]
      }))
    };

    await analyzeContent(
      {
        mode: "concise",
        appLanguage: "zh-CN",
        title: "标题",
        sourcePlatform: "xiaohongshu",
        originalUrl: null,
        rawText:
          "真正重点是先判断，再总结，而不是只抽显眼句。 [图片文字补充] 图中文字补充说明了额外证据。"
      },
      provider
    );

    expect(provider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        rawText:
          "真正重点是先判断，再总结，而不是只抽显眼句。 [图片文字补充] 图中文字补充说明了额外证据。"
      })
    );
  });
});
