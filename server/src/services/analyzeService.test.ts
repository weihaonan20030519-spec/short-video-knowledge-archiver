import { describe, expect, it } from "vitest";

import { ApiError } from "../utils/errors.js";
import { prepareAnalyzeInput } from "./analyzeService.js";

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
});
