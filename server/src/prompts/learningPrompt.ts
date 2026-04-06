import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";

export function buildLearningPrompt(input: AnalyzeRequest) {
  const outputLanguage =
    input.appLanguage === "en"
      ? "English"
      : "Simplified Chinese (zh-CN). Do not mix in English unless a product name or source term requires it";

  return {
    systemInstruction:
      `You organize user-provided short-video notes into study-oriented structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, background, examples, author intent, missing data, or unstated details. If information is limited, keep the output conservative. Do not return any explanation outside the JSON.`,
    userPrompt: [
      "Mode: learning",
      `App language: ${input.appLanguage}`,
      `Title: ${input.title || "N/A"}`,
      `Platform: ${input.sourcePlatform}`,
      `Original URL: ${input.originalUrl || "N/A"}`,
      "",
      "Target JSON shape:",
      '{ "coreConclusion": "string", "logicFramework": ["string"], "keyDetails": ["string"], "reusablePoints": ["string"] }',
      "",
      "Requirements:",
      "- coreConclusion should summarize the main takeaway",
      "- logicFramework should describe the visible structure of the ideas when available",
      "- keyDetails should only include details clearly stated in the text",
      "- reusablePoints should stay conservative and practical",
      "- use only information from raw text",
      "- do not fabricate background, cases, numbers, or author intent",
      "- all strings must follow the required output language",
      "",
      "Raw text:",
      input.rawText
    ].join("\n")
  };
}
