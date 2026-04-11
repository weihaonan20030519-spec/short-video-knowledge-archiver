import type { AnalyzeRequest } from "../../../../../shared/src/analysis/analyzeContracts.js";
import type { AnalyzeKeyConfig } from "../config/keyResolver.js";
import type { AnalyzeDecisionSignals } from "./confidenceScorer.js";
import type { RuleDecisionCacheEntry } from "../cache/ruleDecisionCache.js";

function buildReviewDecision(keyConfig: AnalyzeKeyConfig): RuleDecisionCacheEntry {
  return {
    routeAction: "return_review",
    reasonCode: "source_text_needs_review",
    review: {
      reasonCode: "source_text_needs_review",
      recommendedAction: "edit_source_text"
    },
    policyVersion: keyConfig.policyVersion,
    decisionVersion: keyConfig.decisionVersion
  };
}

export function resolveReviewDecision(
  input: AnalyzeRequest,
  signals: AnalyzeDecisionSignals,
  keyConfig: AnalyzeKeyConfig
): RuleDecisionCacheEntry | null {
  if (input.mode === "learning") {
    if (signals.sufficiency === "insufficient") {
      return buildReviewDecision(keyConfig);
    }

    if (signals.sufficiency === "borderline" && signals.ambiguity === "high") {
      return buildReviewDecision(keyConfig);
    }
  }

  if (input.mode === "concise" && signals.sufficiency === "insufficient") {
    return buildReviewDecision(keyConfig);
  }

  return null;
}
