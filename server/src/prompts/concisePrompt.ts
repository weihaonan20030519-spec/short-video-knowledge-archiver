import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";

export function buildConcisePrompt(input: AnalyzeRequest) {
  const outputLanguage =
    input.appLanguage === "en"
      ? "English"
      : "Simplified Chinese (zh-CN). Do not mix in English unless a product name or source term requires it";

  return {
    systemInstruction:
      `You organize user-provided short-video notes into concise structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, missing context, examples, data, background, or missing details. If information is limited, keep the output conservative. Do not return any explanation outside the JSON.`,
    userPrompt: [
      "Mode: concise",
      `App language: ${input.appLanguage}`,
      `Title: ${input.title || "N/A"}`,
      `Platform: ${input.sourcePlatform}`,
      `Original URL: ${input.originalUrl || "N/A"}`,
      "",
      "Target JSON shape:",
      '{ "summary": "string", "bullets": ["string", "string", "string"] }',
      "",
      "Requirements:",
      "- summary must be one short paragraph",
      "- bullets must contain 3 to 5 direct points",
      "- use only information from raw text",
      "- do not add information that is not explicitly supported by raw text",
      "- if information is insufficient, keep the result conservative",
      "- all strings must follow the required output language",
      "",
      "Raw text:",
      input.rawText
    ].join("\n")
  };
}
