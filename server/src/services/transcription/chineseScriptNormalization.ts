import * as OpenCC from "opencc-js";

import type { TranscriptionProviderOutput } from "../../schemas/transcriptionSchemas.js";

const traditionalToSimplified = OpenCC.Converter({
  from: "t",
  to: "cn"
});

function looksLikeChineseText(text: string) {
  if (!/[\u3400-\u9fff]/u.test(text)) {
    return false;
  }

  // Guard against Japanese transcripts so we do not rewrite non-Chinese content.
  if (/[\u3040-\u30ff]/u.test(text)) {
    return false;
  }

  return true;
}

function shouldNormalizeToSimplified(input: {
  transcriptText: string;
  language?: string | null;
  languageHint?: string | null;
}) {
  const normalizedLanguage = input.language?.toLowerCase() || "";
  if (normalizedLanguage.startsWith("zh")) {
    return true;
  }

  const normalizedHint = input.languageHint?.toLowerCase() || "";
  if (normalizedHint.startsWith("zh")) {
    return true;
  }

  return looksLikeChineseText(input.transcriptText);
}

function convertIfNeeded(text: string) {
  return looksLikeChineseText(text) ? traditionalToSimplified(text) : text;
}

export function normalizeChineseTranscriptScript(
  providerOutput: TranscriptionProviderOutput,
  options: {
    languageHint?: string | null;
  } = {}
): TranscriptionProviderOutput {
  if (
    !shouldNormalizeToSimplified({
      transcriptText: providerOutput.transcriptText,
      language: providerOutput.language,
      languageHint: options.languageHint
    })
  ) {
    return providerOutput;
  }

  return {
    ...providerOutput,
    transcriptText: convertIfNeeded(providerOutput.transcriptText),
    segments: providerOutput.segments?.map((segment) => ({
      ...segment,
      text: convertIfNeeded(segment.text)
    })),
    timestamps: providerOutput.timestamps?.map((timestamp) => ({
      ...timestamp,
      label: convertIfNeeded(timestamp.label)
    }))
  };
}
