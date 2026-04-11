import type {
  AnalyzeDecisionReasonCode,
  AnalyzeDecisionRouteAction,
  AnalyzeReview
} from "../../../../../shared/src/analysis/analyzeContracts.js";

export interface RuleDecisionCacheEntry {
  routeAction: Extract<AnalyzeDecisionRouteAction, "return_review" | "call_model">;
  reasonCode: AnalyzeDecisionReasonCode;
  review: AnalyzeReview | null;
  policyVersion: string;
  decisionVersion: string;
}

export interface RuleDecisionCacheStore {
  get(key: string): RuleDecisionCacheEntry | undefined;
  set(key: string, value: RuleDecisionCacheEntry): void;
  clear(): void;
}

function createMemoryRuleDecisionCacheStore(): RuleDecisionCacheStore {
  const cache = new Map<string, RuleDecisionCacheEntry>();

  return {
    get(key) {
      return cache.get(key);
    },
    set(key, value) {
      cache.set(key, value);
    },
    clear() {
      cache.clear();
    }
  };
}

export function buildRuleDecisionCacheKey(contentHash: string, decisionContextHash: string) {
  return `${contentHash}:${decisionContextHash}`;
}

export const ruleDecisionCache = createMemoryRuleDecisionCacheStore();
