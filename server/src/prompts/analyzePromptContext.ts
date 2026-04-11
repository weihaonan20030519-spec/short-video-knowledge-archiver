import type { AnalyzeRequest } from "../schemas/analyzeSchemas.js";
import { buildAnalyzeInputAudit } from "../services/analysis/inputAudit.js";
import type { AnalyzePromptInputVariant } from "./analyzePromptOptions.js";

function renderSectionValue(value: string | string[] | null) {
  if (value === null) {
    return "N/A";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => `- ${item}`).join("\n") : "N/A";
  }

  return value.trim() || "N/A";
}

export function buildAnalyzePromptContext(
  input: AnalyzeRequest,
  inputVariant: AnalyzePromptInputVariant = "audited_layers"
) {
  if (inputVariant === "raw_text_only") {
    return ["Raw text:", input.rawText].join("\n");
  }

  const audit = buildAnalyzeInputAudit({ rawText: input.rawText });

  return [
    "Input layers and priority:",
    "- primary_body: highest priority. It should determine the main judgment and most of the logic framework.",
    "- ocr_supplement: supporting evidence only. It may clarify a term, action, or evidence, but it must not single-handedly determine coreConclusion.",
    "- possible_examples_or_lists: lower priority. Use only to support a mechanism, pattern, or reusable point. Do not let it dominate the main takeaway.",
    "- background_or_meta: lowest priority. Treat as context only. It must not dominate coreConclusion, summary, logicFramework, or reusablePoints.",
    "",
    "primary_body:",
    renderSectionValue(audit.primaryBody),
    "",
    "ocr_supplement:",
    renderSectionValue(audit.ocrSupplement),
    "",
    "background_or_meta:",
    renderSectionValue(audit.backgroundOrMeta),
    "",
    "possible_examples_or_lists:",
    renderSectionValue(audit.possibleExamplesOrLists),
    "",
    "Full raw text for backup reference only:",
    "- Use this only to verify wording or recover a missing connective when the layered inputs are ambiguous.",
    "- Do not treat full raw text as the primary extraction pool.",
    audit.rawText
  ].join("\n");
}
