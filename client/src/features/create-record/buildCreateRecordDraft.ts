import { buildRecordTitle } from "../../lib/title";
import { detectPlatform, extractLinkTitle } from "../../lib/platform";
import { buildRecordImportSnapshot } from "../../services/import/importCoordinator";
import type { ImportResult } from "../../services/import/importTypes";
import { buildMediaAssetFromTranscriptionResult } from "../../services/mediaAsset/mediaAssetMapper";
import type { ClientTranscriptionResult } from "../../services/transcription/transcriptionTypes";
import type {
  ContentCompleteness,
  InputMethod,
  MediaAsset,
  RecordItem,
  SourcePlatform,
  SourceType,
  TranscriptMeta,
  TranscriptionStatus
} from "../../types/domain";
import type { CreateRecordValues } from "../../types/forms";
import { mapUiModeToInputMethod, type CreateRecordUiMode } from "./createRecordUiMode";

export interface CreateRecordDraft {
  createdAt: string;
  title: string;
  originalContent: string;
  originalUrl: string | null;
  inputMethod: InputMethod;
  folderId: string | null;
  tagNames: string[];
  sourcePlatform: SourcePlatform;
  sourceType: SourceType;
  contentCompleteness: ContentCompleteness;
  transcriptionStatus: TranscriptionStatus;
  transcriptMeta: TranscriptMeta | null;
  mediaAsset: MediaAsset;
  importSummary: RecordItem["importSummary"];
}

function deriveSourceType(
  uiMode: CreateRecordUiMode,
  transcriptionResult: ClientTranscriptionResult | null
): SourceType {
  if (transcriptionResult?.sourceType) {
    return transcriptionResult.sourceType;
  }

  if (uiMode === "paste_link" || uiMode === "browser_import") {
    return "link";
  }

  if (uiMode === "blank") {
    return "manual";
  }

  return "text";
}

function deriveContentCompleteness(
  originalContent: string,
  importSummary: RecordItem["importSummary"],
  transcriptionResult: ClientTranscriptionResult | null
): ContentCompleteness {
  if (transcriptionResult != null) {
    return originalContent.trim() ? "full" : "none";
  }

  if (importSummary?.contentCompleteness === "full") {
    return "full";
  }

  if (importSummary?.contentCompleteness === "partial") {
    return "partial";
  }

  return originalContent.trim() ? "minimal" : "none";
}

function resolveOriginalUrl(userOriginalUrl: string | undefined, snapshotOriginalUrl: string | null) {
  const trimmedUrl = userOriginalUrl?.trim();
  return trimmedUrl ? trimmedUrl : snapshotOriginalUrl;
}

function resolveSourcePlatform(
  originalUrl: string | null,
  snapshotPlatform: SourcePlatform
): SourcePlatform {
  return snapshotPlatform !== "unknown" ? snapshotPlatform : detectPlatform(originalUrl);
}

export function buildCreateRecordDraft(input: {
  uiMode: CreateRecordUiMode;
  values: CreateRecordValues;
  importResult: ImportResult | null;
  transcriptionResult: ClientTranscriptionResult | null;
  createdAt?: string;
}): CreateRecordDraft {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const importSnapshot = buildRecordImportSnapshot(input.importResult);
  const inputMethod = mapUiModeToInputMethod(input.uiMode);
  const originalUrl =
    inputMethod === "link"
      ? resolveOriginalUrl(input.values.originalUrl, importSnapshot.originalUrl)
      : null;
  const userContent = input.values.content ?? "";
  const originalContent =
    userContent.trim()
      ? userContent
      : input.transcriptionResult?.transcriptText ||
        importSnapshot.detectedContent ||
        "";
  const sourcePlatform =
    inputMethod === "link"
      ? resolveSourcePlatform(originalUrl, importSnapshot.platform)
      : importSnapshot.platform;
  const sourceType = deriveSourceType(input.uiMode, input.transcriptionResult);
  const contentCompleteness = deriveContentCompleteness(
    originalContent,
    importSnapshot.importSummary,
    input.transcriptionResult
  );
  const title = buildRecordTitle({
    userTitle: input.values.title,
    linkTitle:
      input.uiMode === "upload"
        ? input.transcriptionResult?.suggestedTitle || importSnapshot.detectedTitle || undefined
        : importSnapshot.detectedTitle || extractLinkTitle(originalUrl) || undefined,
    content: originalContent,
    createdAt
  });
  const tagNames =
    input.values.tagsText
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) || [];

  return {
    createdAt,
    title,
    originalContent,
    originalUrl,
    inputMethod,
    folderId: input.values.folderId || null,
    tagNames,
    sourcePlatform,
    sourceType,
    contentCompleteness,
    transcriptionStatus: input.transcriptionResult?.transcriptionStatus || "idle",
    transcriptMeta: input.transcriptionResult?.transcriptMeta || null,
    mediaAsset: buildMediaAssetFromTranscriptionResult(input.transcriptionResult),
    importSummary: importSnapshot.importSummary
  };
}
