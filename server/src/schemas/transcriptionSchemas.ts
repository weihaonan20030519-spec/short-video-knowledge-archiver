import { z } from "zod";

export const transcriptionSourceTypeSchema = z.enum(["video", "audio"]);
export const transcriptionPhaseSchema = z.enum([
  "uploaded",
  "preprocessing",
  "transcribing",
  "transcript_ready",
  "ai_processing",
  "completed",
  "failed"
]);
export const transcriptionFailureStageSchema = z.enum([
  "upload",
  "preprocessing",
  "transcription",
  "unknown"
]);

export const transcriptionStatusSchema = z.enum([
  "idle",
  "file_uploaded",
  "extracting_audio",
  "transcribing",
  "transcript_ready",
  "transcript_needs_review",
  "transcript_failed"
]);

export const transcriptSegmentSchema = z.object({
  startMs: z.number().nonnegative().optional(),
  endMs: z.number().nonnegative().optional(),
  text: z.string().min(1)
});

export const transcriptTimestampSchema = z.object({
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative().optional(),
  label: z.string().min(1)
});

export const transcriptFileMetaSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  duration: z.number().nonnegative().optional(),
  transcriptionModelUsed: z.string().min(1).optional(),
  transcriptionModelAttempts: z.array(z.string().min(1)).optional()
});

export const transcriptionResponseSchema = z.object({
  phase: transcriptionPhaseSchema,
  sourceType: transcriptionSourceTypeSchema,
  suggestedTitle: z.string().min(1),
  transcriptText: z.string().min(1),
  segments: z.array(transcriptSegmentSchema).optional(),
  timestamps: z.array(transcriptTimestampSchema).optional(),
  language: z.string().min(1).nullable().optional(),
  fileMeta: transcriptFileMetaSchema,
  transcriptionStatus: transcriptionStatusSchema,
  warnings: z.array(z.string()).default([]),
  transcriptionModelUsed: z.string().min(1).optional(),
  transcriptionModelAttempts: z.array(z.string().min(1)).optional()
});

export const transcriptionProviderOutputSchema = z.object({
  transcriptText: z.string().min(1),
  segments: z.array(transcriptSegmentSchema).optional(),
  timestamps: z.array(transcriptTimestampSchema).optional(),
  language: z.string().min(1).nullable().optional(),
  warnings: z.array(z.string()).default([]),
  transcriptionModelUsed: z.string().min(1).optional(),
  transcriptionModelAttempts: z.array(z.string().min(1)).optional()
});

export type TranscriptionSourceType = z.infer<typeof transcriptionSourceTypeSchema>;
export type TranscriptionPhase = z.infer<typeof transcriptionPhaseSchema>;
export type TranscriptionFailureStage = z.infer<typeof transcriptionFailureStageSchema>;
export type TranscriptionStatus = z.infer<typeof transcriptionStatusSchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type TranscriptTimestamp = z.infer<typeof transcriptTimestampSchema>;
export type TranscriptFileMeta = z.infer<typeof transcriptFileMetaSchema>;
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;
export type TranscriptionProviderOutput = z.infer<typeof transcriptionProviderOutputSchema>;
