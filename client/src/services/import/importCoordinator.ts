import type { AppLanguage, InputMethod, SourcePlatform } from "../../types/domain";
import type {
  ArticleImportData,
  ArticleImportExtractionReport,
  ArticleImportResponse,
  BilibiliImportProbeData,
  BilibiliImportResponse
} from "../../types/api";
import { detectPlatform, extractLinkTitle } from "../../lib/platform";
import { getImportIssueMessage } from "../../lib/i18n";
import {
  applyBrowserTrackSelection,
  readBrowserContextImportSession,
  startBrowserContextImportSession
} from "./browserContextImportService";
import { importArticleLink } from "./articleLinkImportService";
import { formatArticleImportedContent } from "./articleImportFormatter";
import { importBilibiliLink } from "./bilibiliLinkImportService";
import {
  assessContentCompleteness,
  createGenericLinkImportResult,
  createManualImportResult
} from "./manualImportService";
import type {
  ImportFlowState,
  ImportIssueCode,
  ImportContentCompleteness,
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

function toImportPlatform(platform: SourcePlatform): ImportPlatform {
  if (platform === "bilibili") {
    return "bilibili";
  }

  if (platform === "other" || platform === "xiaohongshu" || platform === "tiktok") {
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

function mapArticleWarnings(
  warnings: ArticleImportData["warnings"],
  language: AppLanguage
): ImportWarning[] {
  return warnings.map((warning) => ({
    code: warning.code,
    message: normalizeArticleImportWarningMessage(warning, language)
  }));
}

function normalizeArticleImportWarningMessage(warning: ImportWarning, language: AppLanguage) {
  const fallbackMessage = getImportIssueMessage(warning.code, language);
  const rawMessage = warning.message?.trim() || "";

  if (!rawMessage) {
    return fallbackMessage;
  }

  if (warning.code !== "OCR_NOT_ATTEMPTED" && warning.code !== "OCR_PROVIDER_UNAVAILABLE" && warning.code !== "OCR_NO_TEXT_DETECTED") {
    return rawMessage;
  }

  const lowered = rawMessage.toLowerCase();
  const looksLikeProviderPayload =
    rawMessage.startsWith("{") ||
    rawMessage.includes('"error"') ||
    rawMessage.includes('"code"') ||
    lowered.includes("api_key_invalid") ||
    lowered.includes("api_key_expired") ||
    lowered.includes("api key") ||
    lowered.includes("gemini") ||
    lowered.includes("error");

  if (/(503|high demand|temporarily unavailable|\bunavailable\b)/i.test(rawMessage)) {
    return language === "zh-CN"
      ? "图片文字识别部分失败：当前模型服务繁忙，请稍后重试。"
      : "Image text recognition partially failed: the model service is busy right now. Please try again later.";
  }

  if (/(api[_ -]?key|invalid|expired)/i.test(lowered) && looksLikeProviderPayload) {
    return language === "zh-CN"
      ? "图片文字识别失败：当前服务端 Gemini 配置无效或已过期，请检查 API key。"
      : "Image text recognition failed: the server-side Gemini configuration looks invalid or expired. Please check the API key.";
  }

  if (looksLikeProviderPayload) {
    return language === "zh-CN"
      ? "图片文字识别失败：本次 OCR 处理出现异常，可稍后重试或手动补充原始内容。"
      : "Image text recognition failed: an unexpected OCR error occurred. Please try again later or add the original content manually.";
  }

  return rawMessage;
}

function mapCoverageToContentCompleteness(
  report: ArticleImportExtractionReport,
  detectedContent: string | null
): ImportContentCompleteness {
  const rawCompleteness = assessContentCompleteness(detectedContent);

  if (report.coverageLevel === "full") {
    return rawCompleteness === "empty" ? "partial" : "full";
  }

  if (report.coverageLevel === "partial" || report.coverageLevel === "limited") {
    return rawCompleteness === "empty" ? "partial" : "partial";
  }

  return "empty";
}

function deriveArticleOutcome(
  data: ArticleImportData,
  contentCompleteness: ImportResult["contentCompleteness"]
): ImportResult["outcome"] {
  const warningCodes = new Set(data.warnings.map((warning) => warning.code));

  if (
    warningCodes.has("SECURITY_BLOCKED") ||
    warningCodes.has("TOO_MANY_REDIRECTS") ||
    warningCodes.has("UNSUPPORTED_CONTENT_TYPE") ||
    warningCodes.has("FETCH_FAILED")
  ) {
    return "failed_but_creatable";
  }

  if (data.extractionReport.coverageLevel === "full") {
    return "complete";
  }

  if (data.extractionReport.coverageLevel === "partial") {
    return "partial";
  }

  if (contentCompleteness === "partial") {
    return "partial";
  }

  return data.fetchSucceeded ? "needs_user_input" : "failed_but_creatable";
}

function mapLinkExtractionReport(report: ArticleImportExtractionReport): ImportResult["linkExtractionReport"] {
  return {
    extractionSources: report.extractionSources,
    hasHtmlText: report.hasHtmlText,
    hasImageOcrText: report.hasImageOcrText,
    htmlTextLength: report.htmlTextLength,
    imageSignalsFound: report.imageSignalsFound,
    candidateImagesSelected: report.candidateImagesSelected,
    ocrAttemptLimit: report.ocrAttemptLimit,
    candidateSelectionReasons: report.candidateSelectionReasons,
    imageOcrAttempted: report.imageOcrAttempted,
    imageOcrSucceeded: report.imageOcrSucceeded,
    imageOcrFailed: report.imageOcrFailed,
    imageOcrTextLength: report.imageOcrTextLength,
    coverageLevel: report.coverageLevel,
    ocrStatus: report.ocrStatus
  };
}

function mapArticleResponse(
  response: ArticleImportResponse,
  requestedUrl: string,
  language: AppLanguage
): ImportResult {
  if (!response.success) {
    if (response.error.code === "INVALID_URL") {
      return createGenericLinkImportResult(requestedUrl, toImportPlatform(detectPlatform(requestedUrl)), language);
    }

    return {
      source: "link_generic",
      platform: toImportPlatform(detectPlatform(requestedUrl)),
      outcome: "failed_but_creatable",
      originalUrl: requestedUrl,
      detectedTitle: extractLinkTitle(requestedUrl) || null,
      detectedContent: null,
      contentCompleteness: "empty",
      availableTracks: [],
      selectedTrackId: null,
      warnings: [
        {
          code: "UNKNOWN_ERROR",
          message: getImportIssueMessage("UNKNOWN_ERROR", language)
        }
      ],
      canCreateRecord: true,
      shouldPromptManualInput: true
    };
  }

  const detectedContent = formatArticleImportedContent(response.data);
  const contentCompleteness = mapCoverageToContentCompleteness(response.data.extractionReport, detectedContent);
  const warnings = mapArticleWarnings(response.data.warnings, language);
  const outcome = deriveArticleOutcome(response.data, contentCompleteness);

  return {
    source: "link_generic",
    platform:
      response.data.platform === "unknown"
        ? toImportPlatform(detectPlatform(requestedUrl))
        : toImportPlatform(response.data.platform),
    outcome,
    originalUrl: response.data.originalUrl || requestedUrl,
    detectedTitle: response.data.title?.trim() || extractLinkTitle(requestedUrl) || null,
    detectedContent,
    contentCompleteness,
    availableTracks: [],
    selectedTrackId: null,
    warnings,
    canCreateRecord: true,
    shouldPromptManualInput: outcome !== "complete",
    linkExtractionReport: mapLinkExtractionReport(response.data.extractionReport)
  };
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
    try {
      const response = await importArticleLink(trimmedUrl);
      return createImportSession(mapArticleResponse(response, trimmedUrl, options.appLanguage));
    } catch {
      return createImportSession(
        {
          source: "link_generic",
          platform: toImportPlatform(platform),
          outcome: "failed_but_creatable",
          originalUrl: trimmedUrl,
          detectedTitle: extractLinkTitle(trimmedUrl) || null,
          detectedContent: null,
          contentCompleteness: "empty",
          availableTracks: [],
          selectedTrackId: null,
        warnings: [
          {
              code: "FETCH_FAILED",
              message: getImportIssueMessage("FETCH_FAILED", options.appLanguage)
          }
        ],
        canCreateRecord: true,
          shouldPromptManualInput: true
        },
        "error_but_can_continue"
      );
    }
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
          source: importResult.source,
          outcome: importResult.outcome,
          contentCompleteness: importResult.contentCompleteness
        }
      : null
  };
}
