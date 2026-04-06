import type { BrowserContextPayload } from "../schemas/browserContextImportSchemas.js";

type BodyLoadStatus = "loaded" | "fetch_failed" | "empty" | "parse_failed" | "unavailable";

function normalizeText(input?: string | null) {
  return input?.replace(/\s+/g, " ").trim() || "";
}

function extractCueLines(payload: unknown) {
  const candidates =
    (Array.isArray((payload as { body?: unknown[] })?.body) && (payload as { body: unknown[] }).body) ||
    (Array.isArray((payload as { data?: { body?: unknown[] } })?.data?.body) &&
      (payload as { data: { body: unknown[] } }).data.body) ||
    (Array.isArray((payload as { cues?: unknown[] })?.cues) && (payload as { cues: unknown[] }).cues) ||
    [];

  return candidates
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const cue = item as Record<string, unknown>;
      return normalizeText(
        typeof cue.content === "string"
          ? cue.content
          : typeof cue.text === "string"
            ? cue.text
            : typeof cue.value === "string"
              ? cue.value
              : typeof cue.cue === "string"
                ? cue.cue
                : ""
      );
    })
    .filter(Boolean);
}

export async function fetchSubtitleBodyForTrack(subtitleUrl?: string | null) {
  if (!subtitleUrl) {
    return {
      contentText: "",
      cueCount: 0,
      bodyLoadStatus: "unavailable" as BodyLoadStatus,
      bodyLoadError: null,
      responseStatus: null
    };
  }

  let response: Response;
  try {
    response = await fetch(subtitleUrl, {
      headers: {
        Accept: "application/json,text/plain,*/*"
      }
    });
  } catch (error) {
    return {
      contentText: "",
      cueCount: 0,
      bodyLoadStatus: "fetch_failed" as BodyLoadStatus,
      bodyLoadError: error instanceof Error ? error.message : "fetch_failed",
      responseStatus: null
    };
  }

  const responseStatus = response.status;
  if (!response.ok) {
    return {
      contentText: "",
      cueCount: 0,
      bodyLoadStatus: "fetch_failed" as BodyLoadStatus,
      bodyLoadError: `http_${response.status}`,
      responseStatus
    };
  }

  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    return {
      contentText: "",
      cueCount: 0,
      bodyLoadStatus: "fetch_failed" as BodyLoadStatus,
      bodyLoadError: error instanceof Error ? error.message : "response_read_failed",
      responseStatus
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    return {
      contentText: "",
      cueCount: 0,
      bodyLoadStatus: "parse_failed" as BodyLoadStatus,
      bodyLoadError: error instanceof Error ? error.message : "json_parse_failed",
      responseStatus
    };
  }

  const lines = extractCueLines(payload);
  const contentText = lines.join("\n").trim();

  return {
    contentText,
    cueCount: lines.length,
    bodyLoadStatus: (contentText ? "loaded" : "empty") as BodyLoadStatus,
    bodyLoadError: contentText ? null : "subtitle_body_empty",
    responseStatus
  };
}

export async function hydrateSelectedTrackContent(payload: BrowserContextPayload, trackId: string) {
  const nextPayload: BrowserContextPayload = {
    ...payload,
    selectedTrackId: trackId,
    subtitleTracks: (payload.subtitleTracks || []).map((track) => ({ ...track }))
  };

  const track = nextPayload.subtitleTracks?.find((entry) => entry.id === trackId);
  if (!track) {
    return {
      payload: nextPayload,
      foundTrack: null,
      refetched: false
    };
  }

  const shouldRefetch = !normalizeText(track.contentText);
  if (!shouldRefetch) {
    return {
      payload: nextPayload,
      foundTrack: track,
      refetched: false
    };
  }

  const body = await fetchSubtitleBodyForTrack(track.subtitleUrl);
  track.contentText = body.contentText;
  track.cueCount = body.cueCount;
  track.bodyLoadStatus = body.bodyLoadStatus;
  track.bodyLoadError = body.bodyLoadError;
  track.contentSource = body.bodyLoadStatus === "loaded" ? "full_track" : "unavailable";

  const notes = [...(nextPayload.debug?.notes || [])];
  notes.push(
    `refetch:selected=${trackId};subtitleUrl=${track.subtitleUrl ? "yes" : "no"};status=${body.bodyLoadStatus};http=${body.responseStatus ?? "none"};length=${body.contentText.length}`
  );
  nextPayload.debug = {
    ...(nextPayload.debug || {}),
    notes
  };

  return {
    payload: nextPayload,
    foundTrack: track,
    refetched: true
  };
}
