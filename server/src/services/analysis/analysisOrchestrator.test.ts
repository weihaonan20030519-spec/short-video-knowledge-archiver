import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAnalysisOrchestrator } from "./analysisOrchestrator.js";
import { ruleDecisionCache } from "./cache/ruleDecisionCache.js";
import { modelResultCache } from "./cache/modelResultCache.js";
import type { AnalysisProvider } from "../transcription/analysisProvider.js";

describe("analysisOrchestrator", () => {
  beforeEach(() => {
    ruleDecisionCache.clear();
    modelResultCache.clear();
  });

  it("returns needs_review without calling provider when review policy hits", async () => {
    const provider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn()
    };
    const orchestrator = createAnalysisOrchestrator({ provider });

    const response = await orchestrator.analyze({
      mode: "learning",
      appLanguage: "zh-CN",
      title: "",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText: "这是一段很短的内容，没有太多结构，也不足以支撑完整学习整理。"
    });

    expect(provider.analyze).not.toHaveBeenCalled();
    expect(response.outcome).toBe("needs_review");
    expect(response.meta.decision.routeAction).toBe("return_review");
  });

  it("reuses cached review decisions without re-running scorer", async () => {
    const provider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn()
    };
    const scoreSignals = vi.fn(() => ({
      sufficiency: "insufficient" as const,
      ambiguity: "high" as const,
      localityFit: "not_applicable" as const
    }));
    const orchestrator = createAnalysisOrchestrator({ provider, scoreSignals });

    const input = {
      mode: "learning" as const,
      appLanguage: "zh-CN" as const,
      title: "",
      sourcePlatform: "unknown" as const,
      originalUrl: null,
      rawText: "这是一段很短的内容，没有太多结构，也不足以支撑完整学习整理。"
    };

    await orchestrator.analyze(input);
    await orchestrator.analyze(input);

    expect(scoreSignals).toHaveBeenCalledTimes(1);
    expect(provider.analyze).not.toHaveBeenCalled();
  });

  it("calls provider once and reuses model cache on repeated resolved requests", async () => {
    const provider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn(async () => ({
        summary: "Summary",
        bullets: ["One", "Two", "Three"]
      }))
    };
    const orchestrator = createAnalysisOrchestrator({ provider });

    const input = {
      mode: "concise" as const,
      appLanguage: "en" as const,
      title: "Title",
      sourcePlatform: "unknown" as const,
      originalUrl: null,
      rawText: "This content is long enough to support a concise summary. It has multiple sentences. It should not trigger review."
    };

    const first = await orchestrator.analyze(input);
    const second = await orchestrator.analyze(input);

    expect(provider.analyze).toHaveBeenCalledTimes(1);
    expect(first.outcome).toBe("resolved");
    expect(second.outcome).toBe("resolved");
    expect(second.meta.decision.routeAction).toBe("call_model");
  });

  it("does not allow resolve_local to appear in phase 2", async () => {
    const provider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn(async () => ({
        summary: "Summary",
        bullets: ["One", "Two", "Three"]
      }))
    };
    const orchestrator = createAnalysisOrchestrator({ provider });

    const response = await orchestrator.analyze({
      mode: "concise",
      appLanguage: "en",
      title: "Title",
      sourcePlatform: "unknown",
      originalUrl: null,
      rawText: "This content is long enough to support a concise summary. It has multiple sentences. It should not trigger review."
    });

    expect(response.meta.decision.routeAction).not.toBe("resolve_local");
  });
});
