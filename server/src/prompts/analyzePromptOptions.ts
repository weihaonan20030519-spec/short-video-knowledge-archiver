export type AnalyzePromptMethodology = "legacy" | "restructured";
export type AnalyzePromptInputVariant = "raw_text_only" | "audited_layers";

export interface AnalyzePromptBuildOptions {
  methodology?: AnalyzePromptMethodology;
  inputVariant?: AnalyzePromptInputVariant;
}
