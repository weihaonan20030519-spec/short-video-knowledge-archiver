import type { AppLanguage, InputMethod, SourcePlatform } from "../../types/domain";
import type { BilibiliImportProbeData, BilibiliImportResponse } from "../../types/api";
import { detectPlatform, extractLinkTitle } from "../../lib/platform";
import { getImportIssueMessage } from "../../lib/i18n";
import {
  applyBrowserTrackSelection,
  readBrowserContextImportSession,
  startBrowserContextImportSession
} from "./browserContextImportService";
import { importBilibiliLink } from "./bilibiliLinkImportService";
import {
  assessContentCompleteness,
  createGenericLinkImportResult,
  createManualImportResult
} from "./manualImportService";
import type {
  ImportFlowState,
  ImportIssueCode,
  ImportPlatform,
  ImportResult,
  ImportSession,
  ImportSummary,
  ImportTrack,
  ImportWarning
} from "./importTypes";

interface ResolveImportOptions {
  inputMethod: InputMethod;
  originalUrl?: string | null;
  content?: string | null;
  preferredTrackId?: string | null;
  appLanguage: AppLanguage;
}

export interface RecordImportSnapshot {
  platform: SourcePlatform;
  originalUrl: string | null;
  detectedTitle: string | null;
  detectedContent: string | null;
  importSummary: ImportSummary | null;
}

function createProcessFailureResult(
  originalUrl: string,
  language: AppLanguage,
  code: ImportIssueCode = "NETWORK_ERROR"
): ImportResult {
  return {
    source: "link_bilibili_server",
    platform: "bilibili",
    outcome: "failed_but_creatable",
    originalUrl,
    detectedTitle: extractLinkTitle(originalUrl) || null,
    detectedContent: null,
    contentCompleteness: "empty",
    availableTracks: [],
    selectedTrackId: null,
    warnings: [
      {
        code,
        message: getImportIssueMessage(code, language)
      }
    ],
    canCreateRecord: true,
    shouldPromptManualInput: true
  };
}

function normalizeImportPlatform(platform: ImportPlatform): SourcePlatform {
  if (platform === "bilibili") {
    return "bilibili";
  }

  if (platform === "other") {
    return "other";
  }

  return "unknown";
}

function mapBilibiliErrorCode(
  response: Extract<BilibiliImportResponse, { success: false }>,
  language: AppLanguage
) {
  const warnings: ImportWarning[] = [];
  const probe = response.data;
  const usedCookie = probe?.sourceMeta.usedCookie ?? false;

  const pushWarning = (code: ImportIssueCode) => {
    warnings.push({
      code,
      message: getImportIssueMessage(code, language)
    });
  };

  if (response.error.code === "INVALID_BILIBILI_URL") {
    pushWarning("INVALID_URL");
    return {
      warnings,
      outcome: "failed_but_creatable" as const
    };
  }

  if (response.error.code === "BILIBILI_REQUEST_FAILED") {
    pushWarning("NETWORK_ERROR");
    return {
      warnings,
      outcome: "failed_but_creatable" as const
    };
  }

  if (response.error.code === "SUBTITLE_LIST_UNAVAILABLE" || response.error.code === "SUBTITLE_TRACK_UNAVAILABLE") {
    pushWarning("SUBTITLE_FETCH_FAILED");
    if (!usedCookie) {
      pushWarning("COOKIE_REQUIRED_POSSIBLE");
    }

    return {
      warnings,
      outcome: "failed_but_creatable" as const
    };
  }

  if (response.error.code === "SUBTITLE_UNAVAILABLE") {
    if (!usedCookie) {
      pushWarning("COOKIE_REQUIRED_POSSIBLE");
      return {
        warnings,
        outcome: "failed_but_creatable" as const
      };
    }

    pushWarning("NO_SUBTITLE_TRACK");
    return {
      warnings,
      outcome: "needs_user_input" as const
    };
  }

  pushWarning("UNKNOWN_ERROR");
  return {
    warnings,
    outcome: "failed_but_creatable" as const
  };
}

function mapProbeTracks(probe: BilibiliImportProbeData | null | undefined): ImportTrack[] {
  return (probe?.subtitleTracks || []).map((track) => ({
    id: track.id,
    label: track.label,
    language: track.language,
    isAiSubtitle: track.isAiSubtitle,
    subtitleUrl: track.subtitleUrl
  }));
}

function mapBilibiliResponse(
  response: BilibiliImportResponse,
  requestedUrl: string,
  language: AppLanguage
): ImportResult {
  const probe = response.data;
  const availableTracks = mapProbeTracks(probe);
  const detectedContent = probe?.normalizedTranscriptText?.trim() || null;
  const detectedTitle = probe?.title?.trim() || extractLinkTitle(requestedUrl) || null;
  const contentCompleteness = assessContentCompleteness(detectedContent);
  const warnings: ImportWarning[] = [];

  if (availableTracks.length > 1) {
    warnings.push({
      code: "MULTIPLE_TRACKS_NEED_SELECTION",
      message: getImportIssueMessage("MULTIPLE_TRACKS_NEED_SELECTION", language)
    });
  }

  let outcome: ImportResult["outcome"];

  if (response.success) {
    outcome =
      contentCompleteness === "full"
        ? "complete"
        : contentCompleteness === "partial"
          ? "partial"
          : "needs_user_input";
  } else {
    const mapped = mapBilibiliErrorCode(response, language);
    warnings.push(...mapped.warnings);
    outcome = mapped.outcome;
  }

  const selectedTrackId = probe?.selectedTrackId || null;
  const hasSelectedTrackContent = Boolean(selectedTrackId && contentCompleteness !== "empty");

  return {
    source: "link_bilibili_server",
    platform: "bilibili",
    outcome,
    originalUrl: probe?.originalUrl || requestedUrl,
    detectedTitle,
    detectedContent,
    contentCompleteness,
    availableTracks,
    selectedTrackId,
    warnings,
    canCreateRecord: true,
    shouldPromptManualInput: outcome !== "complete",
    debugMeta: probe
      ? {
          bvid: probe.bvid,
          cid: probe.sourceMeta.cid || undefined,
          usedCookie: probe.sourceMeta.usedCookie,
          fetchStrategy: probe.sourceMeta.fetchStrategy || undefined,
          notes: probe.debug.notes
        }
      : undefined
  };
}

export function deriveImportFlowState(result: ImportResult | null): ImportFlowState {
  if (!result) {
    return "idle";
  }

  if (result.availableTracks.length > 1) {
    return "awaiting_track_selection";
  }

  if (result.outcome === "complete") {
    return "ready_complete";
  }

  if (result.outcome === "partial") {
    return "ready_partial";
  }

  if (result.outcome === "needs_user_input") {
    return "ready_manual_completion";
  }

  return "error_but_can_continue";
}

export function createImportSession(
  result: ImportResult | null,
  flowState: ImportFlowState = deriveImportFlowState(result)
): ImportSession {
  return {
    result,
    flowState
  };
}

export async function createBrowserImportSession() {
  return startBrowserContextImportSession();
}

export async function resolveBrowserImportSession(
  sessionToken: string,
  appLanguage: AppLanguage
): Promise<ImportSession> {
  const state = await readBrowserContextImportSession(sessionToken, appLanguage);

  if (state.status === "pending" && !state.importResult) {
    return {
      result: null,
      flowState: "fetching_remote_content"
    };
  }

  return createImportSession(state.importResult);
}

export function selectImportTrack(
  result: ImportResult | null,
  trackId: string,
  appLanguage: AppLanguage
): ImportSession {
  if (!result) {
    return createImportSession(null);
  }

  if (result.source === "browser_context") {
    return createImportSession(applyBrowserTrackSelection(result, trackId, appLanguage));
  }

  return createImportSession({
    ...result,
    selectedTrackId: trackId
  });
}

export async function resolveImport(options: ResolveImportOptions): Promise<ImportSession> {
  if (options.inputMethod === "text" || options.inputMethod === "manual") {
    return createImportSession(createManualImportResult(options.content || "", options.appLanguage));
  }

  const trimmedUrl = options.originalUrl?.trim() || "";
  if (!trimmedUrl) {
    return createImportSession(null);
  }

  const platform = detectPlatform(trimmedUrl);
  if (platform !== "bilibili") {
    return createImportSession(createGenericLinkImportResult(trimmedUrl, platform === "other" ? "other" : "unknown", options.appLanguage));
  }

  try {
    const response = await importBilibiliLink(trimmedUrl, options.preferredTrackId || undefined);
    return createImportSession(mapBilibiliResponse(response, trimmedUrl, options.appLanguage));
  } catch {
    return createImportSession(createProcessFailureResult(trimmedUrl, options.appLanguage));
  }
}

export function buildRecordImportSnapshot(importResult: ImportResult | null): RecordImportSnapshot {
  return {
    platform: normalizeImportPlatform(importResult?.platform || "unknown"),
    originalUrl: importResult?.originalUrl || null,
    detectedTitle: importResult?.detectedTitle || null,
    detectedContent: importResult?.detectedContent || null,
    importSummary: importResult
      ? {
          outcome: importResult.outcome,
          contentCompleteness: importResult.contentCompleteness
        }
      : null
  };
}
