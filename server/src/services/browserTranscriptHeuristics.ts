import type { BrowserContextImportIssueCode } from "../schemas/browserContextImportSchemas.js";

export type BrowserTranscriptSource = "full_track" | "visible_caption" | "page_text" | "unavailable";

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

export function normalizeBrowserTranscriptText(input?: string | null) {
  return normalizeText(input);
}

export function assessBrowserTranscript(options: {
  text?: string | null;
  source: BrowserTranscriptSource;
  cueCount?: number | null;
}) {
  const normalizedText = normalizeText(options.text);
  const cueCount = options.cueCount ?? 0;
  const sentenceUnits = countSentenceLikeUnits(normalizedText);
  const warningCodes = new Set<BrowserContextImportIssueCode>();

  if (!normalizedText) {
    return {
      normalizedText: "",
      contentCompleteness: "empty" as const,
      warningCodes
    };
  }

  if (options.source === "visible_caption") {
    warningCodes.add("VISIBLE_CAPTION_ONLY");
  }

  const isSingleCueLike =
    options.source === "visible_caption" ||
    cueCount === 1 ||
    (cueCount === 0 && sentenceUnits <= 1);

  let contentCompleteness: "full" | "partial" | "empty" = "empty";

  if (
    options.source === "full_track" &&
    normalizedText.length >= FULL_CONTENT_LENGTH &&
    (cueCount >= 2 || sentenceUnits >= 3)
  ) {
    contentCompleteness = "full";
  } else if (normalizedText.length >= PARTIAL_CONTENT_LENGTH) {
    contentCompleteness = "partial";
  }

  if (contentCompleteness !== "full" && isSingleCueLike) {
    warningCodes.add("TRANSCRIPT_TOO_SHORT");
  }

  if (contentCompleteness !== "full" && options.source !== "full_track") {
    warningCodes.add("MANUAL_COMPLETION_REQUIRED");
  }

  return {
    normalizedText,
    contentCompleteness,
    warningCodes
  };
}
