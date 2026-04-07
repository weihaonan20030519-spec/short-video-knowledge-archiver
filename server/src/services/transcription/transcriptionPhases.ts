export const transcriptionPhaseValues = [
  "uploaded",
  "preprocessing",
  "transcribing",
  "transcript_ready",
  "ai_processing",
  "completed",
  "failed"
] as const;

export type TranscriptionPhase = (typeof transcriptionPhaseValues)[number];

export const transcriptionFailureStageValues = [
  "upload",
  "preprocessing",
  "transcription",
  "unknown"
] as const;

export type TranscriptionFailureStage = (typeof transcriptionFailureStageValues)[number];
