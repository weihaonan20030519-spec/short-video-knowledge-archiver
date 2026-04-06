import {
  bilibiliImportRequestSchema,
  type BilibiliImportErrorCode,
  type BilibiliImportResult,
  type BilibiliSubtitleTrack
} from "../schemas/bilibiliImportSchemas.js";

type Fetcher = typeof fetch;
type PlayerStrategyName = "player-wbi" | "player-v2" | "page-playinfo";
type FailureStage =
  | "resolve-video-id"
  | "fetch-video-info"
  | "probe-subtitle-list"
  | "select-track"
  | "download-subtitle"
  | null;

interface BilibiliApiEnvelope<T> {
  code: number;
  message?: string;
  data?: T;
}

interface VideoInfoData {
  title?: string;
  pages?: Array<{
    cid?: number | string;
  }>;
}

interface PagelistEntry {
  cid?: number | string;
}

interface SubtitleItem {
  id?: number | string;
  subtitle_url?: string;
  subtitleUrl?: string;
  lan?: string;
  lan_doc?: string;
  lanDoc?: string;
  ai_type?: number;
  aiType?: number;
  type?: number;
}

interface PlayerData {
  subtitle?: {
    subtitles?: SubtitleItem[];
  };
  data?: {
    subtitle?: {
      subtitles?: SubtitleItem[];
    };
  };
}

interface SubtitleLine {
  content?: string;
}

interface SubtitlePayload {
  body?: SubtitleLine[];
}

interface PlayerProbeResult {
  strategy: PlayerStrategyName;
  tracks: SubtitleItem[];
  notes: string[];
}

interface ImportContext {
  fetcher: Fetcher;
  headers: Record<string, string>;
  usedCookie: boolean;
}

interface ImportDebugState {
  playerStrategiesTried: PlayerStrategyName[];
  notes: string[];
}

interface TrackSelection {
  track: BilibiliSubtitleTrack;
  reason: "preferred-track" | "auto-priority";
}

const BVID_PATTERN = /BV[0-9A-Za-z]{10}/i;
const SENTENCE_END_PATTERN = /[。！？!?;；.]$/;
const STRONG_BREAK_PATTERN = /[。！？!?]$/;
const ASCII_WORD_PATTERN = /[A-Za-z0-9]$/;
const LEADING_PUNCTUATION = /^[,，.。!！?？:：;；、)\]）】》]+/;
const TRAILING_SPACE_PATTERN = /\s+/g;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

export class BilibiliImportError extends Error {
  code: BilibiliImportErrorCode;
  status: number;
  data: BilibiliImportResult | null;

  constructor(code: BilibiliImportErrorCode, message: string, status = 400, data: BilibiliImportResult | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

function isBilibiliHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized.includes("bilibili.com") || normalized.includes("b23.tv");
}

function normalizeSubtitleUrl(url: string) {
  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `https://api.bilibili.com${url}`;
  }

  return url;
}

function normalizeSubtitleLine(text: string) {
  return text.replace(TRAILING_SPACE_PATTERN, " ").trim();
}

function joinTranscriptFragment(base: string, fragment: string) {
  if (!base) {
    return fragment;
  }

  if (ASCII_WORD_PATTERN.test(base) && /^[A-Za-z0-9]/.test(fragment)) {
    return `${base} ${fragment}`;
  }

  if (LEADING_PUNCTUATION.test(fragment)) {
    return `${base}${fragment}`;
  }

  return `${base}${fragment}`;
}

function sanitizeTrackKey(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "track";
}

function normalizeTrackLabel(item: SubtitleItem) {
  const languageDoc = item.lan_doc || item.lanDoc || "";
  const languageCode = item.lan || "";
  const ai = detectAiSubtitle(item);
  const base = languageDoc || languageCode || "Unknown subtitle";

  if (ai && !/ai|自动|auto/i.test(base)) {
    return `${base}（AI）`;
  }

  return base;
}

function detectAiSubtitle(item: SubtitleItem) {
  return Boolean(item.ai_type || item.aiType || /ai|自动|auto/i.test(`${item.lan_doc || item.lanDoc || ""}`));
}

function readBilibiliCookie() {
  const fullCookie = process.env.BILIBILI_COOKIE?.trim();
  if (fullCookie) {
    return fullCookie;
  }

  const sessdata = process.env.BILIBILI_SESSDATA?.trim();
  if (sessdata) {
    return `SESSDATA=${sessdata}`;
  }

  return null;
}

function createImportContext(fetcher: Fetcher): ImportContext {
  const cookie = readBilibiliCookie();
  const headers: Record<string, string> = {
    "User-Agent": DEFAULT_USER_AGENT,
    Referer: "https://www.bilibili.com/",
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  return {
    fetcher,
    headers,
    usedCookie: Boolean(cookie)
  };
}

function buildProbeData(input: {
  title?: string | null;
  bvid: string;
  originalUrl: string;
  subtitleTracks?: BilibiliSubtitleTrack[];
  selectedTrackId?: string | null;
  rawTranscriptText?: string;
  normalizedTranscriptText?: string;
  cid?: string | null;
  usedCookie: boolean;
  fetchStrategy?: string | null;
  playerStrategiesTried?: PlayerStrategyName[];
  subtitleLanguage?: string | null;
  selectedTrackReason?: "preferred-track" | "auto-priority" | "none";
  failureStage?: FailureStage;
  notes?: string[];
}): BilibiliImportResult {
  const subtitleTracks = input.subtitleTracks || [];
  return {
    title: input.title ?? null,
    bvid: input.bvid,
    originalUrl: input.originalUrl,
    subtitleTracks,
    selectedTrackId: input.selectedTrackId ?? null,
    rawTranscriptText: input.rawTranscriptText || "",
    normalizedTranscriptText: input.normalizedTranscriptText || "",
    sourceMeta: {
      cid: input.cid ?? null,
      usedCookie: input.usedCookie,
      fetchStrategy: input.fetchStrategy ?? null,
      playerStrategiesTried: input.playerStrategiesTried || [],
      subtitleLanguage: input.subtitleLanguage ?? null
    },
    debug: {
      selectedTrackReason: input.selectedTrackReason ?? "none",
      availableTrackCount: subtitleTracks.length,
      failureStage: input.failureStage ?? null,
      notes: input.notes || []
    }
  };
}

function buildTrackId(item: SubtitleItem, index: number) {
  const label = normalizeTrackLabel(item);
  const languageCode = item.lan || "unknown";
  const rawId = item.id ? String(item.id) : `${languageCode}-${detectAiSubtitle(item) ? "ai" : "std"}-${index}`;
  return sanitizeTrackKey(`${rawId}-${label}`);
}

function mapSubtitleTracks(items: SubtitleItem[]) {
  const deduped = new Map<string, BilibiliSubtitleTrack>();

  for (const [index, item] of items.entries()) {
    const subtitleUrl = item.subtitle_url || item.subtitleUrl || null;
    const normalizedUrl = subtitleUrl ? normalizeSubtitleUrl(subtitleUrl) : null;
    const track: BilibiliSubtitleTrack = {
      id: buildTrackId(item, index),
      label: normalizeTrackLabel(item),
      language: item.lan || null,
      isAiSubtitle: detectAiSubtitle(item),
      subtitleUrl: normalizedUrl
    };
    const key = normalizedUrl || `${track.language || "unknown"}::${track.label}::${track.isAiSubtitle ? "ai" : "std"}`;

    if (!deduped.has(key)) {
      deduped.set(key, track);
    }
  }

  return [...deduped.values()];
}

function scoreTrack(track: BilibiliSubtitleTrack) {
  let score = track.subtitleUrl ? 10 : 0;
  const label = `${track.label} ${track.language || ""}`.toLowerCase();

  if (label.includes("zh") || label.includes("中文")) {
    score += 6;
  } else if (label.includes("en") || label.includes("english")) {
    score += 3;
  }

  if (!track.isAiSubtitle) {
    score += 2;
  } else {
    score += 1;
  }

  return score;
}

function selectTrack(tracks: BilibiliSubtitleTrack[], preferredTrackId?: string): TrackSelection | null {
  if (preferredTrackId) {
    const preferred = tracks.find((track) => track.id === preferredTrackId);
    if (preferred) {
      return {
        track: preferred,
        reason: "preferred-track"
      };
    }
  }

  const sortable = [...tracks].sort((left, right) => scoreTrack(right) - scoreTrack(left));
  const selected = sortable[0];

  if (!selected) {
    return null;
  }

  return {
    track: selected,
    reason: "auto-priority"
  };
}

export function extractBilibiliVideoId(input: string) {
  try {
    const target = new URL(input);
    if (!isBilibiliHost(target.hostname)) {
      return null;
    }

    const match = decodeURIComponent(`${target.pathname}${target.search}`).match(BVID_PATTERN);
    return match?.[0]?.toUpperCase() || null;
  } catch {
    return null;
  }
}

async function resolveBilibiliVideoId(url: string, context: ImportContext) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Not a valid Bilibili video link.");
  }

  if (!isBilibiliHost(parsed.hostname)) {
    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Not a valid Bilibili video link.");
  }

  const directMatch = extractBilibiliVideoId(url);
  if (directMatch) {
    return {
      bvid: directMatch,
      resolvedUrl: url
    };
  }

  if (!parsed.hostname.toLowerCase().includes("b23.tv")) {
    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Could not extract a Bilibili video id from the link.");
  }

  const response = await context.fetcher(url, {
    headers: context.headers,
    redirect: "follow"
  });

  if (!response.ok) {
    throw new BilibiliImportError("BILIBILI_REQUEST_FAILED", "Failed to resolve the Bilibili short link.", 502);
  }

  const resolvedUrl = response.url || url;
  const bvid = extractBilibiliVideoId(resolvedUrl);

  if (!bvid) {
    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Could not extract a Bilibili video id from the resolved link.");
  }

  return { bvid, resolvedUrl };
}

async function fetchBilibiliJson<T>(url: string, context: ImportContext) {
  const response = await context.fetcher(url, {
    headers: context.headers
  });

  if (!response.ok) {
    throw new BilibiliImportError("BILIBILI_REQUEST_FAILED", "Failed to request Bilibili.", 502);
  }

  return (await response.json()) as T;
}

async function fetchBilibiliText(url: string, context: ImportContext) {
  const response = await context.fetcher(url, {
    headers: context.headers
  });

  if (!response.ok) {
    throw new BilibiliImportError("BILIBILI_REQUEST_FAILED", "Failed to request Bilibili.", 502);
  }

  return response.text();
}

function unwrapEnvelope<T>(payload: BilibiliApiEnvelope<T>, code: BilibiliImportErrorCode, message: string) {
  if (payload?.code !== 0 || !payload.data) {
    throw new BilibiliImportError(code, message, code === "BILIBILI_REQUEST_FAILED" ? 502 : 400);
  }

  return payload.data;
}

async function fetchVideoInfo(bvid: string, context: ImportContext) {
  const payload = await fetchBilibiliJson<BilibiliApiEnvelope<VideoInfoData>>(
    `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`,
    context
  );
  const data = unwrapEnvelope(payload, "VIDEO_INFO_UNAVAILABLE", "Could not parse the Bilibili video information.");
  let cid = data.pages?.[0]?.cid;

  if (!cid) {
    const pagelistPayload = await fetchBilibiliJson<BilibiliApiEnvelope<PagelistEntry[]>>(
      `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}`,
      context
    );
    const pagelist = unwrapEnvelope(
      pagelistPayload,
      "VIDEO_INFO_UNAVAILABLE",
      "Could not parse the Bilibili video information."
    );
    cid = pagelist[0]?.cid;
  }

  if (!cid) {
    throw new BilibiliImportError("VIDEO_INFO_UNAVAILABLE", "Could not parse the Bilibili video information.");
  }

  return {
    title: data.title?.trim() || null,
    cid: String(cid)
  };
}

function collectPlayerSubtitles(payload: PlayerData) {
  return payload.subtitle?.subtitles || payload.data?.subtitle?.subtitles || [];
}

async function probePlayerWbi(bvid: string, cid: string, context: ImportContext): Promise<PlayerProbeResult> {
  const payload = await fetchBilibiliJson<BilibiliApiEnvelope<PlayerData>>(
    `https://api.bilibili.com/x/player/wbi/v2?bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(cid)}`,
    context
  );
  const data = unwrapEnvelope(payload, "SUBTITLE_LIST_UNAVAILABLE", "Could not resolve the subtitle information for this video.");
  return {
    strategy: "player-wbi",
    tracks: collectPlayerSubtitles(data),
    notes: []
  };
}

async function probePlayerV2(bvid: string, cid: string, context: ImportContext): Promise<PlayerProbeResult> {
  const payload = await fetchBilibiliJson<BilibiliApiEnvelope<PlayerData>>(
    `https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(cid)}`,
    context
  );
  const data = unwrapEnvelope(payload, "SUBTITLE_LIST_UNAVAILABLE", "Could not resolve the subtitle information for this video.");
  return {
    strategy: "player-v2",
    tracks: collectPlayerSubtitles(data),
    notes: []
  };
}

function extractPlayinfoJson(html: string) {
  const matches = [
    html.match(/window\.__playinfo__=([\s\S]+?)<\/script>/),
    html.match(/__playinfo__=([\s\S]+?)<\/script>/)
  ];

  const match = matches.find(Boolean);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function probePagePlayinfo(url: string, context: ImportContext): Promise<PlayerProbeResult> {
  const html = await fetchBilibiliText(url, context);
  const payload = extractPlayinfoJson(html);
  const data = payload?.data || payload;
  const tracks = collectPlayerSubtitles(data || {});

  return {
    strategy: "page-playinfo",
    tracks,
    notes: payload ? [] : ["Page HTML did not expose a parseable __playinfo__ block."]
  };
}

async function probeSubtitleTracks(
  bvid: string,
  cid: string,
  resolvedUrl: string,
  context: ImportContext,
  debug: ImportDebugState
) {
  const probes: Array<{ strategy: PlayerStrategyName; run: () => Promise<PlayerProbeResult> }> = [
    { strategy: "player-wbi", run: () => probePlayerWbi(bvid, cid, context) },
    { strategy: "player-v2", run: () => probePlayerV2(bvid, cid, context) },
    { strategy: "page-playinfo", run: () => probePagePlayinfo(resolvedUrl, context) }
  ];

  const allTracks: SubtitleItem[] = [];
  let fetchStrategy: PlayerStrategyName | null = null;

  for (const probe of probes) {
    try {
      const result = await probe.run();
      debug.playerStrategiesTried.push(result.strategy);

      if (result.notes.length) {
        debug.notes.push(...result.notes);
      }

      if (result.tracks.length) {
        allTracks.push(...result.tracks);
        fetchStrategy ||= result.strategy;
      } else {
        debug.notes.push(`${result.strategy} returned no subtitle tracks.`);
      }
    } catch (error) {
      debug.playerStrategiesTried.push(probe.strategy);
      debug.notes.push(
        error instanceof BilibiliImportError
          ? `${probe.strategy} failed: ${error.message}`
          : `${probe.strategy} failed unexpectedly.`
      );
    }
  }

  return {
    tracks: mapSubtitleTracks(allTracks),
    fetchStrategy
  };
}

export function formatBilibiliTranscript(lines: SubtitleLine[]) {
  const rawLines = lines
    .map((line) => normalizeSubtitleLine(line.content || ""))
    .filter(Boolean);

  const deduped = rawLines.filter((line, index) => line !== rawLines[index - 1]);
  const mergedSentences: string[] = [];

  for (const line of deduped) {
    const previous = mergedSentences[mergedSentences.length - 1];

    if (!previous) {
      mergedSentences.push(line);
      continue;
    }

    if (SENTENCE_END_PATTERN.test(previous) || previous.length >= 72) {
      mergedSentences.push(line);
      continue;
    }

    mergedSentences[mergedSentences.length - 1] = joinTranscriptFragment(previous, line);
  }

  const paragraphs: string[] = [];
  let currentParagraph = "";

  for (const sentence of mergedSentences) {
    if (!currentParagraph) {
      currentParagraph = sentence;
    } else {
      currentParagraph = joinTranscriptFragment(currentParagraph, sentence);
    }

    if (STRONG_BREAK_PATTERN.test(sentence) || currentParagraph.length >= 160) {
      paragraphs.push(currentParagraph);
      currentParagraph = "";
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  return {
    rawTranscriptText: deduped.join("\n"),
    normalizedTranscriptText: paragraphs.join("\n\n")
  };
}

async function fetchSubtitlePayload(url: string, context: ImportContext) {
  const response = await context.fetcher(url, {
    headers: context.headers
  });

  if (!response.ok) {
    throw new BilibiliImportError("BILIBILI_REQUEST_FAILED", "Failed to download the subtitle payload.", 502);
  }

  return (await response.json()) as SubtitlePayload;
}

export async function importBilibiliTranscript(
  input: unknown,
  fetcher: Fetcher = fetch
): Promise<BilibiliImportResult> {
  const context = createImportContext(fetcher);
  const debug: ImportDebugState = {
    playerStrategiesTried: [],
    notes: []
  };

  if (!context.usedCookie) {
    debug.notes.push("Anonymous request mode: some subtitle tracks may require a valid Bilibili cookie.");
  }

  let url: string;
  let preferredTrackId: string | undefined;

  try {
    ({ url, preferredTrackId } = bilibiliImportRequestSchema.parse(input));
  } catch {
    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Not a valid Bilibili video link.");
  }

  let bvid = "";
  let resolvedUrl = url;

  try {
    ({ bvid, resolvedUrl } = await resolveBilibiliVideoId(url, context));
  } catch (error) {
    if (error instanceof BilibiliImportError) {
      throw error;
    }

    throw new BilibiliImportError("INVALID_BILIBILI_URL", "Not a valid Bilibili video link.");
  }

  let title: string | null = null;
  let cid: string | null = null;

  try {
    const videoInfo = await fetchVideoInfo(bvid, context);
    title = videoInfo.title;
    cid = videoInfo.cid;
  } catch (error) {
    if (error instanceof BilibiliImportError) {
      throw new BilibiliImportError(
        error.code,
        error.message,
        error.status,
        buildProbeData({
          title,
          bvid,
          originalUrl: resolvedUrl,
          cid,
          usedCookie: context.usedCookie,
          playerStrategiesTried: debug.playerStrategiesTried,
          failureStage: "fetch-video-info",
          notes: debug.notes
        })
      );
    }

    throw error;
  }

  const probe = await probeSubtitleTracks(bvid, cid, resolvedUrl, context, debug);
  const subtitleTracks = probe.tracks;

  if (!subtitleTracks.length) {
    throw new BilibiliImportError(
      "SUBTITLE_UNAVAILABLE",
      "This Bilibili video does not expose downloadable subtitle tracks.",
      400,
      buildProbeData({
        title,
        bvid,
        originalUrl: resolvedUrl,
        cid,
        subtitleTracks,
        usedCookie: context.usedCookie,
        fetchStrategy: probe.fetchStrategy,
        playerStrategiesTried: debug.playerStrategiesTried,
        failureStage: "probe-subtitle-list",
        notes: debug.notes
      })
    );
  }

  const selection = selectTrack(subtitleTracks, preferredTrackId);

  if (!selection) {
    throw new BilibiliImportError(
      "SUBTITLE_TRACK_UNAVAILABLE",
      "A subtitle track could not be selected for import.",
      400,
      buildProbeData({
        title,
        bvid,
        originalUrl: resolvedUrl,
        cid,
        subtitleTracks,
        usedCookie: context.usedCookie,
        fetchStrategy: probe.fetchStrategy,
        playerStrategiesTried: debug.playerStrategiesTried,
        failureStage: "select-track",
        notes: debug.notes
      })
    );
  }

  if (preferredTrackId && selection.reason !== "preferred-track") {
    debug.notes.push(`Preferred track "${preferredTrackId}" was not found in the latest subtitle probe result.`);
  }

  if (!selection.track.subtitleUrl) {
    throw new BilibiliImportError(
      "SUBTITLE_TRACK_UNAVAILABLE",
      "A subtitle track was detected, but it does not expose a downloadable subtitle URL.",
      400,
      buildProbeData({
        title,
        bvid,
        originalUrl: resolvedUrl,
        cid,
        subtitleTracks,
        selectedTrackId: selection.track.id,
        usedCookie: context.usedCookie,
        fetchStrategy: probe.fetchStrategy,
        playerStrategiesTried: debug.playerStrategiesTried,
        subtitleLanguage: selection.track.language,
        selectedTrackReason: selection.reason,
        failureStage: "select-track",
        notes: debug.notes
      })
    );
  }

  try {
    const subtitlePayload = await fetchSubtitlePayload(selection.track.subtitleUrl, context);
    const transcript = formatBilibiliTranscript(subtitlePayload.body || []);

    if (!transcript.normalizedTranscriptText.trim()) {
      throw new BilibiliImportError(
        "SUBTITLE_TRACK_UNAVAILABLE",
        "The selected subtitle track was available, but the downloaded subtitle payload was empty.",
        400
      );
    }

    return buildProbeData({
      title,
      bvid,
      originalUrl: resolvedUrl,
      subtitleTracks,
      selectedTrackId: selection.track.id,
      rawTranscriptText: transcript.rawTranscriptText,
      normalizedTranscriptText: transcript.normalizedTranscriptText,
      cid,
      usedCookie: context.usedCookie,
      fetchStrategy: probe.fetchStrategy,
      playerStrategiesTried: debug.playerStrategiesTried,
      subtitleLanguage: selection.track.language,
      selectedTrackReason: selection.reason,
      notes: debug.notes
    });
  } catch (error) {
    if (error instanceof BilibiliImportError) {
      throw new BilibiliImportError(
        error.code,
        error.message,
        error.status,
        buildProbeData({
          title,
          bvid,
          originalUrl: resolvedUrl,
          subtitleTracks,
          selectedTrackId: selection.track.id,
          cid,
          usedCookie: context.usedCookie,
          fetchStrategy: probe.fetchStrategy,
          playerStrategiesTried: debug.playerStrategiesTried,
          subtitleLanguage: selection.track.language,
          selectedTrackReason: selection.reason,
          failureStage: "download-subtitle",
          notes: debug.notes
        })
      );
    }

    throw error;
  }
}
