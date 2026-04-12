import type { ImportSummary } from "../services/import/importTypes";
import type {
  AnalyzeMode as SharedAnalyzeMode,
  AppLanguage as SharedAppLanguage,
  ConciseOutput as SharedConciseOutput,
  ConciseHighlights as SharedConciseHighlights,
  HighlightTone as SharedHighlightTone,
  LearningHighlights as SharedLearningHighlights,
  LearningOutput as SharedLearningOutput,
  SourcePlatform as SharedSourcePlatform,
  TextHighlight as SharedTextHighlight
} from "../../../shared/src/analysis/analyzeContracts";

export type SourcePlatform = SharedSourcePlatform;

export type InputMethod = "upload" | "link" | "text" | "manual";
export type AIStatus = "not_started" | "processing" | "done" | "needs_review" | "failed";
export type AnalyzeMode = SharedAnalyzeMode;
export type AppLanguage = SharedAppLanguage;
export type HighlightTone = SharedHighlightTone;
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

export type TextHighlight = SharedTextHighlight;
export type ConciseHighlights = SharedConciseHighlights;
export type LearningHighlights = SharedLearningHighlights;
export type ConciseOutput = SharedConciseOutput;
export type LearningOutput = SharedLearningOutput;

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
