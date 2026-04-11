import { describe, expect, it } from "vitest";

import {
  buildModelResultCacheKey,
  modelResultCache
} from "./modelResultCache.js";

describe("modelResultCache", () => {
  it("stores and retrieves model results", () => {
    modelResultCache.clear();
    const key = buildModelResultCacheKey("content-1", "model-1");
    modelResultCache.set(key, {
      data: {
        summary: "Summary",
        bullets: ["One", "Two", "Three"]
      },
      generatedAt: "2026-04-09T10:00:00.000Z",
      source: "model",
      decision: {
        routeAction: "call_model",
        reasonCode: "model_required"
      }
    });

    expect(modelResultCache.get(key)).toEqual(
      expect.objectContaining({
        generatedAt: "2026-04-09T10:00:00.000Z",
        source: "model"
      })
    );
  });
});
