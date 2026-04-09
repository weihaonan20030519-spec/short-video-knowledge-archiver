import type { AppLanguage, RecordItem } from "../types/domain";
import { getMessages } from "./i18n";

export interface RecordSourceSummary {
  headline: string | null;
  detail: string | null;
}

function hasTranscriptSource(record: Pick<RecordItem, "inputMethod" | "sourceType" | "transcriptMeta">) {
  return (
    record.inputMethod === "upload" ||
    ((record.sourceType === "audio" || record.sourceType === "video") && Boolean(record.transcriptMeta))
  );
}

function hasManualSource(record: Pick<RecordItem, "inputMethod" | "sourceType">) {
  return (
    record.inputMethod === "text" ||
    record.inputMethod === "manual" ||
    record.sourceType === "text" ||
    record.sourceType === "manual"
  );
}

function isLinkImport(record: Pick<RecordItem, "inputMethod" | "sourceType" | "importSummary">) {
  return (
    record.inputMethod === "link" ||
    record.sourceType === "link" ||
    record.importSummary?.source === "link_generic" ||
    record.importSummary?.source === "link_bilibili_server"
  );
}

function shouldShowChangedMaybeDetail(
  record: Pick<RecordItem, "inputMethod" | "sourceType" | "importSummary" | "originalContent" | "createdAt" | "updatedAt">
) {
  if (!isLinkImport(record)) {
    return false;
  }

  if (!record.importSummary || record.importSummary.contentCompleteness === "full") {
    return false;
  }

  if (!record.originalContent.trim()) {
    return false;
  }

  return record.updatedAt !== record.createdAt;
}

export function deriveRecordSourceSummary(
  record: Pick<
    RecordItem,
    | "inputMethod"
    | "sourceType"
    | "transcriptMeta"
    | "importSummary"
    | "originalContent"
    | "createdAt"
    | "updatedAt"
  >,
  language: AppLanguage = "zh-CN"
): RecordSourceSummary {
  const detailMessages = getMessages(language).detail;
  const sourceSignals = record.importSummary?.sourceSignals;

  let headline: string | null = null;

  if (hasTranscriptSource(record)) {
    headline = detailMessages.sourceSummaryTranscript;
  } else if (hasManualSource(record)) {
    headline = detailMessages.sourceSummaryManual;
  } else if (record.importSummary?.source === "browser_context") {
    headline = detailMessages.sourceSummaryBrowser;
  } else if (isLinkImport(record)) {
    if (sourceSignals?.hasHtmlText && sourceSignals?.hasImageOcrText) {
      headline = detailMessages.sourceSummaryHtmlAndOcr;
    } else if (sourceSignals?.hasHtmlText) {
      headline = detailMessages.sourceSummaryHtml;
    } else if (sourceSignals?.hasImageOcrText) {
      headline = detailMessages.sourceSummaryOcr;
    } else {
      headline = detailMessages.sourceSummaryLink;
    }
  }

  let detail: string | null = null;

  if (sourceSignals?.isSummaryOnly) {
    detail = detailMessages.sourceSummaryMetaOnly;
  } else if (shouldShowChangedMaybeDetail(record)) {
    detail = detailMessages.sourceSummaryChangedMaybe;
  }

  return {
    headline,
    detail
  };
}
