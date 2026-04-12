import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";
import { buildAnalyzePromptContext } from "./analyzePromptContext.js";
import type { AnalyzePromptBuildOptions } from "./analyzePromptOptions.js";

export function buildConcisePrompt(
  input: AnalyzeRequest,
  options: AnalyzePromptBuildOptions = {}
) {
  const outputLanguage =
    input.appLanguage === "en"
      ? "English"
      : "Simplified Chinese (zh-CN). Do not mix in English unless a product name or source term requires it";
  const methodology = options.methodology ?? "restructured";
  const promptContext = buildAnalyzePromptContext(input, options.inputVariant);

  const systemInstruction =
    methodology === "legacy"
      ? `You organize user-provided short-video notes into concise structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, missing context, examples, data, background, or missing details. If information is limited, keep the output conservative. Do not return any explanation outside the JSON.`
      : `You organize user-provided notes into concise structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, missing context, missing data, author intent, or unstated details. Your method is strict: first identify the final judgment from primary_body, then keep only the minimum mechanism or evidence needed to support it, and suppress background/meta noise unless it is necessary for comprehension. Do not return any explanation outside the JSON.`;

  const requirements =
    methodology === "legacy"
      ? [
          "- summary must be one short paragraph",
          "- bullets must contain 3 to 5 direct points",
          "- use only information from raw text",
          "- do not add information that is not explicitly supported by raw text",
          "- if information is insufficient, keep the result conservative",
          "- all strings must follow the required output language"
        ]
      : [
          "- summary must be one short paragraph that states the final judgment or main takeaway first",
          "- bullets must contain 3 to 5 distinct direct points",
          "- prioritize this order when selecting content: main judgment -> mechanism/why it matters -> strongest supporting evidence or limitation",
          "- use primary_body as the main source of truth",
          "- ocr_supplement may support a term, action, or evidence, but it must not dominate summary",
          "- possible_examples_or_lists may support a point, but they must not become the main takeaway",
          "- background_or_meta must stay background only and must not dominate summary or bullets",
          "- do not let title, report name, time, platform, propagation info, or naming history become the summary",
          "- do not simply restate the title or list the most salient facts without a judgment",
          "- use only information from the supplied text layers",
          "- do not add information that is not explicitly supported by the supplied text",
          "- if information is limited, keep the result conservative",
          "- all strings must follow the required output language"
        ];

  return {
    systemInstruction,
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
      ...requirements,
      "",
      promptContext
    ].join("\n")
  };
}
