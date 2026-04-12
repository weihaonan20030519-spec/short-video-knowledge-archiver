import type {
  AnalyzeDecision,
  AnalyzeRenderableOutput,
  AnalyzeRequest,
  AnalyzeResponse
} from "../../../../shared/src/analysis/analyzeContracts.js";
import type { AnalysisProvider } from "../transcription/analysisProvider.js";
import {
  buildContentHash,
  buildDecisionContextHash,
  buildModelContextHash,
  buildPresentationHash
} from "./cache/cacheKeys.js";
import { resolveAnalyzeKeyConfig } from "./config/keyResolver.js";
import { modelResultCache, type ModelResultCacheStore, buildModelResultCacheKey } from "./cache/modelResultCache.js";
import {
  buildRuleDecisionCacheKey,
  ruleDecisionCache,
  type RuleDecisionCacheEntry,
  type RuleDecisionCacheStore
} from "./cache/ruleDecisionCache.js";
import {
  scoreAnalyzeDecisionSignals,
  type AnalyzeDecisionSignals
} from "./decision/confidenceScorer.js";
import { resolveReviewDecision } from "./decision/reviewPolicy.js";
import { resolveEscalationDecision } from "./decision/escalationPolicy.js";

interface AnalysisOrchestratorDependencies {
  provider: AnalysisProvider;
  ruleDecisionCache?: RuleDecisionCacheStore;
  modelResultCache?: ModelResultCacheStore;
  scoreSignals?: (input: AnalyzeRequest) => AnalyzeDecisionSignals;
  resolveReviewDecision?: (
    input: AnalyzeRequest,
    signals: AnalyzeDecisionSignals,
    keyConfig: ReturnType<typeof resolveAnalyzeKeyConfig>
  ) => RuleDecisionCacheEntry | null;
  resolveEscalationDecision?: (
    signals: AnalyzeDecisionSignals,
    keyConfig: ReturnType<typeof resolveAnalyzeKeyConfig>
  ) => RuleDecisionCacheEntry;
}

function buildGeneratedAt() {
  return new Date().toISOString();
}

function buildAnalyzeDecision(entry: RuleDecisionCacheEntry): AnalyzeDecision {
  return {
    routeAction: entry.routeAction,
    reasonCode: entry.reasonCode
  };
}

export function createAnalysisOrchestrator(dependencies: AnalysisOrchestratorDependencies) {
  const activeRuleDecisionCache = dependencies.ruleDecisionCache || ruleDecisionCache;
  const activeModelResultCache = dependencies.modelResultCache || modelResultCache;
  const scoreSignals = dependencies.scoreSignals || scoreAnalyzeDecisionSignals;
  const decideReview = dependencies.resolveReviewDecision || resolveReviewDecision;
  const decideEscalation = dependencies.resolveEscalationDecision || resolveEscalationDecision;

  return {
    async analyze(input: AnalyzeRequest): Promise<AnalyzeResponse> {
      const keyConfig = resolveAnalyzeKeyConfig(input.mode, dependencies.provider.name);
      const contentHash = buildContentHash(input.rawText);
      const decisionContextHash = buildDecisionContextHash({
        mode: input.mode,
        sourcePlatform: input.sourcePlatform,
        policyVersion: keyConfig.policyVersion,
        decisionVersion: keyConfig.decisionVersion
      });
      const modelContextHash = buildModelContextHash({
        mode: input.mode,
        appLanguage: input.appLanguage,
        title: input.title,
        sourcePlatform: input.sourcePlatform,
        originalUrl: input.originalUrl,
        provider: keyConfig.provider,
        model: keyConfig.model,
        promptVersion: keyConfig.promptVersion
      });
      const presentationHash = buildPresentationHash({
        mode: input.mode,
        appLanguage: input.appLanguage,
        presentationVersion: keyConfig.presentationVersion
      });
      void presentationHash;

      const decisionCacheKey = buildRuleDecisionCacheKey(contentHash, decisionContextHash);
      let cachedDecision = activeRuleDecisionCache.get(decisionCacheKey);

      if (!cachedDecision) {
        const signals = scoreSignals(input);
        cachedDecision =
          decideReview(input, signals, keyConfig) ||
          decideEscalation(signals, keyConfig);

        activeRuleDecisionCache.set(decisionCacheKey, cachedDecision);
      }

      const decision = buildAnalyzeDecision(cachedDecision);

      if (cachedDecision.routeAction === "return_review") {
        return {
          success: true,
          outcome: "needs_review",
          data: null,
          review: cachedDecision.review!,
          error: null,
          meta: {
            mode: input.mode,
            source: "local",
            generatedAt: buildGeneratedAt(),
            decision
          }
        };
      }

      const modelCacheKey = buildModelResultCacheKey(contentHash, modelContextHash);
      const cachedModelResult = activeModelResultCache.get(modelCacheKey);

      if (cachedModelResult) {
        return {
          success: true,
          outcome: "resolved",
          data: cachedModelResult.data,
          review: null,
          error: null,
          meta: {
            mode: input.mode,
            source: cachedModelResult.source,
            generatedAt: cachedModelResult.generatedAt,
            decision: cachedModelResult.decision
          }
        };
      }

      const data = await dependencies.provider.analyze(input);
      const generatedAt = buildGeneratedAt();
      const cacheEntry = {
        data: data as AnalyzeRenderableOutput,
        generatedAt,
        source: "model" as const,
        decision
      };
      activeModelResultCache.set(modelCacheKey, cacheEntry);

      return {
        success: true,
        outcome: "resolved",
        data,
        review: null,
        error: null,
        meta: {
          mode: input.mode,
          source: "model",
          generatedAt,
          decision
        }
      };
    }
  };
}
