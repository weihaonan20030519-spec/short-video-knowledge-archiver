import type {
  AnalyzeMode,
  AppLanguage,
  ConciseOutput,
  LearningOutput,
  SourcePlatform,
  TranscriptSegment,
  TranscriptTimestamp
} from "./domain";

export type AnalyzeErrorCode =
  | "RAW_TEXT_REQUIRED"
  | "TEXT_TOO_SHORT"
  | "AI_RESPONSE_INVALID"
  | "AI_REQUEST_FAILED"
  | "INTERNAL_ERROR";

export type BilibiliImportErrorCode =
  | "INVALID_BILIBILI_URL"
  | "VIDEO_INFO_UNAVAILABLE"
  | "SUBTITLE_LIST_UNAVAILABLE"
  | "SUBTITLE_TRACK_UNAVAILABLE"
  | "SUBTITLE_UNAVAILABLE"
  | "BILIBILI_REQUEST_FAILED"
  | "INTERNAL_ERROR";

export type ArticleImportErrorCode = "INVALID_URL" | "INTERNAL_ERROR";
export type ArticleImportExtractionMethod = "readability" | "meta_fallback" | "none";
export type ArticleImportWarningCode =
  | "FETCH_FAILED"
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
  | "UNKNOWN_ERROR";
export type ArticleImportExtractionSource = "html_text" | "meta_excerpt" | "image_ocr";
export type ArticleImportOcrStatus =
  | "not_applicable"
  | "not_attempted"
  | "provider_unavailable"
  | "attempted_no_text"
  | "partial"
  | "successful";
export type ArticleImportCoverageLevel = "full" | "partial" | "limited" | "minimal";
export type ArticleImportCandidateSelectionReason =
  | "limited_by_cap"
  | "filtered_non_body_images"
  | "partial_page_signals_only";

export type TranscriptionErrorCode =
  | "INVALID_UPLOAD"
  | "UNSUPPORTED_FILE_FORMAT"
  | "FILE_TOO_LARGE"
  | "AUDIO_EXTRACTION_FAILED"
  | "TRANSCRIPTION_TIMEOUT"
  | "TRANSCRIPTION_QUOTA_EXCEEDED"
  | "TRANSCRIPTION_FAILED"
  | "INTERNAL_ERROR";

export type TranscriptionSourceType = "video" | "audio";
export type TranscriptionPhase =
  | "uploaded"
  | "preprocessing"
  | "transcribing"
  | "transcript_ready"
  | "ai_processing"
  | "completed"
  | "failed";
export type TranscriptionFailureStage = "upload" | "preprocessing" | "transcription" | "unknown";
export type TranscriptionStatus =
  | "idle"
  | "file_uploaded"
  | "extracting_audio"
  | "transcribing"
  | "transcript_ready"
  | "transcript_needs_review"
  | "transcript_failed";

export interface AnalyzeRequestBody {
  mode: AnalyzeMode;
  appLanguage?: AppLanguage;
  title?: string;
  sourcePlatform: SourcePlatform;
  originalUrl: string | null;
  rawText: string;
}

export interface AnalyzeSuccessResponse<T = ConciseOutput | LearningOutput> {
  success: true;
  data: T;
  error: null;
  meta: {
    mode: AnalyzeMode;
    generatedAt: string;
  };
}

export interface AnalyzeFailureResponse {
  success: false;
  data: null;
  error: {
    code: AnalyzeErrorCode;
    message: string;
  };
  meta: {
    mode: AnalyzeMode;
    generatedAt: string;
  };
}

export type AnalyzeResponse<T = ConciseOutput | LearningOutput> =
  | AnalyzeSuccessResponse<T>
  | AnalyzeFailureResponse;

export interface BilibiliImportRequestBody {
  url: string;
  preferredTrackId?: string;
}

export interface ArticleImportRequestBody {
  url: string;
}

export interface ArticleImportWarning {
  code: ArticleImportWarningCode;
  message: string;
}

export interface ArticleImportExtractionReport {
  extractionSources: ArticleImportExtractionSource[];
  hasHtmlText: boolean;
  hasImageOcrText: boolean;
  htmlTextLength: number;
  imageSignalsFound: number;
  candidateImagesSelected: number;
  ocrAttemptLimit: number;
  candidateSelectionReasons: ArticleImportCandidateSelectionReason[];
  imageOcrAttempted: number;
  imageOcrSucceeded: number;
  imageOcrFailed: number;
  imageOcrTextLength: number;
  ocrStatus: ArticleImportOcrStatus;
  coverageLevel: ArticleImportCoverageLevel;
}

export interface ArticleImportData {
  originalUrl: string;
  resolvedUrl: string | null;
  platform: "bilibili" | "xiaohongshu" | "other" | "unknown";
  title: string | null;
  excerpt: string | null;
  contentText: string | null;
  fetchSucceeded: boolean;
  extractionMethod: ArticleImportExtractionMethod;
  extractionReport: ArticleImportExtractionReport;
  warnings: ArticleImportWarning[];
}

export interface ArticleImportSuccessResponse {
  success: true;
  data: ArticleImportData;
  error: null;
}

export interface ArticleImportFailureResponse {
  success: false;
  data: null;
  error: {
    code: ArticleImportErrorCode;
    message: string;
  };
}

export type ArticleImportResponse = ArticleImportSuccessResponse | ArticleImportFailureResponse;

export interface BilibiliSubtitleTrack {
  id: string;
  label: string;
  language: string | null;
  isAiSubtitle: boolean;
  subtitleUrl: string | null;
}

export interface BilibiliImportProbeData {
  title: string | null;
  bvid: string;
  originalUrl: string;
  subtitleTracks: BilibiliSubtitleTrack[];
  selectedTrackId: string | null;
  rawTranscriptText: string;
  normalizedTranscriptText: string;
  sourceMeta: {
    cid: string | null;
    usedCookie: boolean;
    fetchStrategy: string | null;
    playerStrategiesTried: string[];
    subtitleLanguage: string | null;
  };
  debug: {
    selectedTrackReason: "preferred-track" | "auto-priority" | "none";
    availableTrackCount: number;
    failureStage: string | null;
    notes: string[];
  };
}

export interface BilibiliImportSuccessResponse {
  success: true;
  data: BilibiliImportProbeData;
  error: null;
}

export interface BilibiliImportFailureResponse {
  success: false;
  data: BilibiliImportProbeData | null;
  error: {
    code: BilibiliImportErrorCode;
    message: string;
  };
}

export type BilibiliImportResponse = BilibiliImportSuccessResponse | BilibiliImportFailureResponse;

export interface TranscriptionSuccessResponse {
  success: true;
  data: {
    phase: TranscriptionPhase;
    sourceType: TranscriptionSourceType;
    suggestedTitle: string;
    transcriptText: string;
    segments?: TranscriptSegment[];
    timestamps?: TranscriptTimestamp[];
    language?: string | null;
    fileMeta: {
      fileName: string;
      mimeType: string;
      size: number;
      duration?: number;
      transcriptionModelUsed?: string;
      transcriptionModelAttempts?: string[];
    };
    transcriptionStatus: TranscriptionStatus;
    warnings: string[];
    transcriptionModelUsed?: string;
    transcriptionModelAttempts?: string[];
  };
  error: null;
}

export interface TranscriptionFailureResponse {
  success: false;
  data: null;
  error: {
    code: TranscriptionErrorCode;
    message: string;
  };
  meta?: {
    phase?: Extract<TranscriptionPhase, "failed">;
    failureStage?: TranscriptionFailureStage;
    transcriptionModelUsed?: string;
    transcriptionModelAttempts?: string[];
  };
}

export type TranscriptionResponse = TranscriptionSuccessResponse | TranscriptionFailureResponse;

export type BrowserContextImportIssueCode =
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

export interface BrowserContextTrackPayload {
  id: string;
  label: string;
  language?: string | null;
  isAiSubtitle?: boolean | null;
  subtitleUrl?: string | null;
  contentText?: string | null;
  contentSource?: "full_track" | "visible_caption" | "page_text" | "unavailable" | null;
  cueCount?: number | null;
  bodyLoadStatus?: "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable" | null;
  bodyLoadError?: string | null;
}

export interface BrowserContextImportTrack {
  id: string;
  label: string;
  language?: string | null;
  isAiSubtitle?: boolean | null;
  subtitleUrl?: string | null;
  contentSource?: "full_track" | "visible_caption" | "page_text" | "unavailable" | null;
  cueCount?: number | null;
  bodyLoadStatus?: "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable" | null;
}

export interface BrowserContextPayload {
  page: {
    title?: string | null;
    url: string;
    platform: "bilibili";
    bvid?: string | null;
    cid?: string | null;
  };
  visibleText?: string | null;
  descriptionText?: string | null;
  visibleCaptionText?: string | null;
  selectedTrackId?: string | null;
  subtitleTracks?: BrowserContextTrackPayload[];
  debug?: {
    notes?: string[];
    fetchStrategy?: string | null;
  };
}

export interface BrowserContextImportResultDto {
  source: "browser_context";
  platform: "bilibili" | "other" | "unknown";
  outcome: "complete" | "partial" | "needs_user_input" | "failed_but_creatable";
  originalUrl: string | null;
  detectedTitle: string | null;
  detectedContent: string | null;
  contentCompleteness: "full" | "partial" | "empty";
  availableTracks: BrowserContextImportTrack[];
  selectedTrackId: string | null;
  warningCodes: BrowserContextImportIssueCode[];
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

export interface BrowserContextImportSessionDescriptor {
  sessionToken: string;
  expiresAt: string;
}

export type BrowserContextImportSessionStatus = "pending" | "ready" | "expired" | "failed";

export interface BrowserContextImportSessionState {
  sessionToken: string;
  status: BrowserContextImportSessionStatus;
  expiresAt: string;
  result: BrowserContextImportResultDto | null;
}

export interface BrowserContextTrackRefetchResponse {
  success: true;
  data: BrowserContextImportSessionState;
  error: null;
}

export interface BrowserContextImportSessionCreateResponse {
  success: true;
  data: BrowserContextImportSessionDescriptor;
  error: null;
}

export interface BrowserContextImportSessionGetResponse {
  success: true;
  data: BrowserContextImportSessionState;
  error: null;
}

export interface BrowserContextImportActiveSessionResponse {
  success: true;
  data: BrowserContextImportSessionDescriptor | null;
  error: null;
}

export interface BrowserContextImportSubmitResponse {
  success: true;
  data: BrowserContextImportSessionState;
  error: null;
}
