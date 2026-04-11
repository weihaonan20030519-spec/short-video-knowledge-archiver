import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAnalyzeController } from "./analyzeController.js";
import type { AnalysisProvider } from "../services/transcription/analysisProvider.js";
import { ApiError } from "../utils/errors.js";
import { ruleDecisionCache } from "../services/analysis/cache/ruleDecisionCache.js";
import { modelResultCache } from "../services/analysis/cache/modelResultCache.js";

function createResponseMock() {
  const json = vi.fn();
  const statusJson = vi.fn();
  const status = vi.fn(() => ({ json: statusJson }));
  return {
    json,
    status,
    statusJson
  };
}

describe("analyzeController", () => {
  beforeEach(() => {
    ruleDecisionCache.clear();
    modelResultCache.clear();
  });

  it("returns a resolved outcome when the provider succeeds", async () => {
    const analysisProvider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn(async () => ({
        summary: "Summary",
        bullets: ["One", "Two", "Three"]
      }))
    };
    const response = createResponseMock();
    const controller = createAnalyzeController(analysisProvider);

    await controller(
      {
        body: {
          mode: "concise",
          appLanguage: "en",
          title: "Title",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText:
            "This content is long enough to support a concise summary. It has multiple sentences. It should not trigger review."
        }
      } as never,
      response as never
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        outcome: "resolved",
        data: expect.objectContaining({
          summary: "Summary"
        }),
        meta: expect.objectContaining({
          mode: "concise",
          source: "model",
          decision: {
            routeAction: "call_model",
            reasonCode: "model_required"
          }
        })
      })
    );
    expect(analysisProvider.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        appLanguage: "en",
        mode: "concise"
      })
    );
  });

  it("returns needs_review as a successful outcome without calling the provider", async () => {
    const analysisProvider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn()
    };
    const response = createResponseMock();
    const controller = createAnalyzeController(analysisProvider);

    await controller(
      {
        body: {
          mode: "learning",
          appLanguage: "en",
          title: "Short note",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText: "This note is too short for learning output."
        }
      } as never,
      response as never
    );

    expect(analysisProvider.analyze).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        outcome: "needs_review",
        data: null,
        review: {
          reasonCode: "source_text_needs_review",
          recommendedAction: "edit_source_text"
        },
        meta: expect.objectContaining({
          source: "local",
          decision: {
            routeAction: "return_review",
            reasonCode: "source_text_needs_review"
          }
        })
      })
    );
  });

  it("returns failed when the provider throws an ApiError", async () => {
    const analysisProvider: AnalysisProvider = {
      name: "analysis-mock",
      analyze: vi.fn(async () => {
        throw new ApiError("AI_REQUEST_FAILED", "Provider failure", 502);
      })
    };
    const response = createResponseMock();
    const controller = createAnalyzeController(analysisProvider);

    await controller(
      {
        body: {
          mode: "concise",
          appLanguage: "en",
          title: "Title",
          sourcePlatform: "unknown",
          originalUrl: null,
          rawText:
            "This content is long enough to support a concise summary. It has multiple sentences. It should not trigger review."
        }
      } as never,
      response as never
    );

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.statusJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        outcome: "failed",
        error: {
          code: "AI_REQUEST_FAILED",
          message: "Provider failure"
        },
        meta: expect.objectContaining({
          source: null
        })
      })
    );
  });
});
