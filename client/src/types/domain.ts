import type { ImportSummary } from "../services/import/importTypes";

export type SourcePlatform =
  | "tiktok"
  | "bilibili"
  | "xiaohongshu"
  | "other"
  | "unknown";

export type InputMethod = "upload" | "link" | "text" | "manual";
export type AIStatus = "not_started" | "processing" | "done" | "failed";
export type AnalyzeMode = "concise" | "learning";
export type AppLanguage = "zh-CN" | "en";
export type HighlightTone = "core" | "method" | "action" | "warning";
export type SourceType = "video" | "audio" | "text" | "link" | "manual";
export type MediaAssetStorageMode = "none" | "local_archive_dir";
export type MediaAssetAvailability =
  | "ready"
  | "missing"
  | "permission_required"
  | "write_failed"
  | "not_archived";
export type TranscriptionStatus =
  | "idle"
  | "file_uploaded"
  | "extracting_audio"
  | "transcribing"
  | "transcript_ready"
  | "transcript_needs_review"
  | "transcript_failed";
export type ContentCompleteness = "full" | "partial" | "minimal" | "none";

export interface TranscriptSegment {
  startMs?: number;
  endMs?: number;
  text: string;
}

export interface TranscriptTimestamp {
  startMs: number;
  endMs?: number;
  label: string;
}

export interface TranscriptMeta {
  fileName: string;
  mimeType: string;
  size: number;
  duration?: number;
  language?: string | null;
  segments?: TranscriptSegment[];
  timestamps?: TranscriptTimestamp[];
  provider?: string | null;
  transcriptionModelUsed?: string | null;
  transcriptionModelAttempts?: string[];
  warnings?: string[];
}

export interface MediaAsset {
  storageMode: MediaAssetStorageMode;
  rootId: string | null;
  relativePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  duration: number | null;
  sourceType: Extract<SourceType, "audio" | "video"> | null;
  availability: MediaAssetAvailability;
  lastVerifiedAt: string | null;
  lastKnownError: string | null;
}

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

export interface AIOutputSlot<T = ConciseOutput | LearningOutput> {
  mode: AnalyzeMode;
  generatedAt: string;
  lastEditedAt: string | null;
  originalResult: T;
  currentResult: T;
  version: number;
}

export interface RecordItem {
  id: string;
  title: string;
  sourcePlatform: SourcePlatform;
  sourceType: SourceType;
  inputMethod: InputMethod;
  originalUrl: string | null;
  folderId: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  watchedAt: string | null;
  lastViewedAt: string | null;
  originalContent: string;
  personalNote: string;
  reviewLater: boolean;
  transcriptionStatus: TranscriptionStatus;
  contentCompleteness: ContentCompleteness;
  transcriptMeta?: TranscriptMeta | null;
  mediaAsset?: MediaAsset | null;
  aiStatus: AIStatus;
  aiErrorMessage: string | null;
  aiErrorCode?: "RAW_TEXT_REQUIRED" | "TEXT_TOO_SHORT" | "AI_RESPONSE_INVALID" | "AI_REQUEST_FAILED" | "INTERNAL_ERROR" | null;
  importSummary?: ImportSummary | null;
  currentMode: AnalyzeMode | null;
  aiOutputs: {
    concise: AIOutputSlot<ConciseOutput> | null;
    learning: AIOutputSlot<LearningOutput> | null;
  };
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  isSystem: boolean;
}

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
