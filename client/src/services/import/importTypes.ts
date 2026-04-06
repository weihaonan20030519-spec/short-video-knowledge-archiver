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
  | "MANUAL_COMPLETION_REQUIRED"
  | "COOKIE_REQUIRED_POSSIBLE"
  | "MULTIPLE_TRACKS_NEED_SELECTION"
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

export interface ImportSummary {
  outcome: ImportOutcome;
  contentCompleteness: ImportContentCompleteness;
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
