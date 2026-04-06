import type { AIStatus, AppLanguage, TranscriptionStatus } from "../types/domain";
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
