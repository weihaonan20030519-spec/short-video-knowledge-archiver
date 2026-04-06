import { describe, expect, it, vi } from "vitest";

import { createAnalyzeController } from "./analyzeController.js";
import type { AnalysisProvider } from "../services/transcription/analysisProvider.js";

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    json,
    status
  };
}

describe("analyzeController", () => {
  it("uses the injected analysis provider instead of a hardcoded SDK call", async () => {
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
          rawText: "This is long enough to be analyzed."
        }
      } as never,
      response as never
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: "Summary"
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
});
