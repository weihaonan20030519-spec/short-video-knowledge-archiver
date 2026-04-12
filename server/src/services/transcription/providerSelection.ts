import type { AnalysisProvider } from "./analysisProvider.js";
import type { TranscriptionProvider } from "./transcriptionProvider.js";
import { GeminiAnalysisProvider } from "./geminiAnalysisProvider.js";
import { GeminiTranscriptionProvider } from "./geminiTranscriptionProvider.js";
import { QwenAnalysisProvider } from "./qwenAnalysisProvider.js";
import { env } from "../../utils/env.js";

export function createAnalysisProvider(providerName = env.ANALYSIS_PROVIDER): AnalysisProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiAnalysisProvider();
    case "qwen":
      return new QwenAnalysisProvider();
    default:
      throw new Error(`Unsupported analysis provider: ${providerName}`);
  }
}

export function createTranscriptionProvider(providerName = env.TRANSCRIPTION_PROVIDER): TranscriptionProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiTranscriptionProvider();
    default:
      throw new Error(`Unsupported transcription provider: ${providerName}`);
  }
}
