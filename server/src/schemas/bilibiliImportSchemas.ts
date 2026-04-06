import { z } from "zod";

export const bilibiliImportRequestSchema = z.object({
  url: z.string().trim().min(1),
  preferredTrackId: z.string().trim().min(1).optional()
});

export type BilibiliImportRequest = z.infer<typeof bilibiliImportRequestSchema>;

export type BilibiliImportErrorCode =
  | "INVALID_BILIBILI_URL"
  | "VIDEO_INFO_UNAVAILABLE"
  | "SUBTITLE_LIST_UNAVAILABLE"
  | "SUBTITLE_TRACK_UNAVAILABLE"
  | "SUBTITLE_UNAVAILABLE"
  | "BILIBILI_REQUEST_FAILED"
  | "INTERNAL_ERROR";

export interface BilibiliSubtitleTrack {
  id: string;
  label: string;
  language: string | null;
  isAiSubtitle: boolean;
  subtitleUrl: string | null;
}

export interface BilibiliImportResult {
  title: string | null;
  bvid: string;
  originalUrl: string;
  subtitleTracks: BilibiliSubtitleTrack[];
  selectedTrackId: string | null;
  rawTranscriptText: string;
  normalizedTranscriptText: string;
  sourceMeta: {
    cid: string | null;
    usedCookie: boolean;
    fetchStrategy: string | null;
    playerStrategiesTried: string[];
    subtitleLanguage: string | null;
  };
  debug: {
    selectedTrackReason: "preferred-track" | "auto-priority" | "none";
    availableTrackCount: number;
    failureStage: string | null;
    notes: string[];
  };
}
