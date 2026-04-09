import type { AppLanguage } from "../../types/domain";
import { extractLinkTitle } from "../../lib/platform";
import { getImportIssueMessage } from "../../lib/i18n";
import type {
  ImportContentCompleteness,
  ImportPlatform,
  ImportResult
} from "./importTypes";

const FULL_CONTENT_LENGTH = 120;
const PARTIAL_CONTENT_LENGTH = 24;

function normalizeContent(text?: string | null) {
  return text?.trim() || "";
}

function isValidHttpUrl(url: string) {
  try {
    const target = new URL(url);
    return target.protocol === "http:" || target.protocol === "https:";
  } catch {
    return false;
  }
}

export function assessContentCompleteness(text?: string | null): ImportContentCompleteness {
  const normalized = normalizeContent(text);

  if (!normalized) {
    return "empty";
  }

  if (normalized.length >= FULL_CONTENT_LENGTH) {
    return "full";
  }

  if (normalized.length >= PARTIAL_CONTENT_LENGTH) {
    return "partial";
  }

  return "empty";
}

export function createManualImportResult(content: string, language: AppLanguage): ImportResult {
  const trimmedContent = content.trim();
  const normalizedContent = trimmedContent ? content : null;
  const completeness = assessContentCompleteness(content);

  return {
    source: normalizedContent ? "manual_text" : "manual_empty",
    platform: "unknown",
    outcome:
      completeness === "full" ? "complete" : completeness === "partial" ? "partial" : "needs_user_input",
    originalUrl: null,
    detectedTitle: null,
    detectedContent: normalizedContent,
    contentCompleteness: completeness,
    availableTracks: [],
    selectedTrackId: null,
    warnings: [],
    canCreateRecord: true,
    shouldPromptManualInput: completeness !== "full"
  };
}

export function createGenericLinkImportResult(
  originalUrl: string,
  platform: ImportPlatform,
  language: AppLanguage
): ImportResult {
  const normalizedUrl = originalUrl.trim();
  const validUrl = isValidHttpUrl(normalizedUrl);
  const warningCode = validUrl ? "UNSUPPORTED_PLATFORM" : "INVALID_URL";

  return {
    source: "link_generic",
    platform: validUrl ? platform : "unknown",
    outcome: validUrl ? "needs_user_input" : "failed_but_creatable",
    originalUrl: normalizedUrl,
    detectedTitle: extractLinkTitle(normalizedUrl) || null,
    detectedContent: null,
    contentCompleteness: "empty",
    availableTracks: [],
    selectedTrackId: null,
    warnings: [
      {
        code: warningCode,
        message: getImportIssueMessage(warningCode, language)
      }
    ],
    canCreateRecord: true,
    shouldPromptManualInput: true
  };
}
