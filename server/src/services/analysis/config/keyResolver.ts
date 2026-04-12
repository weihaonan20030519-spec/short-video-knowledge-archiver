import type { AnalyzeMode } from "../../../../../shared/src/analysis/analyzeContracts.js";
import { env, resolveAnalyzeModel } from "../../../utils/env.js";

export interface AnalyzeKeyConfig {
  provider: string;
  model: string;
  policyVersion: string;
  decisionVersion: string;
  promptVersion: string;
  presentationVersion: string;
}

export function resolveAnalyzeKeyConfig(
  mode: AnalyzeMode,
  providerName: string = env.ANALYSIS_PROVIDER
): AnalyzeKeyConfig {
  return {
    provider: providerName,
    model: resolveAnalyzeModel(mode, providerName),
    policyVersion: "analyze-v2-review-policy",
    decisionVersion: "analyze-v1-decision",
    promptVersion: `analyze-v1-${mode}-prompt`,
    presentationVersion: `analyze-v1-${mode}-presentation`
  };
}
