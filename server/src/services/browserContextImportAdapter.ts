import {
  browserContextPayloadSchema,
  type BrowserContextImportIssueCode,
  type BrowserContextImportResultDto,
  type BrowserContextPayload
} from "../schemas/browserContextImportSchemas.js";
import {
  assessBrowserTranscript,
  normalizeBrowserTranscriptText,
  type BrowserTranscriptSource
} from "./browserTranscriptHeuristics.js";

function combineFallbackText(descriptionText?: string | null, visibleText?: string | null) {
  const description = normalizeBrowserTranscriptText(descriptionText);
  const visible = normalizeBrowserTranscriptText(visibleText);

  if (description && visible && description !== visible) {
    return `${description}\n\n${visible}`;
  }

  return description || visible;
}

function deriveOutcome(
  contentCompleteness: "full" | "partial" | "empty",
  failed = false
): BrowserContextImportResultDto["outcome"] {
  if (failed) {
    return "failed_but_creatable";
  }

  if (contentCompleteness === "full") {
    return "complete";
  }

  if (contentCompleteness === "partial") {
    return "partial";
  }

  return "needs_user_input";
}

export function adaptBrowserContextPayload(input: unknown): BrowserContextImportResultDto {
  const payload = browserContextPayloadSchema.parse(input);
  return buildBrowserContextImportResult(payload);
}

export function buildBrowserContextImportResult(payload: BrowserContextPayload): BrowserContextImportResultDto {
  const pageUrl = normalizeBrowserTranscriptText(payload.page.url);
  const trackContentById = Object.fromEntries(
    (payload.subtitleTracks || [])
      .map((track) => [track.id, normalizeBrowserTranscriptText(track.contentText)])
      .filter((entry) => entry[1])
  );
  const availableTracks = (payload.subtitleTracks || []).map((track) => ({
    id: track.id,
    label: track.label,
    language: track.language || null,
    isAiSubtitle: Boolean(track.isAiSubtitle),
    subtitleUrl: track.subtitleUrl || null,
    contentSource: track.contentSource || "unavailable",
    cueCount: track.cueCount ?? null,
    bodyLoadStatus: track.bodyLoadStatus || "unavailable"
  }));

  const firstTrackWithContent = Object.entries(trackContentById)[0]?.[0] || null;
  const selectedTrackId =
    payload.selectedTrackId ||
    firstTrackWithContent ||
    availableTracks[0]?.id ||
    null;
  const selectedTrack = availableTracks.find((track) => track.id === selectedTrackId) || null;
  const selectedTrackContent = selectedTrackId ? trackContentById[selectedTrackId] || "" : "";
  const fallbackText = combineFallbackText(payload.descriptionText, payload.visibleText);
  const visibleCaptionText = normalizeBrowserTranscriptText(payload.visibleCaptionText);
  const effectiveContent =
    selectedTrackContent || fallbackText || visibleCaptionText || "";
  const effectiveSource: BrowserTranscriptSource = selectedTrackContent
    ? (selectedTrack?.contentSource || "full_track")
    : fallbackText
      ? "page_text"
      : visibleCaptionText
        ? "visible_caption"
        : "unavailable";
  const transcriptAssessment = assessBrowserTranscript({
    text: effectiveContent,
    source: effectiveSource,
    cueCount: selectedTrack?.cueCount ?? null
  });
  const detectedContent = transcriptAssessment.normalizedText || null;
  const contentCompleteness = transcriptAssessment.contentCompleteness;
  const warningCodes = new Set<BrowserContextImportIssueCode>();

  if (!pageUrl) {
    warningCodes.add("INVALID_URL");
  }

  if (payload.page.platform !== "bilibili") {
    warningCodes.add("UNSUPPORTED_PLATFORM");
  }

  if (availableTracks.length > 1) {
    warningCodes.add("MULTIPLE_TRACKS_NEED_SELECTION");
  }

  if (availableTracks.length === 0) {
    warningCodes.add("SUBTITLE_TRACK_UNAVAILABLE");
  }

  if (availableTracks.length > 0 && !selectedTrackContent) {
    warningCodes.add("SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE");
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

  if (!selectedTrackContent && !fallbackText && !visibleCaptionText) {
    warningCodes.add("TRANSCRIPT_NOT_FOUND");
  }

  if (!detectedContent) {
    warningCodes.add(availableTracks.length > 0 ? "SUBTITLE_FETCH_FAILED" : "NO_SUBTITLE_TRACK");
  }

  const failed = warningCodes.has("INVALID_URL") || warningCodes.has("UNSUPPORTED_PLATFORM");
  const outcome = deriveOutcome(contentCompleteness, failed);
  for (const code of transcriptAssessment.warningCodes) {
    warningCodes.add(code);
  }

  if (!selectedTrackContent && (fallbackText || visibleCaptionText)) {
    warningCodes.add("FALLBACK_TO_VISIBLE_TEXT");
  }

  if (outcome !== "complete") {
    warningCodes.add("MANUAL_COMPLETION_REQUIRED");
  }

  const importResultSource = selectedTrackContent
    ? contentCompleteness === "full"
      ? "full_track"
      : "partial_track"
    : visibleCaptionText && !fallbackText
      ? "visible_caption"
      : "visible_text";
  const selectedTrackBodyStatus = selectedTrackContent
    ? "loaded"
    : selectedTrack && selectedTrack.bodyLoadStatus === "loaded"
      ? "loaded"
      : selectedTrack && selectedTrack.bodyLoadStatus === "unavailable"
        ? "missing"
        : selectedTrack && selectedTrack.bodyLoadStatus
          ? "fallback"
          : "missing";

  return {
    source: "browser_context",
    platform: payload.page.platform === "bilibili" ? "bilibili" : "unknown",
    outcome,
    originalUrl: pageUrl || null,
    detectedTitle: normalizeBrowserTranscriptText(payload.page.title) || null,
    detectedContent,
    contentCompleteness,
    availableTracks,
    selectedTrackId,
    warningCodes: Array.from(warningCodes),
    canCreateRecord: true,
    shouldPromptManualInput: outcome !== "complete",
    trackContentById,
    debugMeta: {
      bvid: normalizeBrowserTranscriptText(payload.page.bvid) || undefined,
      cid: normalizeBrowserTranscriptText(payload.page.cid) || undefined,
      usedCookie: true,
      fetchStrategy: normalizeBrowserTranscriptText(payload.debug?.fetchStrategy) || "browser-context",
      notes: [
        ...(payload.debug?.notes || []),
        `selected_track_body_status:${selectedTrackBodyStatus}`,
        `import_result_source:${importResultSource}`,
        "server_adapted_import_result"
      ]
    }
  };
}
