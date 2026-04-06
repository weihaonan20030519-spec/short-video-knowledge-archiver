import path from "node:path";

import type {
  TranscriptFileMeta,
  TranscriptionProviderOutput,
  TranscriptionResponse,
  TranscriptionSourceType
} from "../../schemas/transcriptionSchemas.js";

function buildSuggestedTitle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/[_-]+/g, " ").trim() || "Untitled media note";
}

export function normalizeTranscriptResult(input: {
  sourceType: TranscriptionSourceType;
  fileMeta: TranscriptFileMeta;
  providerName: string;
  providerOutput: TranscriptionProviderOutput;
}): TranscriptionResponse {
  const warnings = [...input.providerOutput.warnings];

  if (!warnings.length) {
    warnings.push("Review the transcript for accuracy before organizing it.");
  }

  return {
    sourceType: input.sourceType,
    suggestedTitle: buildSuggestedTitle(input.fileMeta.fileName),
    transcriptText: input.providerOutput.transcriptText,
    segments: input.providerOutput.segments,
    timestamps: input.providerOutput.timestamps,
    language: input.providerOutput.language ?? null,
    fileMeta: input.fileMeta,
    transcriptionStatus: "transcript_needs_review",
    warnings: warnings.map((warning) => warning.trim()).filter(Boolean)
  };
}
