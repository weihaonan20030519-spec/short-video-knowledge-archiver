(function () {
  if (window.__SVKA_PAGE_BRIDGE__) {
    return;
  }

  const REQUEST_SOURCE = "svka-extension";
  const REQUEST_TYPE = "SVKA_COLLECT_PAGE_IMPORT";
  const RESPONSE_SOURCE = "svka-page";
  const RESPONSE_TYPE = "SVKA_COLLECT_PAGE_IMPORT_RESULT";
  const CACHE_KEY = "__SVKA_SUBTITLE_CACHE__";
  const TRACKS_KEY = "__SVKA_SUBTITLE_TRACKS__";
  const NOTES_KEY = "__SVKA_PAGE_BRIDGE_NOTES__";
  const WAITERS_KEY = "__SVKA_PAGE_BRIDGE_WAITERS__";
  const BRIDGE_KEY = "__SVKA_PAGE_BRIDGE__";
  const FETCH_HOOK_KEY = "__SVKA_FETCH_HOOK_INSTALLED__";
  const XHR_HOOK_KEY = "__SVKA_XHR_HOOK_INSTALLED__";
  const TRACK_WAIT_TIMEOUT_MS = 2200;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getNotes() {
    if (!Array.isArray(window[NOTES_KEY])) {
      window[NOTES_KEY] = [];
    }

    return window[NOTES_KEY];
  }

  function pushNote(note) {
    if (!note) {
      return;
    }

    const notes = getNotes();
    notes.push(note);
    if (notes.length > 80) {
      notes.splice(0, notes.length - 80);
    }
  }

  function getCache() {
    if (!window[CACHE_KEY]) {
      window[CACHE_KEY] = {
        byTrackId: {},
        bySubtitleUrl: {}
      };
    }

    return window[CACHE_KEY];
  }

  function getKnownTracks() {
    if (!Array.isArray(window[TRACKS_KEY])) {
      window[TRACKS_KEY] = [];
    }

    return window[TRACKS_KEY];
  }

  function getWaiters() {
    if (!window[WAITERS_KEY]) {
      window[WAITERS_KEY] = {};
    }

    return window[WAITERS_KEY];
  }

  function resolveTrackWaiters(trackId, entry) {
    const waiters = getWaiters();
    const listeners = waiters[trackId] || [];
    delete waiters[trackId];
    for (const listener of listeners) {
      listener(entry);
    }
  }

  function sentenceLikeCount(text) {
    return text
      .split(/[。！？!?；;]+|\n+/)
      .map((part) => part.trim())
      .filter(Boolean).length;
  }

  function createTrackId(rawTrack, index) {
    const subtitleUrl = normalizeText(rawTrack?.subtitle_url || rawTrack?.subtitleUrl || rawTrack?.url);
    const langKey = normalizeText(rawTrack?.lan || rawTrack?.lang_key || rawTrack?.langKey || rawTrack?.id_str);
    const urlFragment = subtitleUrl ? subtitleUrl.split("/").pop()?.split("?")[0] || "" : "";
    return normalizeText(rawTrack?.id || rawTrack?.trackId || langKey || urlFragment || `track-${index + 1}`);
  }

  function createTrackLabel(rawTrack, fallbackId) {
    return (
      normalizeText(rawTrack?.lan_doc || rawTrack?.label || rawTrack?.language || rawTrack?.lang || rawTrack?.lang_key) ||
      fallbackId
    );
  }

  function extractCueItems(payload) {
    if (!payload) {
      return [];
    }

    const directCandidates = [payload.body, payload.paragraphs, payload.cues, payload.subtitles, payload.items];
    for (const candidate of directCandidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    return [];
  }

  function textFromCue(cue) {
    if (!cue || typeof cue !== "object") {
      return normalizeText(cue);
    }

    return normalizeText(cue.content || cue.text || cue.from_content || cue.value || cue.sentence || cue.transcript);
  }

  function parseSubtitlePayload(payload) {
    const cues = extractCueItems(payload)
      .map((cue, index) => ({
        index,
        text: textFromCue(cue)
      }))
      .filter((cue) => cue.text);
    const text = normalizeText(cues.map((cue) => cue.text).join("\n"));

    return {
      cues,
      text
    };
  }

  function isSubtitleLikeUrl(url) {
    const normalizedUrl = normalizeText(url).toLowerCase();
    if (!normalizedUrl) {
      return false;
    }

    return (
      normalizedUrl.includes("subtitle") ||
      normalizedUrl.includes("caption") ||
      normalizedUrl.includes("transcript") ||
      normalizedUrl.includes("/sub/") ||
      normalizedUrl.includes("aisubtitle")
    );
  }

  function looksLikeSubtitlePayload(payload) {
    if (!payload) {
      return false;
    }

    const cues = extractCueItems(payload);
    if (!cues.length) {
      return false;
    }

    return cues.some((cue) => Boolean(textFromCue(cue)));
  }

  function subtitleUrlToAbsolute(url) {
    const normalizedUrl = normalizeText(url);
    if (!normalizedUrl) {
      return "";
    }

    if (normalizedUrl.startsWith("//")) {
      return `${window.location.protocol}${normalizedUrl}`;
    }

    return normalizedUrl;
  }

  function collectCandidateSources() {
    const playinfo = window.__playinfo__ || window.__PLAYINFO__ || null;
    const initialState = window.__INITIAL_STATE__ || null;
    const player = window.player || window.__bpx_player__ || window.__BILI_PLAYER__ || null;
    const videoData = initialState?.videoData || initialState?.videoInfo || null;

    return {
      playinfo,
      initialState,
      player,
      videoData
    };
  }

  function describeSourcePresence(sources) {
    const subtitleLengths = [];
    const playinfoSubtitles =
      sources.playinfo?.data?.subtitle?.subtitles ||
      sources.playinfo?.subtitle?.subtitles ||
      [];
    const initialStateSubtitles =
      sources.initialState?.videoData?.subtitle?.subtitles ||
      sources.initialState?.videoInfo?.subtitle?.subtitles ||
      [];

    if (Array.isArray(playinfoSubtitles)) {
      subtitleLengths.push(`playinfo:${playinfoSubtitles.length}`);
    }

    if (Array.isArray(initialStateSubtitles)) {
      subtitleLengths.push(`initial:${initialStateSubtitles.length}`);
    }

    return `initialState=${sources.initialState ? "present" : "absent"};playinfo=${
      sources.playinfo ? "present" : "absent"
    };player=${sources.player ? "present" : "absent"};videoData=${sources.videoData ? "present" : "absent"};subtitleLengths=${subtitleLengths.join(",") || "none"}`;
  }

  function collectSubtitleCandidates(sources) {
    const rawCandidates = [];
    const pushCandidates = (items) => {
      if (!Array.isArray(items)) {
        return;
      }

      rawCandidates.push(...items);
    };

    pushCandidates(sources.playinfo?.data?.subtitle?.subtitles);
    pushCandidates(sources.playinfo?.subtitle?.subtitles);
    pushCandidates(sources.initialState?.videoData?.subtitle?.subtitles);
    pushCandidates(sources.initialState?.videoInfo?.subtitle?.subtitles);
    pushCandidates(sources.videoData?.subtitle?.subtitles);

    const uniqueTracks = [];
    const seen = new Set();

    rawCandidates.forEach((track, index) => {
      const id = createTrackId(track, index);
      if (!id || seen.has(id)) {
        return;
      }

      seen.add(id);
      uniqueTracks.push({
        id,
        label: createTrackLabel(track, id),
        language: normalizeText(track?.lan || track?.lang_key || track?.language || track?.lang) || null,
        isAiSubtitle: Boolean(track?.ai_type || track?.is_ai || track?.isAiSubtitle),
        subtitleUrl: subtitleUrlToAbsolute(track?.subtitle_url || track?.subtitleUrl || track?.url),
        rawTrack: track
      });
    });

    return uniqueTracks;
  }

  function cacheSubtitleBody(track, payload, source) {
    const parsed = parseSubtitlePayload(payload);
    if (!parsed.text) {
      return null;
    }

    const cache = getCache();
    const entry = {
      trackId: track.id,
      subtitleUrl: track.subtitleUrl || null,
      rawPayload: payload,
      normalizedCues: parsed.cues,
      plainText: parsed.text,
      source,
      updatedAt: Date.now()
    };

    cache.byTrackId[track.id] = entry;
    if (track.subtitleUrl) {
      cache.bySubtitleUrl[track.subtitleUrl] = entry;
    }

    pushNote(`page_world_cached_subtitle_body:${track.id}:length=${parsed.text.length}`);
    resolveTrackWaiters(track.id, entry);
    return entry;
  }

  function hydrateTracksFromMemory(tracks) {
    let foundAny = false;

    for (const track of tracks) {
      const rawPayload =
        track.rawTrack?.body ||
        track.rawTrack?.cues ||
        track.rawTrack?.paragraphs ||
        track.rawTrack?.subtitle;
      if (!rawPayload) {
        continue;
      }

      const cached = cacheSubtitleBody(track, rawPayload, "memory");
      if (cached) {
        pushNote(`page_world_existing_body_found:${track.id}`);
        foundAny = true;
      }
    }

    if (!foundAny) {
      pushNote("page_world_existing_body_missing");
    }
  }

  function updateKnownTracks(tracks) {
    const existing = getKnownTracks();
    const merged = new Map(existing.map((track) => [track.id, track]));
    const cache = getCache();

    for (const track of tracks) {
      merged.set(track.id, {
        id: track.id,
        label: track.label,
        language: track.language,
        isAiSubtitle: track.isAiSubtitle,
        subtitleUrl: track.subtitleUrl || null
      });

      if (track.subtitleUrl && cache.bySubtitleUrl[track.subtitleUrl] && !cache.byTrackId[track.id]) {
        const remappedEntry = {
          ...cache.bySubtitleUrl[track.subtitleUrl],
          trackId: track.id
        };
        cache.byTrackId[track.id] = remappedEntry;
      }
    }

    window[TRACKS_KEY] = Array.from(merged.values());
  }

  function getKnownTrackByUrl(url) {
    const normalizedUrl = subtitleUrlToAbsolute(url);
    if (!normalizedUrl) {
      return null;
    }

    return getKnownTracks().find((track) => subtitleUrlToAbsolute(track.subtitleUrl) === normalizedUrl) || null;
  }

  function installFetchHook() {
    if (window[FETCH_HOOK_KEY]) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function patchedFetch(...args) {
      const response = await originalFetch(...args);
      try {
        const input = args[0];
        const url =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : normalizeText(input?.url);
        const normalizedUrl = subtitleUrlToAbsolute(url);

        if (isSubtitleLikeUrl(normalizedUrl) || getKnownTrackByUrl(normalizedUrl)) {
          const cloned = response.clone();
          void cloned
            .json()
            .then((payload) => {
              if (!looksLikeSubtitlePayload(payload)) {
                return;
              }

              const track = getKnownTrackByUrl(normalizedUrl) || {
                id: normalizedUrl,
                label: normalizedUrl.split("/").pop() || normalizedUrl,
                language: null,
                isAiSubtitle: false,
                subtitleUrl: normalizedUrl
              };
              pushNote(`page_world_intercepted_subtitle_response:${track.id}`);
              cacheSubtitleBody(track, payload, "intercepted_fetch");
            })
            .catch(() => {});
        }
      } catch {
        // Ignore hook side effects to avoid breaking page behavior.
      }

      return response;
    };

    window[FETCH_HOOK_KEY] = true;
    pushNote("page_world_fetch_hook_installed");
  }

  function installXhrHook() {
    if (window[XHR_HOOK_KEY]) {
      return;
    }

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__svkaSubtitleUrl = subtitleUrlToAbsolute(url);
      return originalOpen.call(this, method, url, ...rest);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function patchedSend(...args) {
      this.addEventListener("loadend", () => {
        try {
          const url = this.__svkaSubtitleUrl || subtitleUrlToAbsolute(this.responseURL);
          if (!url || (!isSubtitleLikeUrl(url) && !getKnownTrackByUrl(url))) {
            return;
          }

          const responseText = typeof this.responseText === "string" ? this.responseText : "";
          if (!responseText) {
            return;
          }

          const payload = JSON.parse(responseText);
          if (!looksLikeSubtitlePayload(payload)) {
            return;
          }

          const track = getKnownTrackByUrl(url) || {
            id: url,
            label: url.split("/").pop() || url,
            language: null,
            isAiSubtitle: false,
            subtitleUrl: url
          };

          pushNote(`page_world_intercepted_subtitle_response:${track.id}`);
          cacheSubtitleBody(track, payload, "intercepted_xhr");
        } catch {
          // Ignore hook side effects to avoid breaking page behavior.
        }
      });

      return originalSend.call(this, ...args);
    };

    window[XHR_HOOK_KEY] = true;
    pushNote("page_world_xhr_hook_installed");
  }

  function getCachedSubtitleForTrack(trackId) {
    const cache = getCache();
    return cache.byTrackId[trackId] || null;
  }

  function getBestAvailableSubtitle(preferredTrackId) {
    if (preferredTrackId) {
      const preferred = getCachedSubtitleForTrack(preferredTrackId);
      if (preferred) {
        return preferred;
      }
    }

    return Object.values(getCache().byTrackId).sort((left, right) => right.updatedAt - left.updatedAt)[0] || null;
  }

  function triggerPlayerTrackSelection(trackId) {
    pushNote(`page_world_triggered_player_track_selection:${trackId}`);
    try {
      const track = getKnownTracks().find((item) => item.id === trackId);
      if (!track) {
        return false;
      }

      const selectors = [
        `[data-value="${trackId}"]`,
        `[data-key="${trackId}"]`,
        `[data-track-id="${trackId}"]`
      ];

      for (const selector of selectors) {
        const node = document.querySelector(selector);
        if (node instanceof HTMLElement) {
          node.click();
          return true;
        }
      }

      const buttonCandidates = Array.from(document.querySelectorAll("li,button,span,div"));
      const matchingNode = buttonCandidates.find((node) => normalizeText(node.textContent) === track.label);
      if (matchingNode instanceof HTMLElement) {
        matchingNode.click();
        return true;
      }
    } catch {
      // Ignore trigger failures.
    }

    return false;
  }

  function waitForSubtitleForTrack(trackId, timeoutMs) {
    const existing = getCachedSubtitleForTrack(trackId);
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      const waiters = getWaiters();
      if (!Array.isArray(waiters[trackId])) {
        waiters[trackId] = [];
      }

      const timeoutId = window.setTimeout(() => {
        waiters[trackId] = (waiters[trackId] || []).filter((listener) => listener !== onResolve);
        pushNote(`page_world_wait_track_timeout:${trackId}`);
        resolve(null);
      }, timeoutMs);

      const onResolve = (entry) => {
        window.clearTimeout(timeoutId);
        resolve(entry);
      };

      waiters[trackId].push(onResolve);
    });
  }

  async function collectRequestPayload(preferredTrackId) {
    pushNote("page_world_request_received");
    const sources = collectCandidateSources();
    pushNote(`page_world_source_presence:${describeSourcePresence(sources)}`);
    const tracks = collectSubtitleCandidates(sources);
    pushNote(`page_world_track_count:${tracks.length}`);
    updateKnownTracks(tracks);
    hydrateTracksFromMemory(tracks);
    const cachedTrackIds = tracks.map((track) => track.id).filter((trackId) => Boolean(getCachedSubtitleForTrack(trackId)));
    if (cachedTrackIds.length) {
      pushNote(`page_world_existing_body_found:${cachedTrackIds.join(",")}`);
    }

    for (const track of tracks) {
      pushNote(`page_world_track_discovered:${track.id}`);
    }

    const selectedTrackId = preferredTrackId || tracks[0]?.id || null;
    let selectedTrackBody = selectedTrackId ? getCachedSubtitleForTrack(selectedTrackId) : null;

    if (!selectedTrackBody && selectedTrackId) {
      triggerPlayerTrackSelection(selectedTrackId);
      selectedTrackBody = await waitForSubtitleForTrack(selectedTrackId, TRACK_WAIT_TIMEOUT_MS);
    }

    for (const track of tracks) {
      if (track.id === selectedTrackId || getCachedSubtitleForTrack(track.id)) {
        continue;
      }

      const triggered = triggerPlayerTrackSelection(track.id);
      if (!triggered) {
        continue;
      }

      await waitForSubtitleForTrack(track.id, 1200);
    }

    const hydratedTracks = tracks.map((track) => {
      const cached = getCachedSubtitleForTrack(track.id);
      return {
        id: track.id,
        label: track.label,
        language: track.language || null,
        isAiSubtitle: track.isAiSubtitle,
        subtitleUrl: track.subtitleUrl || null,
        contentText: cached?.plainText || null,
        contentSource: cached ? "full_track" : "unavailable",
        cueCount: cached?.normalizedCues?.length ?? 0,
        bodyLoadStatus: cached ? "loaded" : "unavailable",
        bodyLoadError: null
      };
    });

    const bestSubtitle = selectedTrackBody || getBestAvailableSubtitle(preferredTrackId);
    const page = {
      title: normalizeText(document.title),
      url: window.location.href,
      platform: "bilibili",
      bvid: normalizeText(sources.initialState?.bvid || sources.videoData?.bvid || sources.videoData?.bvidInfo?.bvid) || null,
      cid:
        normalizeText(
          sources.playinfo?.data?.dash?.cid ||
            sources.playinfo?.data?.cid ||
            sources.initialState?.videoData?.cid ||
            sources.videoData?.cid
        ) || null
    };

    return {
      page,
      selectedTrackId,
      subtitleTracks: hydratedTracks,
      debug: {
        fetchStrategy: "browser-context-page-cache",
        notes: [...getNotes()]
      },
      bestSubtitleText: bestSubtitle?.plainText || null
    };
  }

  installFetchHook();
  installXhrHook();
  pushNote("page_world_started");

  window[BRIDGE_KEY] = {
    getAvailableTracks() {
      return getKnownTracks();
    },
    getCachedSubtitleForTrack,
    waitForSubtitleForTrack,
    triggerPlayerTrackSelection,
    getBestAvailableSubtitle
  };

  window.addEventListener("message", async (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== REQUEST_SOURCE || data.type !== REQUEST_TYPE || typeof data.requestId !== "string") {
      return;
    }

    try {
      const payload = await collectRequestPayload(data.preferredTrackId || null);
      window.postMessage(
        {
          source: RESPONSE_SOURCE,
          type: RESPONSE_TYPE,
          requestId: data.requestId,
          payload
        },
        window.location.origin
      );
    } catch (error) {
      pushNote(`page_world_exception:${error instanceof Error ? error.message : "unknown"}`);
      window.postMessage(
        {
          source: RESPONSE_SOURCE,
          type: RESPONSE_TYPE,
          requestId: data.requestId,
          error: {
            message: error instanceof Error ? error.message : "unknown"
          }
        },
        window.location.origin
      );
    }
  });
})();
