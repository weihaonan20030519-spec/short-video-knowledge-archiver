import type { AnalysisProvider } from "./analysisProvider.js";
import {
  conciseOutputJsonSchema,
  conciseOutputSchema,
  learningInternalOutputJsonSchema,
  learningInternalOutputSchema,
  learningLegacyOutputJsonSchema,
  learningOutputSchema
} from "../../schemas/analyzeSchemas.js";
import type {
  AnalyzeRequest,
  ConciseOutput,
  LearningOutput
} from "../../../../shared/src/analysis/analyzeContracts.js";
import { buildConcisePrompt } from "../../prompts/concisePrompt.js";
import { buildLearningPrompt } from "../../prompts/learningPrompt.js";
import type { AnalyzePromptBuildOptions } from "../../prompts/analyzePromptOptions.js";
import { mapLearningInternalOutput } from "../analysis/mapLearningInternalOutput.js";
import { ApiError } from "../../utils/errors.js";
import {
  resolveQwenAnalyzeModel,
  resolveQwenApiKey,
  resolveQwenBaseUrl
} from "../../utils/env.js";

const DEFAULT_ANALYSIS_TIMEOUT_MS = 30_000;

interface QwenAnalysisProviderDependencies {
  apiKey?: string | null;
  baseUrl?: string;
  primaryModel?: string;
  fallbackModel?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

function parseJsonContent(content: string) {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(normalized);
  } catch {
    throw new ApiError("AI_RESPONSE_INVALID", "Qwen returned invalid JSON", 502);
  }
}

function extractMessageContent(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const candidate = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = candidate.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

function findErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };

  const values = [candidate.status, candidate.code, candidate.response?.status];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && /^\d+$/.test(value)) {
      return Number(value);
    }
  }

  return null;
}

function findErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Qwen analysis error";
  }
}

function isAbortLikeError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /aborted|timed out|timeout/i.test(error.message))
  );
}

function buildQwenError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAbortLikeError(error)) {
    return new ApiError("AI_REQUEST_FAILED", "Qwen analysis request timed out", 504);
  }

  const status = findErrorStatus(error);
  const message = findErrorMessage(error);

  if (status === 401 || status === 403) {
    return new ApiError("AI_REQUEST_FAILED", "Qwen analysis authentication failed", 502);
  }

  if (status === 429) {
    return new ApiError("AI_REQUEST_FAILED", "Qwen analysis request was rate limited", 429);
  }

  if (status === 503 || /service unavailable|high demand/i.test(message)) {
    return new ApiError("AI_REQUEST_FAILED", "Qwen analysis provider unavailable", 503);
  }

  return new ApiError("AI_REQUEST_FAILED", message || fallbackMessage, status ?? 502);
}

export class QwenAnalysisProvider implements AnalysisProvider {
  readonly name = "qwen";

  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(dependencies: QwenAnalysisProviderDependencies = {}) {
    this.apiKey = dependencies.apiKey !== undefined ? dependencies.apiKey : resolveQwenApiKey();
    this.baseUrl = (dependencies.baseUrl ?? resolveQwenBaseUrl()).replace(/\/$/, "");
    this.primaryModel = dependencies.primaryModel ?? resolveQwenAnalyzeModel("primary");
    this.fallbackModel = dependencies.fallbackModel ?? resolveQwenAnalyzeModel("fallback");
    this.fetcher = dependencies.fetcher ?? fetch;
    this.timeoutMs = dependencies.timeoutMs ?? DEFAULT_ANALYSIS_TIMEOUT_MS;
  }

  async analyze(input: AnalyzeRequest): Promise<ConciseOutput | LearningOutput> {
    return this.analyzeWithPromptOptions(input);
  }

  async analyzeWithPromptOptions(
    input: AnalyzeRequest,
    promptOptions: AnalyzePromptBuildOptions = {}
  ): Promise<ConciseOutput | LearningOutput> {
    if (!this.apiKey) {
      throw new ApiError("AI_REQUEST_FAILED", "Qwen analysis provider unavailable: missing API key", 503);
    }

    const methodology = promptOptions.methodology ?? "restructured";
    const prompt =
      input.mode === "concise"
        ? buildConcisePrompt(input, promptOptions)
        : buildLearningPrompt(input, promptOptions);
    const responseJsonSchema =
      input.mode === "concise"
        ? conciseOutputJsonSchema
        : methodology === "legacy"
          ? learningLegacyOutputJsonSchema
          : learningInternalOutputJsonSchema;

    const requestBody = {
      model: this.primaryModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt.systemInstruction },
        { role: "user", content: prompt.userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: input.mode === "concise" ? "concise_output" : "learning_output",
          schema: responseJsonSchema
        }
      }
    };

    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.timeoutMs)
    }).catch((error) => {
      throw buildQwenError(error, "Qwen analysis request failed");
    });

    const rawText = await response.text();
    const payload = rawText
      ? (() => {
          try {
            return JSON.parse(rawText) as unknown;
          } catch {
            return rawText;
          }
        })()
      : null;

    if (!response.ok) {
      throw buildQwenError(
        {
          status: response.status,
          message: response.statusText,
          payload
        },
        "Qwen analysis request failed"
      );
    }

    const content = extractMessageContent(payload);

    if (!content) {
      throw new ApiError("AI_RESPONSE_INVALID", "Qwen returned empty content", 502, {
        modelAttempted: this.primaryModel,
        fallbackModel: this.fallbackModel
      });
    }

    const json = parseJsonContent(content);
    if (input.mode === "concise") {
      const validated = conciseOutputSchema.safeParse(json);

      if (!validated.success) {
        throw new ApiError(
          "AI_RESPONSE_INVALID",
          "Qwen response did not match the required schema",
          502,
          {
            modelAttempted: this.primaryModel,
            fallbackModel: this.fallbackModel
          }
        );
      }

      return validated.data;
    }

    if (methodology === "legacy") {
      const validated = learningOutputSchema.safeParse(json);

      if (!validated.success) {
        throw new ApiError(
          "AI_RESPONSE_INVALID",
          "Qwen response did not match the required schema",
          502,
          {
            modelAttempted: this.primaryModel,
            fallbackModel: this.fallbackModel
          }
        );
      }

      return validated.data;
    }

    const validated = learningInternalOutputSchema.safeParse(json);

    if (!validated.success) {
      throw new ApiError(
        "AI_RESPONSE_INVALID",
        "Qwen response did not match the required schema",
        502,
        {
          modelAttempted: this.primaryModel,
          fallbackModel: this.fallbackModel
        }
      );
    }

    return mapLearningInternalOutput(validated.data);
  }
}
