import type { AnalyzeKeyConfig } from "../config/keyResolver.js";
import type { AnalyzeDecisionSignals } from "./confidenceScorer.js";
import type { RuleDecisionCacheEntry } from "../cache/ruleDecisionCache.js";

export function resolveEscalationDecision(
  _signals: AnalyzeDecisionSignals,
  keyConfig: AnalyzeKeyConfig
): RuleDecisionCacheEntry {
  return {
    routeAction: "call_model",
    reasonCode: "model_required",
    review: null,
    policyVersion: keyConfig.policyVersion,
    decisionVersion: keyConfig.decisionVersion
  };
}
