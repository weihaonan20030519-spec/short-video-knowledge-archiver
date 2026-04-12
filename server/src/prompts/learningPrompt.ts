import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";
import { buildAnalyzePromptContext } from "./analyzePromptContext.js";
import type { AnalyzePromptBuildOptions } from "./analyzePromptOptions.js";

export function buildLearningPrompt(
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
      ? `You organize user-provided short-video notes into study-oriented structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, background, examples, author intent, missing data, or unstated details. If information is limited, keep the output conservative. Do not return any explanation outside the JSON.`
      : `You organize user-provided notes into study-oriented structured JSON. The output language is mandatory: ${outputLanguage}. Every natural-language string in the JSON must be written in that language. Use only facts present in the supplied text. Do not infer hidden intent, author intent, missing data, or unstated details. Your method is strict: first extract learning units, then the system will map them into display sections. Determine the main judgment from primary_body, explain why it holds through mechanism/causal structure, keep only decisive evidence, and extract only transferable action rules. Learning mode must read like sharp study material, not like a polished industry-analysis summary. Do not return any explanation outside the JSON.`;

  const guidance =
    methodology === "legacy"
      ? [
          "Requirements:",
          "- coreConclusion should summarize the main takeaway",
          "- logicFramework should describe the visible structure of the ideas when available",
          "- keyDetails should only include details clearly stated in the text",
          "- reusablePoints should stay conservative and practical",
          "- use only information from raw text",
          "- do not fabricate background, cases, numbers, or author intent",
          "- all strings must follow the required output language"
        ]
      : [
          "Generation units you must produce before section mapping:",
          "- claimCore: one sharp judgment kernel. Avoid title-like thesis sentences, stacked modifiers, promotional tone, or stuffing many value points into one sentence.",
          "- claimContrast: optional. State what this claim corrects, distinguishes from, or refuses. Omit it if weak.",
          "- mechanismChain: 1 to 3 why/how steps. Each item should explain a causal link, structural dependency, or mechanism node. Do not write slogan-like summaries.",
          "- decisiveEvidence: only the hardest evidence, limiting condition, or hard difference that proves claimCore. Do not keep representative-but-soft support material.",
          "- actionRules: only transferable action rules, judgment rules, or execution constraints. Prefer 'when X, do Y, avoid Z' or 'prioritize A, not B'. Avoid vague principles.",
          "",
          "How these units will later map to the existing sections:",
          "- coreConclusion will be mapped from claimCore, so make claimCore sharp and memorable rather than polished.",
          "- logicFramework will be mapped from claimContrast plus mechanismChain, so each item must help explain why/how instead of sounding like consulting-summary prose.",
          "- keyDetails will be mapped from decisiveEvidence, so each item must justify the judgment rather than merely represent the topic.",
          "- reusablePoints will be mapped from actionRules, so each item must remain useful after removing the original case.",
          "",
          "Selection rules:",
          "- use primary_body as the main source of truth",
          "- ocr_supplement may clarify a term, action, or evidence, but it must not single-handedly determine coreConclusion",
          "- possible_examples_or_lists are supporting material only and must not become the main takeaway",
          "- background_or_meta is lowest priority and must not dominate coreConclusion, logicFramework, or reusablePoints",
          "- if a learning unit has no reliable content, prefer null or an empty array over fabricated or weak filler",
          "- learning mode must add mechanism or transfer value; it must not read like a slightly longer concise summary",
          "- being related to the topic is not enough to qualify as decisiveEvidence",
          "- if a report title, publication date, concept naming history, source label, or propagation shell only tells where the idea appeared, omit it from decisiveEvidence",
          "- prefer the evidence body over the publication shell: keep what was shown, compared, constrained, or falsified, not the report/title/time wrapper around it",
          "- do not let Full raw text for backup reference pull you back into representative-summary mode; use it only to verify wording when the layered inputs are ambiguous",
          "- use only information from the supplied text layers",
          "- do not fabricate background, cases, numbers, methods, or author intent",
          "- all strings must follow the required output language"
        ];

  return {
    systemInstruction,
    userPrompt: [
      "Mode: learning",
      `App language: ${input.appLanguage}`,
      `Title: ${input.title || "N/A"}`,
      `Platform: ${input.sourcePlatform}`,
      `Original URL: ${input.originalUrl || "N/A"}`,
      "",
      "Target JSON shape:",
      methodology === "legacy"
        ? '{ "coreConclusion": "string", "logicFramework": ["string"], "keyDetails": ["string"], "reusablePoints": ["string"] }'
        : '{ "claimCore": "string", "claimContrast": "string | null", "mechanismChain": ["string"], "decisiveEvidence": ["string"], "actionRules": ["string"] }',
      "",
      ...guidance,
      "",
      promptContext
    ].join("\n")
  };
}
