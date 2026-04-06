import { getImportIssueMessage } from "../../lib/i18n";
import type { AppLanguage } from "../../types/domain";
import type {
  BrowserContextImportIssueCode,
  BrowserContextImportResultDto,
  BrowserContextImportSessionState
} from "../../types/api";
import { createBrowserContextSession, getBrowserContextSession } from "./importSessionClient";
import { assessBrowserTranscript } from "./browserTranscriptHeuristics";
import type {
  ImportContentCompleteness,
  ImportIssueCode,
  ImportOutcome,
  ImportResult,
  ImportWarning
} from "./importTypes";

function toWarnings(codes: BrowserContextImportIssueCode[], language: AppLanguage): ImportWarning[] {
  return codes.map((code) => ({
    code,
    message: getImportIssueMessage(code, language)
  }));
}

function mapBrowserContextDto(dto: BrowserContextImportResultDto, language: AppLanguage): ImportResult {
  return {
    source: "browser_context",
    platform: dto.platform,
    outcome: dto.outcome,
    originalUrl: dto.originalUrl,
    detectedTitle: dto.detectedTitle,
    detectedContent: dto.detectedContent,
    contentCompleteness: dto.contentCompleteness,
    availableTracks: dto.availableTracks.map((track) => ({
      id: track.id,
      label: track.label,
      language: track.language,
      isAiSubtitle: track.isAiSubtitle,
      subtitleUrl: track.subtitleUrl,
      contentSource: track.contentSource,
      cueCount: track.cueCount,
      bodyLoadStatus: track.bodyLoadStatus
    })),
    selectedTrackId: dto.selectedTrackId,
    warnings: toWarnings(dto.warningCodes, language),
    canCreateRecord: dto.canCreateRecord,
    shouldPromptManualInput: dto.shouldPromptManualInput,
    trackContentById: dto.trackContentById,
    debugMeta: dto.debugMeta
  };
}

function createFailedBrowserImportResult(language: AppLanguage): ImportResult {
  return {
    source: "browser_context",
    platform: "bilibili",
    outcome: "failed_but_creatable",
    originalUrl: null,
    detectedTitle: null,
    detectedContent: null,
    contentCompleteness: "empty",
    availableTracks: [],
    selectedTrackId: null,
    warnings: toWarnings(["UNKNOWN_ERROR"], language),
    canCreateRecord: true,
    shouldPromptManualInput: true
  };
}

function deriveOutcomeFromCompleteness(completeness: ImportContentCompleteness): ImportOutcome {
  if (completeness === "full") {
    return "complete";
  }

  if (completeness === "partial") {
    return "partial";
  }

  return "needs_user_input";
}

export function applyBrowserTrackSelection(
  result: ImportResult,
  trackId: string,
  language: AppLanguage
): ImportResult {
  if (!result.trackContentById || result.source !== "browser_context") {
    return result;
  }

  const content = result.trackContentById[trackId]?.trim() || "";
  const selectedTrack = result.availableTracks.find((track) => track.id === trackId);
  const transcriptAssessment = assessBrowserTranscript({
    text: content,
    source: selectedTrack?.contentSource || "unavailable",
    cueCount: selectedTrack?.cueCount ?? null
  });
  const contentCompleteness = transcriptAssessment.contentCompleteness;

  const staleBrowserContentCodes: ImportIssueCode[] = [
    "SUBTITLE_BODY_FETCH_FAILED",
    "SUBTITLE_BODY_EMPTY",
    "SUBTITLE_BODY_PARSE_FAILED",
    "SELECTED_TRACK_REFETCH_FAILED",
    "FALLBACK_TO_VISIBLE_TEXT",
    "SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE",
    "VISIBLE_CAPTION_ONLY",
    "TRANSCRIPT_NOT_FOUND",
    "TRANSCRIPT_TOO_SHORT",
    "MANUAL_COMPLETION_REQUIRED"
  ];
  const warningCodes = new Set(
    result.warnings.map((warning) => warning.code).filter((code) => !staleBrowserContentCodes.includes(code))
  );
  warningCodes.add("MULTIPLE_TRACKS_NEED_SELECTION");

  if (!content) {
    warningCodes.add("SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE");
    warningCodes.add("MANUAL_COMPLETION_REQUIRED");
  }

  if (selectedTrack?.bodyLoadStatus === "fetch_failed") {
    warningCodes.add("SUBTITLE_BODY_FETCH_FAILED");
  }

  if (selectedTrack?.bodyLoadStatus === "empty") {
    warningCodes.add("SUBTITLE_BODY_EMPTY");
  }

  if (selectedTrack?.bodyLoadStatus === "parse_failed") {
    warningCodes.add("SUBTITLE_BODY_PARSE_FAILED");
  }

  for (const code of transcriptAssessment.warningCodes) {
    warningCodes.add(code);
  }

  const selectedTrackBodyStatus = content
    ? "loaded"
    : selectedTrack?.bodyLoadStatus === "loaded"
      ? "loaded"
      : selectedTrack?.bodyLoadStatus === "unavailable"
        ? "missing"
        : "fallback";
  const importResultSource =
    selectedTrack?.contentSource === "visible_caption"
      ? "visible_caption"
      : selectedTrack?.contentSource === "page_text"
        ? "visible_text"
        : content
          ? contentCompleteness === "full"
            ? "full_track"
            : "partial_track"
          : "visible_text";
  const nextNotes = [
    ...(result.debugMeta?.notes || []).filter(
      (note) => !note.startsWith("selected_track_body_status:") && !note.startsWith("import_result_source:")
    ),
    `selected_track_body_status:${selectedTrackBodyStatus}`,
    `import_result_source:${importResultSource}`
  ];

  return {
    ...result,
    selectedTrackId: trackId,
    detectedContent: transcriptAssessment.normalizedText || null,
    contentCompleteness,
    outcome:
      result.outcome === "failed_but_creatable"
        ? "failed_but_creatable"
        : deriveOutcomeFromCompleteness(contentCompleteness),
    shouldPromptManualInput: contentCompleteness !== "full",
    warnings: toWarnings(Array.from(warningCodes), language),
    debugMeta: result.debugMeta
      ? {
          ...result.debugMeta,
          notes: nextNotes
        }
      : {
          notes: nextNotes
        }
  };
}

export async function startBrowserContextImportSession() {
  const response = await createBrowserContextSession();
  return response.data;
}

export async function readBrowserContextImportSession(
  sessionToken: string,
  language: AppLanguage
): Promise<BrowserContextImportSessionState & { importResult: ImportResult | null }> {
  const response = await getBrowserContextSession(sessionToken);
  const state = response.data;
  const mappedResult = state.result ? mapBrowserContextDto(state.result, language) : null;

  if (mappedResult) {
    return {
      ...state,
      importResult: mappedResult
    };
  }

  if (state.status === "failed" || state.status === "expired") {
    return {
      ...state,
      importResult: createFailedBrowserImportResult(language)
    };
  }

  return {
    ...state,
    importResult: null
  };
}
