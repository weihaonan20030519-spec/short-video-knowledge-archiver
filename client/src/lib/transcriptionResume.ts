import type { RecordItem } from "../types/domain";

export type ResumeTranscriptionFailureReason =
  | "request_failed"
  | "no_import_result"
  | "no_detected_content"
  | "patch_failed";

export type ResumeTranscriptionOutcome =
  | { status: "patched" }
  | { status: "failed"; reason: ResumeTranscriptionFailureReason };

export function isValidHttpUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return false;
  }

  try {
    const url = new URL(trimmedValue);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hasAiOutput(record: Pick<RecordItem, "aiOutputs">) {
  return Boolean(record.aiOutputs.concise || record.aiOutputs.learning);
}

export function canResumeTranscription(record: RecordItem) {
  if (record.inputMethod !== "link") {
    return false;
  }

  if (!isValidHttpUrl(record.originalUrl)) {
    return false;
  }

  if (record.transcriptionStatus !== "idle") {
    return false;
  }

  if (record.originalContent.trim()) {
    return false;
  }

  if (record.sourcePlatform === "bilibili") {
    return false;
  }

  if (record.importSummary?.source === "browser_context") {
    return false;
  }

  if (hasAiOutput(record)) {
    return false;
  }

  return true;
}
