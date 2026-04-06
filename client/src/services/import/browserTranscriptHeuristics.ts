import type { ImportContentCompleteness, ImportIssueCode, ImportTrackContentSource } from "./importTypes";

const FULL_CONTENT_LENGTH = 120;
const PARTIAL_CONTENT_LENGTH = 24;

function normalizeText(input?: string | null) {
  return input?.replace(/\s+/g, " ").trim() || "";
}

function countSentenceLikeUnits(text: string) {
  return text
    .split(/[。！？!?；;]+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function assessBrowserTranscript(options: {
  text?: string | null;
  source?: ImportTrackContentSource | null;
  cueCount?: number | null;
}) {
  const normalizedText = normalizeText(options.text);
  const source = options.source || "unavailable";
  const cueCount = options.cueCount ?? 0;
  const sentenceUnits = countSentenceLikeUnits(normalizedText);
  const warningCodes = new Set<ImportIssueCode>();

  if (!normalizedText) {
    return {
      normalizedText: "",
      contentCompleteness: "empty" as ImportContentCompleteness,
      warningCodes
    };
  }

  if (source === "visible_caption") {
    warningCodes.add("VISIBLE_CAPTION_ONLY");
  }

  const isSingleCueLike = source === "visible_caption" || cueCount === 1 || (cueCount === 0 && sentenceUnits <= 1);

  let contentCompleteness: ImportContentCompleteness = "empty";

  if (source === "full_track" && normalizedText.length >= FULL_CONTENT_LENGTH && (cueCount >= 2 || sentenceUnits >= 3)) {
    contentCompleteness = "full";
  } else if (normalizedText.length >= PARTIAL_CONTENT_LENGTH) {
    contentCompleteness = "partial";
  }

  if (contentCompleteness !== "full" && isSingleCueLike) {
    warningCodes.add("TRANSCRIPT_TOO_SHORT");
  }

  if (contentCompleteness !== "full" && source !== "full_track") {
    warningCodes.add("MANUAL_COMPLETION_REQUIRED");
  }

  return {
    normalizedText,
    contentCompleteness,
    warningCodes
  };
}
