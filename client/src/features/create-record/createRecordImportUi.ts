import { getImportUiMessages, type MessageDictionary } from "../../lib/i18n";
import type { AppLanguage } from "../../types/domain";
import type { ImportResult, ImportSession } from "../../services/import/importTypes";

export interface BrowserImportUiState {
  status: "idle" | "waiting" | "ready" | "incomplete" | "failed";
}

export type PasteLinkImportUiState =
  | "idle"
  | "detecting"
  | "extracting"
  | "ready_full"
  | "ready_partial"
  | "failed_but_editable";

export function hasDetectedImportContent(result: ImportResult | null) {
  return Boolean(result?.detectedContent?.trim()) && result?.contentCompleteness !== "empty";
}

export function hasMeaningfulImportResult(result: ImportResult | null) {
  return Boolean(
    result &&
      (result.detectedTitle ||
        result.detectedContent ||
        result.originalUrl ||
        result.availableTracks.length > 0 ||
        result.warnings.length > 0)
  );
}

export function isImportResultEmpty(result: ImportResult | null) {
  return !result || (!result.detectedTitle && !result.detectedContent && result.warnings.length === 0);
}

export function getImportStatusTone(flowState: ImportSession["flowState"], result: ImportResult | null) {
  if (flowState === "ready_complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (flowState === "ready_partial" || (flowState === "awaiting_track_selection" && hasDetectedImportContent(result))) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (flowState === "ready_manual_completion") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (flowState === "error_but_can_continue") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getPrimaryImportMessage(session: ImportSession, language: AppLanguage) {
  const importText = getImportUiMessages(language);

  if (session.flowState === "detecting_platform") {
    return importText.detectingPlatform;
  }

  if (session.flowState === "fetching_remote_content") {
    return importText.fetchingRemoteContent;
  }

  if (session.flowState === "awaiting_track_selection") {
    return hasDetectedImportContent(session.result)
      ? importText.multipleTracksAvailable
      : importText.selectTrackRecommended;
  }

  if (session.flowState === "ready_complete") {
    return importText.complete;
  }

  if (session.flowState === "ready_partial") {
    return importText.partial;
  }

  if (session.flowState === "ready_manual_completion") {
    return importText.needsUserInput;
  }

  if (session.flowState === "error_but_can_continue") {
    return importText.failedButCreatable;
  }

  return null;
}

export function derivePasteLinkImportUiState(
  session: ImportSession,
  hasAttemptedLinkImport: boolean
): PasteLinkImportUiState {
  if (!hasAttemptedLinkImport) {
    return "idle";
  }

  if (session.flowState === "detecting_platform") {
    return "detecting";
  }

  if (session.flowState === "fetching_remote_content") {
    return "extracting";
  }

  if (session.flowState === "awaiting_track_selection") {
    return "ready_partial";
  }

  if (session.flowState === "ready_complete") {
    return "ready_full";
  }

  if (session.flowState === "ready_partial" || session.flowState === "ready_manual_completion") {
    return "ready_partial";
  }

  return "failed_but_editable";
}

export function getPasteLinkStatusTone(state: PasteLinkImportUiState) {
  if (state === "ready_full") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (state === "ready_partial") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (state === "failed_but_editable") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function getPasteLinkPrimaryMessage(state: PasteLinkImportUiState, language: AppLanguage) {
  const importText = getImportUiMessages(language);

  if (state === "detecting") {
    return importText.detectingPlatform;
  }

  if (state === "extracting") {
    return importText.fetchingRemoteContent;
  }
  return null;
}

export function getPasteLinkAwaitingTrackMessage(session: ImportSession, language: AppLanguage) {
  const importText = getImportUiMessages(language);

  if (session.flowState !== "awaiting_track_selection") {
    return null;
  }

  return hasDetectedImportContent(session.result)
    ? importText.multipleTracksAvailable
    : importText.selectTrackRecommended;
}

function hasWarning(result: ImportResult | null, code: string) {
  return Boolean(result?.warnings.some((warning) => warning.code === code));
}

function getImageGapHelperMessage(
  report: NonNullable<ImportResult["linkExtractionReport"]>,
  language: AppLanguage,
  mode: "not_attempted" | "provider_unavailable"
) {
  const importText = getImportUiMessages(language);
  const found = report.imageSignalsFound;
  const selected = report.candidateImagesSelected;
  const reasons = new Set(report.candidateSelectionReasons);

  if (found > selected && reasons.has("limited_by_cap")) {
    return mode === "provider_unavailable"
      ? importText.ocrProviderUnavailableCappedHint(found, selected)
      : importText.ocrNotAttemptedCappedHint(found, selected);
  }

  if (found > selected && reasons.has("filtered_non_body_images")) {
    return mode === "provider_unavailable"
      ? importText.ocrProviderUnavailableFilteredHint(found, selected)
      : importText.ocrNotAttemptedFilteredHint(found, selected);
  }

  if (reasons.has("partial_page_signals_only") && found > 0 && selected > 0) {
    return importText.ocrPartialSignalsHint(found, selected);
  }

  return mode === "provider_unavailable"
    ? importText.ocrProviderUnavailableHint(selected)
    : importText.ocrNotAttemptedHint(selected);
}

export function getPasteLinkResultPrimaryMessage(result: ImportResult | null, language: AppLanguage) {
  const importText = getImportUiMessages(language);
  const report = result?.linkExtractionReport;

  if (!result || !report) {
    return result?.outcome === "failed_but_creatable" ? importText.failedButCreatable : null;
  }

  if (report.hasImageOcrText) {
    return importText.htmlAndOcr;
  }

  if (hasWarning(result, "META_ONLY")) {
    return importText.metaOnly;
  }

  if (hasWarning(result, "OCR_PROVIDER_UNAVAILABLE")) {
    return importText.htmlOnlyProviderUnavailable;
  }

  if (hasWarning(result, "OCR_NOT_ATTEMPTED")) {
    return importText.htmlOnlyNoOcr;
  }

  if (hasWarning(result, "OCR_NO_TEXT_DETECTED")) {
    return importText.insufficient;
  }

  if (report.candidateImagesSelected > 0 && !report.hasImageOcrText && report.hasHtmlText) {
    return importText.htmlOnlyNoOcr;
  }

  if (report.coverageLevel === "full") {
    return report.hasHtmlText ? importText.htmlOnlyReady : importText.complete;
  }

  if (report.coverageLevel === "partial" || report.coverageLevel === "limited") {
    return importText.partial;
  }

  if (result.outcome === "failed_but_creatable") {
    return importText.failedButCreatable;
  }

  return importText.insufficient;
}

export function getPasteLinkHelperMessage(result: ImportResult | null, language: AppLanguage) {
  const importText = getImportUiMessages(language);
  const report = result?.linkExtractionReport;

  if (!result || !report) {
    return null;
  }

  if (hasWarning(result, "OCR_PROVIDER_UNAVAILABLE")) {
    return getImageGapHelperMessage(report, language, "provider_unavailable");
  }

  if (hasWarning(result, "OCR_NOT_ATTEMPTED")) {
    return getImageGapHelperMessage(report, language, "not_attempted");
  }

  if (hasWarning(result, "OCR_NO_TEXT_DETECTED")) {
    return importText.ocrNoTextHint(report.imageOcrAttempted);
  }

  if (report.hasImageOcrText) {
    return importText.ocrSuccessfulHint(report.imageOcrSucceeded, report.candidateImagesSelected);
  }

  if (hasWarning(result, "META_ONLY")) {
    return importText.metaOnly;
  }

  if (report.coverageLevel === "limited" || report.coverageLevel === "minimal") {
    return importText.insufficient;
  }

  return null;
}

export function getBrowserImportMessage(
  t: MessageDictionary,
  browserImportState: BrowserImportUiState
) {
  if (browserImportState.status === "waiting") {
    return t.modals.browserImport.waitingDescription;
  }

  if (browserImportState.status === "ready") {
    return t.modals.browserImport.ready;
  }

  if (browserImportState.status === "incomplete") {
    return t.modals.browserImport.incomplete;
  }

  if (browserImportState.status === "failed") {
    return t.modals.browserImport.failed;
  }

  return t.modals.browserImport.waitingDescription;
}

export function deriveBrowserImportTerminalStatus(
  result: ImportResult | null
): Exclude<BrowserImportUiState["status"], "idle" | "waiting"> {
  if (!result || result.outcome === "failed_but_creatable") {
    return "failed";
  }

  if (result.outcome === "complete") {
    return "ready";
  }

  return "incomplete";
}
