import type { AIStatus, AppLanguage, RecordItem, TranscriptionStatus } from "../types/domain";
import { getMessages } from "./i18n";

export function getStatusLabel(status: AIStatus, language: AppLanguage = "zh-CN") {
  return getMessages(language).status[status];
}

export const statusToneMap: Record<AIStatus, string> = {
  not_started: "bg-slate-200 text-slate-700 ring-1 ring-slate-300/80",
  processing: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  done: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
};

export function getTranscriptionStatusLabel(status: TranscriptionStatus, language: AppLanguage = "zh-CN") {
  return getMessages(language).transcriptionStatus[status];
}

export const transcriptionStatusToneMap: Record<TranscriptionStatus, string> = {
  idle: "bg-slate-200 text-slate-700 ring-1 ring-slate-300/80",
  file_uploaded: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  extracting_audio: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200",
  transcribing: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  transcript_ready: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  transcript_needs_review: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
  transcript_failed: "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
};

export type RecordListStatusKey =
  | "organized"
  | "processing"
  | "needs_review"
  | "transcript_ready"
  | "transcription_failed"
  | "analysis_failed"
  | "not_started";

interface RecordListStatusPresentation {
  key: RecordListStatusKey;
  label: string;
  tone: string;
}

function hasAiOutput(record: Pick<RecordItem, "aiOutputs">) {
  return Boolean(record.aiOutputs.concise || record.aiOutputs.learning);
}

function hasSourceContent(record: Pick<RecordItem, "originalContent">) {
  return Boolean(record.originalContent.trim());
}

function isTranscriptionInProgress(status: TranscriptionStatus) {
  return status === "file_uploaded" || status === "extracting_audio" || status === "transcribing";
}

export function deriveRecordListStatusKey(record: RecordItem): RecordListStatusKey {
  const aiResultExists = hasAiOutput(record);
  const sourceContentExists = hasSourceContent(record);

  if (record.aiStatus === "processing" || isTranscriptionInProgress(record.transcriptionStatus)) {
    return "processing";
  }

  if (aiResultExists || record.aiStatus === "done") {
    return "organized";
  }

  if (sourceContentExists) {
    return "needs_review";
  }

  if (record.transcriptionStatus === "transcript_ready") {
    return "transcript_ready";
  }

  if (record.transcriptionStatus === "transcript_failed") {
    return "transcription_failed";
  }

  if (record.aiStatus === "failed") {
    return "analysis_failed";
  }

  return "not_started";
}

export function getRecordListStatus(record: RecordItem, language: AppLanguage = "zh-CN"): RecordListStatusPresentation {
  const messages = getMessages(language);
  const key = deriveRecordListStatusKey(record);

  switch (key) {
    case "organized":
      return {
        key,
        label: messages.status.done,
        tone: statusToneMap.done
      };
    case "processing":
      return {
        key,
        label: messages.status.processing,
        tone: statusToneMap.processing
      };
    case "needs_review":
      return {
        key,
        label: messages.transcriptionStatus.transcript_needs_review,
        tone: transcriptionStatusToneMap.transcript_needs_review
      };
    case "transcript_ready":
      return {
        key,
        label: messages.transcriptionStatus.transcript_ready,
        tone: transcriptionStatusToneMap.transcript_ready
      };
    case "transcription_failed":
      return {
        key,
        label: messages.transcriptionStatus.transcript_failed,
        tone: transcriptionStatusToneMap.transcript_failed
      };
    case "analysis_failed":
      return {
        key,
        label: messages.status.failed,
        tone: statusToneMap.failed
      };
    default:
      return {
        key: "not_started",
        label: messages.transcriptionStatus.idle,
        tone: transcriptionStatusToneMap.idle
      };
  }
}

export function matchesRecordStageFilter(
  record: RecordItem,
  filter: "all" | "recent" | "unorganized" | "needs_review"
) {
  const key = deriveRecordListStatusKey(record);

  if (filter === "needs_review") {
    return key === "needs_review";
  }

  if (filter === "unorganized") {
    return (
      key === "not_started" ||
      key === "needs_review" ||
      key === "transcript_ready" ||
      key === "transcription_failed" ||
      key === "analysis_failed"
    );
  }

  return true;
}
