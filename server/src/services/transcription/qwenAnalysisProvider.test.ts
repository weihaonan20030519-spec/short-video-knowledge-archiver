import { describe, expect, it, vi } from "vitest";

import { QwenAnalysisProvider } from "./qwenAnalysisProvider.js";

const conciseInput = {
  mode: "concise" as const,
  appLanguage: "zh-CN" as const,
  title: "标题",
  sourcePlatform: "unknown" as const,
  originalUrl: null,
  rawText: "这是一段足够长的原文内容，用来测试 concise analyze 输出结构是否仍然稳定。"
};

const learningInput = {
  mode: "learning" as const,
  appLanguage: "zh-CN" as const,
  title: "标题",
  sourcePlatform: "unknown" as const,
  originalUrl: null,
  rawText: "这是一段足够长的原文内容，用来测试 learning analyze 输出结构是否仍然稳定，并且不会因为 provider 切换改变 contract。"
};

describe("QwenAnalysisProvider", () => {
  it("uses qwen primary model for concise analysis and returns the existing output contract", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      expect(body.model).toBe("qwen-plus");
      expect(body.messages[1].content).toContain("Input layers and priority:");
      expect(body.messages[1].content).toContain("primary_body:");
      expect(body.response_format).toEqual({
        type: "json_schema",
        json_schema: {
          name: "concise_output",
          schema: expect.any(Object)
        }
      });

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "整理后的摘要",
                  bullets: ["要点一", "要点二", "要点三"]
                })
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
      );
    });
    const provider = new QwenAnalysisProvider({
      apiKey: "test-key",
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      primaryModel: "qwen-plus",
      fallbackModel: "qwen-flash",
      fetcher: fetcher as typeof fetch
    });

    const result = await provider.analyze(conciseInput);

    expect(result).toEqual({
      summary: "整理后的摘要",
      bullets: ["要点一", "要点二", "要点三"]
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns the existing learning output contract unchanged", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      expect(body.messages[1].content).toContain("Generation units you must produce before section mapping:");
      expect(body.messages[1].content).toContain('"claimCore"');
      expect(body.messages[1].content).toContain("Full raw text for backup reference only:");
      expect(body.response_format).toMatchObject({
        type: "json_schema",
        json_schema: {
          name: "learning_output"
        }
      });

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  claimCore: "核心结论",
                  claimContrast: "不要把重点理解成标题或传播壳",
                  mechanismChain: ["先判断真实主张", "再解释为什么成立"],
                  decisiveEvidence: ["只有关键对比能证明主判断"],
                  actionRules: ["先判断，再总结"]
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    const provider = new QwenAnalysisProvider({
      apiKey: "test-key",
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      primaryModel: "qwen-plus",
      fallbackModel: "qwen-flash",
      fetcher: fetcher as typeof fetch
    });

    const result = await provider.analyze(learningInput);

    expect(result).toEqual({
      coreConclusion: "核心结论",
      logicFramework: ["不要把重点理解成标题或传播壳", "先判断真实主张", "再解释为什么成立"],
      keyDetails: ["只有关键对比能证明主判断"],
      reusablePoints: ["先判断，再总结"]
    });
  });

  it("throws a stable provider unavailable error when the api key is missing", async () => {
    const provider = new QwenAnalysisProvider({
      apiKey: null,
      baseUrl: "https://dashscope.example.com/compatible-mode/v1"
    });

    await expect(provider.analyze(conciseInput)).rejects.toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 503,
      message: "Qwen analysis provider unavailable: missing API key"
    });
  });

  it("maps timeout failures to AI_REQUEST_FAILED with 504", async () => {
    const fetcher = vi.fn(async () => {
      const error = new Error("The operation timed out");
      error.name = "TimeoutError";
      throw error;
    });
    const provider = new QwenAnalysisProvider({
      apiKey: "test-key",
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      fetcher: fetcher as typeof fetch,
      timeoutMs: 10
    });

    await expect(provider.analyze(conciseInput)).rejects.toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 504,
      message: "Qwen analysis request timed out"
    });
  });

  it("maps 503 provider failures to a stable unavailable error", async () => {
    const provider = new QwenAnalysisProvider({
      apiKey: "test-key",
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      fetcher: vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: "Service unavailable" } }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      ) as typeof fetch
    });

    await expect(provider.analyze(conciseInput)).rejects.toMatchObject({
      code: "AI_REQUEST_FAILED",
      status: 503,
      message: "Qwen analysis provider unavailable"
    });
  });

  it("maps schema mismatches to AI_RESPONSE_INVALID", async () => {
    const provider = new QwenAnalysisProvider({
      apiKey: "test-key",
      baseUrl: "https://dashscope.example.com/compatible-mode/v1",
      fetcher: vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: "只有摘要"
                  })
                }
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      ) as typeof fetch
    });

    await expect(provider.analyze(conciseInput)).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
      status: 502
    });
  });
});
