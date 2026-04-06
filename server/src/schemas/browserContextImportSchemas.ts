import { z } from "zod";

export const browserContextTrackSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  language: z.string().trim().nullable().optional(),
  isAiSubtitle: z.boolean().nullable().optional(),
  subtitleUrl: z.string().trim().nullable().optional(),
  contentText: z.string().nullable().optional(),
  contentSource: z.enum(["full_track", "visible_caption", "page_text", "unavailable"]).nullable().optional(),
  cueCount: z.number().int().nonnegative().nullable().optional(),
  bodyLoadStatus: z.enum(["loaded", "fetch_failed", "empty", "parse_failed", "unavailable"]).nullable().optional(),
  bodyLoadError: z.string().nullable().optional()
});

export const browserContextPayloadSchema = z.object({
  page: z.object({
    title: z.string().nullable().optional(),
    url: z.string().trim().min(1),
    platform: z.literal("bilibili"),
    bvid: z.string().trim().nullable().optional(),
    cid: z.string().trim().nullable().optional()
  }),
  visibleText: z.string().nullable().optional(),
  descriptionText: z.string().nullable().optional(),
  visibleCaptionText: z.string().nullable().optional(),
  selectedTrackId: z.string().trim().nullable().optional(),
  subtitleTracks: z.array(browserContextTrackSchema).optional(),
  debug: z
    .object({
      notes: z.array(z.string()).optional(),
      fetchStrategy: z.string().trim().nullable().optional()
    })
    .optional()
});

export const browserContextSessionSubmitSchema = z.object({
  sessionToken: z.string().trim().min(1),
  payload: browserContextPayloadSchema
});

export const browserContextTrackRefetchSchema = z.object({
  trackId: z.string().trim().min(1)
});

export type BrowserContextImportIssueCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PLATFORM"
  | "NO_SUBTITLE_TRACK"
  | "SUBTITLE_FETCH_FAILED"
  | "SUBTITLE_BODY_FETCH_FAILED"
  | "SUBTITLE_BODY_EMPTY"
  | "SUBTITLE_BODY_PARSE_FAILED"
  | "SELECTED_TRACK_REFETCH_FAILED"
  | "FALLBACK_TO_VISIBLE_TEXT"
  | "SUBTITLE_TRACK_UNAVAILABLE"
  | "SUBTITLE_TRACK_DETECTED_BUT_UNFETCHABLE"
  | "VISIBLE_CAPTION_ONLY"
  | "TRANSCRIPT_NOT_FOUND"
  | "TRANSCRIPT_TOO_SHORT"
  | "MANUAL_COMPLETION_REQUIRED"
  | "COOKIE_REQUIRED_POSSIBLE"
  | "MULTIPLE_TRACKS_NEED_SELECTION"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export interface BrowserContextImportTrack {
  id: string;
  label: string;
  language: string | null;
  isAiSubtitle: boolean;
  subtitleUrl: string | null;
  contentSource?: "full_track" | "visible_caption" | "page_text" | "unavailable" | null;
  cueCount?: number | null;
  bodyLoadStatus?: "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable" | null;
}

export interface BrowserContextImportResultDto {
  source: "browser_context";
  platform: "bilibili" | "other" | "unknown";
  outcome: "complete" | "partial" | "needs_user_input" | "failed_but_creatable";
  originalUrl: string | null;
  detectedTitle: string | null;
  detectedContent: string | null;
  contentCompleteness: "full" | "partial" | "empty";
  availableTracks: BrowserContextImportTrack[];
  selectedTrackId: string | null;
  warningCodes: BrowserContextImportIssueCode[];
  canCreateRecord: boolean;
  shouldPromptManualInput: boolean;
  trackContentById?: Record<string, string>;
  debugMeta?: {
    bvid?: string;
    cid?: string;
    usedCookie?: boolean;
    fetchStrategy?: string;
    notes?: string[];
  };
}

export type BrowserContextPayload = z.infer<typeof browserContextPayloadSchema>;
export type BrowserContextSessionSubmitRequest = z.infer<typeof browserContextSessionSubmitSchema>;
export type BrowserContextTrackRefetchRequest = z.infer<typeof browserContextTrackRefetchSchema>;
export type BrowserContextImportSessionStatus = "pending" | "ready" | "expired" | "failed";

export interface BrowserContextImportSessionState {
  sessionToken: string;
  status: BrowserContextImportSessionStatus;
  expiresAt: string;
  result: BrowserContextImportResultDto | null;
}
