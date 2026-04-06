export interface BrowserCollectedTrack {
  id: string;
  label: string;
  language?: string | null;
  isAiSubtitle?: boolean | null;
  subtitleUrl?: string | null;
  contentText?: string | null;
  contentSource?: "full_track" | "visible_caption" | "page_text" | "unavailable" | null;
  cueCount?: number | null;
  bodyLoadStatus?: "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable" | null;
  bodyLoadError?: string | null;
}

export interface BrowserCollectedPayload {
  page: {
    title?: string | null;
    url: string;
    platform: "bilibili";
    bvid?: string | null;
    cid?: string | null;
  };
  descriptionText?: string | null;
  visibleText?: string | null;
  visibleCaptionText?: string | null;
  selectedTrackId?: string | null;
  subtitleTracks?: BrowserCollectedTrack[];
}
