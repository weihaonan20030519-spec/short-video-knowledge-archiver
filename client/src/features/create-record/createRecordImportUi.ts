import { getImportUiMessages, type MessageDictionary } from "../../lib/i18n";
import type { AppLanguage } from "../../types/domain";
import type {
  ImportResult,
  ImportSession,
  LinkImportCoverageLevel,
  LinkImportOcrStatus
} from "../../services/import/importTypes";

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

export interface PasteLinkImportSummary {
  hasHtmlText: boolean;
  hasImageOcrText: boolean;
  imageSignalsFound: number;
  candidateImagesSelected: number;
  coverageLevel: LinkImportCoverageLevel;
  ocrStatus: LinkImportOcrStatus;
  hasImageCoverageGap: boolean;
  isLikelyIncomplete: boolean;
  shouldSuggestSupplement: boolean;
}

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

export function derivePasteLinkImportSummary(result: ImportResult | null): PasteLinkImportSummary | null {
  const report = result?.linkExtractionReport;

  if (!result || !report) {
    return null;
  }

  const hasImageCoverageGap =
    report.imageSignalsFound > report.candidateImagesSelected ||
    (report.candidateImagesSelected > 0 &&
      !report.hasImageOcrText &&
      report.ocrStatus !== "successful" &&
      report.ocrStatus !== "not_applicable");

  const isLikelyIncomplete = report.coverageLevel !== "full" || hasImageCoverageGap || !report.hasHtmlText;
  const shouldSuggestSupplement =
    isLikelyIncomplete ||
    report.ocrStatus === "provider_unavailable" ||
    report.ocrStatus === "not_attempted" ||
    report.ocrStatus === "attempted_no_text";

  return {
    hasHtmlText: report.hasHtmlText,
    hasImageOcrText: report.hasImageOcrText,
    imageSignalsFound: report.imageSignalsFound,
    candidateImagesSelected: report.candidateImagesSelected,
    coverageLevel: report.coverageLevel,
    ocrStatus: report.ocrStatus,
    hasImageCoverageGap,
    isLikelyIncomplete,
    shouldSuggestSupplement
  };
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
  result: ImportResult,
  summary: PasteLinkImportSummary,
  language: AppLanguage
) {
  const importText = getImportUiMessages(language);
  const report = result.linkExtractionReport;

  if (!report) {
    return null;
  }

  const found = summary.imageSignalsFound;
  const selected = summary.candidateImagesSelected;
  const reasons = new Set(report.candidateSelectionReasons);

  if (found > selected) {
    if (reasons.has("limited_by_cap")) {
      return summary.ocrStatus === "provider_unavailable"
        ? importText.ocrProviderUnavailableCappedHint(found, selected)
        : importText.ocrNotAttemptedCappedHint(found, selected);
    }

    if (reasons.has("filtered_non_body_images")) {
      return summary.ocrStatus === "provider_unavailable"
        ? importText.ocrProviderUnavailableFilteredHint(found, selected)
        : importText.ocrNotAttemptedFilteredHint(found, selected);
    }

    return importText.ocrPartialSignalsHint(found, selected);
  }

  if (summary.ocrStatus === "provider_unavailable") {
    return importText.ocrProviderUnavailableHint(selected);
  }

  if (summary.ocrStatus === "not_attempted") {
    return importText.ocrNotAttemptedHint(selected);
  }

  if (summary.ocrStatus === "attempted_no_text") {
    return importText.ocrNoTextHint(report.imageOcrAttempted);
  }

  if (summary.hasImageOcrText) {
    return importText.ocrSuccessfulHint(report.imageOcrSucceeded, selected);
  }

  return summary.shouldSuggestSupplement ? importText.insufficient : null;
}

function getNonImageGapHelperMessage(
  summary: PasteLinkImportSummary,
  language: AppLanguage
) {
  const importText = getImportUiMessages(language);

  if (summary.coverageLevel === "partial") {
    return importText.partialHelper;
  }

  if (summary.coverageLevel === "limited" || summary.coverageLevel === "minimal") {
    return summary.hasHtmlText ? importText.insufficientHelper : importText.failedHelper;
  }

  return null;
}

export function getPasteLinkResultPrimaryMessage(result: ImportResult | null, language: AppLanguage) {
  const importText = getImportUiMessages(language);
  const summary = derivePasteLinkImportSummary(result);

  if (!result || !summary) {
    return result?.outcome === "failed_but_creatable" ? importText.failedButCreatable : null;
  }

  if (summary.hasImageOcrText) {
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

  if (summary.hasImageCoverageGap) {
    if (summary.ocrStatus === "provider_unavailable") {
      return importText.htmlOnlyProviderUnavailable;
    }

    if (summary.ocrStatus === "not_attempted") {
      return importText.htmlOnlyNoOcr;
    }

    if (summary.ocrStatus === "attempted_no_text") {
      return importText.insufficient;
    }
  }

  if (summary.coverageLevel === "full") {
    return summary.hasHtmlText ? importText.htmlOnlyReady : importText.complete;
  }

  if (summary.coverageLevel === "partial") {
    return importText.partial;
  }

  if (summary.coverageLevel === "limited" || summary.coverageLevel === "minimal") {
    return importText.insufficient;
  }

  if (result.outcome === "failed_but_creatable") {
    return importText.failedButCreatable;
  }

  return importText.insufficient;
}

export function getPasteLinkHelperMessage(result: ImportResult | null, language: AppLanguage) {
  const summary = derivePasteLinkImportSummary(result);

  if (!result || !summary) {
    return null;
  }

  if (summary.hasImageCoverageGap) {
    return getImageGapHelperMessage(result, summary, language);
  }

  if (summary.shouldSuggestSupplement) {
    return getNonImageGapHelperMessage(summary, language);
  }

  if (hasWarning(result, "META_ONLY")) {
    return getImportUiMessages(language).insufficientHelper;
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
