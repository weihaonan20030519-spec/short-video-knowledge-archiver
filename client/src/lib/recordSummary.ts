import type { AppLanguage, RecordItem } from "../types/domain";
import type { ActiveFilter } from "../stores/queryStore";
import { getMessages, getPlatformLabel } from "./i18n";
import { getRecordListStatus } from "./status";

export interface RecordSummarySignals {
  status: ReturnType<typeof getRecordListStatus>;
  reviewLaterLabel: string | null;
  entryLabel: string;
  platformLabel: string | null;
}

type ContextualSignalTone = "default" | "muted" | "attention";

export interface ContextualRecordSummarySignal {
  key: "status" | "entry" | "platform" | "reviewLater";
  label: string;
  tone: ContextualSignalTone;
}

export interface ContextualRecordSummarySignals {
  primaryStatus: ReturnType<typeof getRecordListStatus> | null;
  statusWeight: "primary" | "deemphasized";
  reviewLaterWeight: "normal" | "deemphasized";
  secondarySignals: ContextualRecordSummarySignal[];
}

function getRecordEntryLabel(record: Pick<RecordItem, "inputMethod" | "importSummary">, language: AppLanguage) {
  const detail = getMessages(language).detail;

  if (record.importSummary?.source === "browser_context") {
    return detail.recordEntryBrowserImport;
  }

  switch (record.inputMethod) {
    case "upload":
      return detail.recordEntryUpload;
    case "link":
      return detail.recordEntryLink;
    case "manual":
      return detail.recordEntryManual;
    default:
      return detail.recordEntryPastedText;
  }
}

function getSummaryPlatformLabel(
  record: Pick<RecordItem, "sourcePlatform">,
  language: AppLanguage
) {
  if (record.sourcePlatform === "unknown" || record.sourcePlatform === "other") {
    return null;
  }

  return getPlatformLabel(record.sourcePlatform, language);
}

export function getRecordSummarySignals(record: RecordItem, language: AppLanguage): RecordSummarySignals {
  const detail = getMessages(language).detail;

  return {
    status: getRecordListStatus(record, language),
    reviewLaterLabel: record.reviewLater ? detail.recordSummaryStatusReviewLater : null,
    entryLabel: getRecordEntryLabel(record, language),
    platformLabel: getSummaryPlatformLabel(record, language)
  };
}

export function getContextualRecordSummarySignals(
  record: RecordItem,
  language: AppLanguage,
  activeFilter: ActiveFilter
): ContextualRecordSummarySignals {
  const baseSignals = getRecordSummarySignals(record, language);
  const secondarySignals: ContextualRecordSummarySignal[] = [];
  const statusMatchesFilter =
    (activeFilter === "needs_review" && baseSignals.status.key === "needs_review") ||
    (activeFilter === "not_started" && baseSignals.status.key === "not_started");
  const statusWeight = statusMatchesFilter ? "deemphasized" : "primary";
  const reviewLaterWeight =
    activeFilter === "review_later" && baseSignals.reviewLaterLabel ? "deemphasized" : "normal";

  if (statusWeight === "deemphasized") {
    secondarySignals.push({
      key: "status",
      label: baseSignals.status.label,
      tone: "muted"
    });
  }

  secondarySignals.push({
    key: "entry",
    label: baseSignals.entryLabel,
    tone: "default"
  });

  if (baseSignals.platformLabel) {
    secondarySignals.push({
      key: "platform",
      label: baseSignals.platformLabel,
      tone: "default"
    });
  }

  if (baseSignals.reviewLaterLabel) {
    secondarySignals.push({
      key: "reviewLater",
      label: baseSignals.reviewLaterLabel,
      tone: reviewLaterWeight === "deemphasized" ? "muted" : "attention"
    });
  }

  return {
    primaryStatus: statusWeight === "primary" ? baseSignals.status : null,
    statusWeight,
    reviewLaterWeight,
    secondarySignals
  };
}
