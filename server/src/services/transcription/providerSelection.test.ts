import { afterEach, describe, expect, it, vi } from "vitest";

describe("provider selection", () => {
  afterEach(() => {
    delete process.env.ANALYSIS_PROVIDER;
    delete process.env.TRANSCRIPTION_PROVIDER;
    vi.resetModules();
  });

  it("creates providers from configuration defaults and uses qwen for analysis", async () => {
    const { createAnalysisProvider, createTranscriptionProvider } = await import("./providerSelection.js");

    expect(createAnalysisProvider().name).toBe("qwen");
    expect(createTranscriptionProvider().name).toBe("gemini");
  });

  it("allows explicitly switching analysis back to gemini without affecting transcription", async () => {
    process.env.ANALYSIS_PROVIDER = "gemini";
    process.env.TRANSCRIPTION_PROVIDER = "gemini";

    const { createAnalysisProvider, createTranscriptionProvider } = await import("./providerSelection.js");

    expect(createAnalysisProvider().name).toBe("gemini");
    expect(createTranscriptionProvider().name).toBe("gemini");
  });
});
