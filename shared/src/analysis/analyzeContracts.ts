export const SOURCE_PLATFORMS = ["tiktok", "bilibili", "xiaohongshu", "other", "unknown"] as const;
export const ANALYZE_MODES = ["concise", "learning"] as const;
export const APP_LANGUAGES = ["zh-CN", "en"] as const;
export const HIGHLIGHT_TONES = ["core", "method", "action", "warning"] as const;

export const ANALYZE_DECISION_ROUTE_ACTIONS = [
  "resolve_local",
  "return_review",
  "call_model"
] as const;

export const ANALYZE_OUTCOMES = ["resolved", "needs_review", "failed"] as const;
export const ANALYZE_RECOMMENDED_ACTIONS = ["edit_source_text", "retry_analysis"] as const;
export const ANALYZE_DECISION_REASON_CODES = [
  "local_rule_matched",
  "source_text_needs_review",
  "model_required"
] as const;
export const ANALYZE_REVIEW_REASON_CODES = ["source_text_needs_review"] as const;
export const ANALYZE_ERROR_CODES = [
  "RAW_TEXT_REQUIRED",
  "TEXT_TOO_SHORT",
  "AI_RESPONSE_INVALID",
  "AI_REQUEST_FAILED",
  "INTERNAL_ERROR"
] as const;

export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];
export type AnalyzeMode = (typeof ANALYZE_MODES)[number];
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export type HighlightTone = (typeof HIGHLIGHT_TONES)[number];
export type AnalyzeDecisionRouteAction = (typeof ANALYZE_DECISION_ROUTE_ACTIONS)[number];
export type AnalyzeOutcome = (typeof ANALYZE_OUTCOMES)[number];
export type AnalyzeMetaSource = "local" | "model";
export type AnalyzeRecommendedAction = (typeof ANALYZE_RECOMMENDED_ACTIONS)[number];
export type AnalyzeDecisionReasonCode = (typeof ANALYZE_DECISION_REASON_CODES)[number];
export type AnalyzeReviewReasonCode = (typeof ANALYZE_REVIEW_REASON_CODES)[number];
export type AnalyzeErrorCode = (typeof ANALYZE_ERROR_CODES)[number];

export interface TextHighlight {
  text: string;
  tone: HighlightTone;
}

export interface ConciseHighlights {
  summary?: TextHighlight[];
  bullets?: TextHighlight[];
}

export interface LearningHighlights {
  coreConclusion?: TextHighlight[];
  logicFramework?: TextHighlight[];
  keyDetails?: TextHighlight[];
  reusablePoints?: TextHighlight[];
}

export interface ConciseOutput {
  summary: string;
  bullets: string[];
  highlights?: ConciseHighlights;
}

export interface LearningOutput {
  coreConclusion: string;
  logicFramework: string[];
  keyDetails: string[];
  reusablePoints: string[];
  highlights?: LearningHighlights;
}

export type AnalyzeRenderableOutput = ConciseOutput | LearningOutput;

export interface AnalyzeRequest {
  mode: AnalyzeMode;
  appLanguage: AppLanguage;
  title?: string;
  sourcePlatform: SourcePlatform;
  originalUrl: string | null;
  rawText: string;
}

export interface AnalyzeDecision {
  routeAction: AnalyzeDecisionRouteAction;
  reasonCode: AnalyzeDecisionReasonCode;
}

export interface AnalyzeResponseMeta {
  mode: AnalyzeMode;
  source?: AnalyzeMetaSource | null;
  generatedAt: string;
  decision: AnalyzeDecision;
}

export interface AnalyzeReview {
  reasonCode: AnalyzeReviewReasonCode;
  recommendedAction?: AnalyzeRecommendedAction;
}

export interface AnalyzeResolvedResponse<T = AnalyzeRenderableOutput> {
  success: true;
  outcome: "resolved";
  data: T;
  review: null;
  error: null;
  meta: AnalyzeResponseMeta;
}

export interface AnalyzeNeedsReviewResponse {
  success: true;
  outcome: "needs_review";
  data: null;
  review: AnalyzeReview;
  error: null;
  meta: AnalyzeResponseMeta;
}

export interface AnalyzeFailedResponse {
  success: false;
  outcome: "failed";
  data: null;
  review: null;
  error: {
    code: AnalyzeErrorCode;
    message: string;
  };
  meta: AnalyzeResponseMeta;
}

export type AnalyzeResponse<T = AnalyzeRenderableOutput> =
  | AnalyzeResolvedResponse<T>
  | AnalyzeNeedsReviewResponse
  | AnalyzeFailedResponse;
