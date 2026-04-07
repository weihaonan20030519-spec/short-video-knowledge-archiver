import path from "node:path";

import type {
  TranscriptFileMeta,
  TranscriptionPhase,
  TranscriptionProviderOutput,
  TranscriptionResponse,
  TranscriptionSourceType
} from "../../schemas/transcriptionSchemas.js";
import { normalizeChineseTranscriptScript } from "./chineseScriptNormalization.js";

function buildSuggestedTitle(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  return baseName.replace(/[_-]+/g, " ").trim() || "Untitled media note";
}

export function normalizeTranscriptResult(input: {
  sourceType: TranscriptionSourceType;
  fileMeta: TranscriptFileMeta;
  providerName: string;
  providerOutput: TranscriptionProviderOutput;
  languageHint?: string | null;
}): TranscriptionResponse {
  const normalizedOutput = normalizeChineseTranscriptScript(input.providerOutput, {
    languageHint: input.languageHint
  });
  const warnings = [...normalizedOutput.warnings];

  if (!warnings.length) {
    warnings.push("Review the transcript for accuracy before organizing it.");
  }

  return {
    phase: "transcript_ready" satisfies TranscriptionPhase,
    sourceType: input.sourceType,
    suggestedTitle: buildSuggestedTitle(input.fileMeta.fileName),
    transcriptText: normalizedOutput.transcriptText,
    segments: normalizedOutput.segments,
    timestamps: normalizedOutput.timestamps,
    language: normalizedOutput.language ?? null,
    fileMeta: {
      ...input.fileMeta,
      transcriptionModelUsed: normalizedOutput.transcriptionModelUsed,
      transcriptionModelAttempts: normalizedOutput.transcriptionModelAttempts
    },
    transcriptionStatus: "transcript_needs_review",
    warnings: warnings.map((warning) => warning.trim()).filter(Boolean),
    transcriptionModelUsed: normalizedOutput.transcriptionModelUsed,
    transcriptionModelAttempts: normalizedOutput.transcriptionModelAttempts
  };
}
