import { GoogleGenAI } from "@google/genai";

import type { AnalysisProvider } from "./analysisProvider.js";
import {
  conciseOutputJsonSchema,
  conciseOutputSchema,
  learningOutputJsonSchema,
  learningOutputSchema,
  type AnalyzeRequest,
  type ConciseOutput,
  type LearningOutput
} from "../../schemas/analyzeSchemas.js";
import { buildConcisePrompt } from "../../prompts/concisePrompt.js";
import { buildLearningPrompt } from "../../prompts/learningPrompt.js";
import { ApiError } from "../../utils/errors.js";
import { requireGeminiKey, resolveAnalyzeModel } from "../../utils/env.js";

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    throw new ApiError("AI_RESPONSE_INVALID", "Gemini returned invalid JSON", 502);
  }
}

export class GeminiAnalysisProvider implements AnalysisProvider {
  readonly name = "gemini";

  async analyze(input: AnalyzeRequest): Promise<ConciseOutput | LearningOutput> {
    const prompt = input.mode === "concise" ? buildConcisePrompt(input) : buildLearningPrompt(input);
    const responseJsonSchema =
      input.mode === "concise" ? conciseOutputJsonSchema : learningOutputJsonSchema;

    const client = new GoogleGenAI({
      apiKey: requireGeminiKey("analysis")
    });

    const result = await client.models
      .generateContent({
        model: resolveAnalyzeModel(input.mode),
        contents: prompt.userPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema,
          systemInstruction: prompt.systemInstruction
        }
      })
      .catch((error) => {
        throw new ApiError(
          "AI_REQUEST_FAILED",
          error instanceof Error ? error.message : "Gemini request failed",
          502
        );
      });

    const content = result.text;

    if (!content) {
      throw new ApiError("AI_RESPONSE_INVALID", "Gemini returned empty content", 502);
    }

    const json = parseJsonContent(content);

    const validated =
      input.mode === "concise"
        ? conciseOutputSchema.safeParse(json)
        : learningOutputSchema.safeParse(json);

    if (!validated.success) {
      throw new ApiError(
        "AI_RESPONSE_INVALID",
        "Gemini response did not match the required schema",
        502
      );
    }

    return validated.data;
  }
}
