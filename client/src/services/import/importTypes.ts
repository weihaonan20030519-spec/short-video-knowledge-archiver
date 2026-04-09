export type ImportSource =
  | "link_bilibili_server"
  | "link_generic"
  | "browser_context"
  | "manual_text"
  | "manual_empty";

export type ImportPlatform = "bilibili" | "other" | "unknown";

export type ImportOutcome =
  | "complete"
  | "partial"
  | "needs_user_input"
  | "failed_but_creatable";

export type ImportIssueCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PLATFORM"
  | "NO_SUBTITLE_TRACK"
  | "SUBTITLE_FETCH_FAILED"
  | "SUBTITLE_BODY_FETCH_FAILED"
  | "SUBTITLE_BODY_EMPTY"
  | "SUBTITLE_BODY_PARSE_FAILED"
  | "SELECTED_TRACK_REFETCH_FAILED"
  | "FALLBACK_TO_VISIBLE_TEXT"
  | "SUBTITLE_TRACK_UNAVAILABLE"
  | "SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE"
  | "VISIBLE_CAPTION_ONLY"
  | "TRANSCRIPT_NOT_FOUND"
  | "TRANSCRIPT_TOO_SHORT"
  | "SECURITY_BLOCKED"
  | "TOO_MANY_REDIRECTS"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "CONTENT_TOO_LARGE"
  | "EXTRACTION_EMPTY"
  | "META_ONLY"
  | "OCR_NOT_ATTEMPTED"
  | "OCR_PROVIDER_UNAVAILABLE"
  | "OCR_RATE_LIMITED"
  | "OCR_SERVICE_UNAVAILABLE"
  | "OCR_BAD_REQUEST"
  | "OCR_UNKNOWN_ERROR"
  | "OCR_NO_TEXT_DETECTED"
  | "MANUAL_COMPLETION_REQUIRED"
  | "COOKIE_REQUIRED_POSSIBLE"
  | "MULTIPLE_TRACKS_NEED_SELECTION"
  | "FETCH_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type ImportFlowState =
  | "idle"
  | "detecting_platform"
  | "fetching_remote_content"
  | "awaiting_track_selection"
  | "ready_complete"
  | "ready_partial"
  | "ready_manual_completion"
  | "error_but_can_continue";

export type ImportContentCompleteness = "full" | "partial" | "empty";
export type ImportTrackContentSource = "full_track" | "visible_caption" | "page_text" | "unavailable";
export type LinkImportCoverageLevel = "full" | "partial" | "limited" | "minimal";
export type LinkImportOcrStatus =
  | "not_applicable"
  | "not_attempted"
  | "provider_unavailable"
  | "attempted_no_text"
  | "partial"
  | "successful";
export type LinkImportCandidateSelectionReason =
  | "limited_by_cap"
  | "filtered_non_body_images"
  | "partial_page_signals_only";

export interface ImportTrack {
  id: string;
  label: string;
  language?: string | null;
  isAiSubtitle?: boolean | null;
  subtitleUrl?: string | null;
  contentSource?: ImportTrackContentSource | null;
  cueCount?: number | null;
  bodyLoadStatus?: "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable" | null;
}

export interface ImportWarning {
  code: ImportIssueCode;
  message: string;
}

export interface ImportSourceSignals {
  hasHtmlText?: boolean;
  hasImageOcrText?: boolean;
  isSummaryOnly?: boolean;
}

export interface ImportSummary {
  outcome: ImportOutcome;
  contentCompleteness: ImportContentCompleteness;
  source?: ImportSource;
  sourceSignals?: ImportSourceSignals | null;
}

export interface ImportResult {
  source: ImportSource;
  platform: ImportPlatform;
  outcome: ImportOutcome;
  originalUrl: string | null;
  detectedTitle: string | null;
  detectedContent: string | null;
  contentCompleteness: ImportContentCompleteness;
  availableTracks: ImportTrack[];
  selectedTrackId: string | null;
  warnings: ImportWarning[];
  canCreateRecord: boolean;
  shouldPromptManualInput: boolean;
  linkExtractionReport?: {
    extractionSources: Array<"html_text" | "meta_excerpt" | "image_ocr">;
    hasHtmlText: boolean;
    hasImageOcrText: boolean;
    htmlTextLength: number;
    imageSignalsFound: number;
    candidateImagesSelected: number;
    ocrAttemptLimit: number;
    candidateSelectionReasons: LinkImportCandidateSelectionReason[];
    imageOcrAttempted: number;
    imageOcrSucceeded: number;
    imageOcrFailed: number;
    imageOcrTextLength: number;
    coverageLevel: LinkImportCoverageLevel;
    ocrStatus: LinkImportOcrStatus;
  };
  trackContentById?: Record<string, string>;
  debugMeta?: {
    bvid?: string;
    cid?: string;
    usedCookie?: boolean;
    fetchStrategy?: string;
    notes?: string[];
  };
}

export interface ImportSession {
  flowState: ImportFlowState;
  result: ImportResult | null;
}
