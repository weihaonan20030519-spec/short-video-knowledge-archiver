const REQUEST_SOURCE = "svka-extension";
const REQUEST_TYPE = "SVKA_COLLECT_PAGE_IMPORT";
const RESPONSE_SOURCE = "svka-page";
const RESPONSE_TYPE = "SVKA_COLLECT_PAGE_IMPORT_RESULT";
const SCRIPT_ID = "svka-injected-page-bridge";

const pendingRequests = new Map();
let injectedScriptPromise = null;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function collectDescriptionText() {
  const selectors = [
    ".video-desc-container .desc-info-text",
    ".desc-info-text",
    ".video-info-detail",
    ".media-desc",
    "[data-testid='video-desc']"
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = normalizeText(node?.textContent);
    if (text) {
      return text;
    }
  }

  return "";
}

function collectVisibleCaptionText() {
  const selectors = [
    ".bpx-player-subtitle-wrap .bpx-player-subtitle-item-text",
    ".bpx-player-subtitle-wrap .bpx-player-subtitle-item",
    ".bilibili-player-video-subtitle-content",
    ".bpx-player-subtitle-panel-text",
    "[class*='subtitle']"
  ];
  const texts = [];

  for (const selector of selectors) {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      const text = normalizeText(node.textContent);
      if (text && !texts.includes(text)) {
        texts.push(text);
      }
    }
  }

  return texts.join(" ").trim();
}

function collectVisibleText() {
  const selectors = [
    ".video-desc-container",
    ".video-info-container",
    "#viewbox_report",
    ".video-info-detail",
    ".media-desc"
  ];
  const collected = [];

  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = normalizeText(node?.textContent);
    if (text && !collected.includes(text)) {
      collected.push(text);
    }
  }

  return collected.join("\n\n").trim().slice(0, 2000);
}

function ensureInjectedPageReader() {
  if (document.getElementById(SCRIPT_ID)) {
    return Promise.resolve();
  }

  if (injectedScriptPromise) {
    return injectedScriptPromise;
  }

  injectedScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = chrome.runtime.getURL("injectedPageBridge.js");
    script.async = false;
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = () => {
      injectedScriptPromise = null;
      reject(new Error("page_reader_injection_failed"));
    };
    (document.head || document.documentElement).appendChild(script);
  });

  return injectedScriptPromise;
}

function requestPageImport(preferredTrackId) {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureInjectedPageReader();
    } catch (error) {
      reject(error);
      return;
    }

    const requestId = `svka-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeoutId = window.setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("page_world_timeout"));
    }, 15000);

    pendingRequests.set(requestId, {
      resolve,
      reject,
      timeoutId
    });

    window.postMessage(
      {
        source: REQUEST_SOURCE,
        type: REQUEST_TYPE,
        requestId,
        preferredTrackId: preferredTrackId || null
      },
      window.location.origin
    );
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== RESPONSE_SOURCE || data.type !== RESPONSE_TYPE || typeof data.requestId !== "string") {
    return;
  }

  const pending = pendingRequests.get(data.requestId);
  if (!pending) {
    return;
  }

  pendingRequests.delete(data.requestId);
  window.clearTimeout(pending.timeoutId);

  if (data.error) {
    pending.reject(new Error(data.error.message || "page_world_failed"));
    return;
  }

  pending.resolve(data.payload || null);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "collect-dom-context") {
    sendResponse({
      title: document.title || "",
      url: window.location.href,
      descriptionText: collectDescriptionText(),
      visibleText: collectVisibleText(),
      visibleCaptionText: collectVisibleCaptionText()
    });
    return false;
  }

  if (message?.type !== "collect-page-import") {
    return false;
  }

  void requestPageImport(message.preferredTrackId)
    .then((pagePayload) => {
      const notes = [...(pagePayload?.debug?.notes || [])];
      sendResponse({
        ...pagePayload,
        descriptionText: collectDescriptionText(),
        visibleText: collectVisibleText(),
        visibleCaptionText: collectVisibleCaptionText(),
        debug: {
          ...(pagePayload?.debug || {}),
          notes: [
            ...(message.preferredTrackId ? [`extension_requested_track_body:${message.preferredTrackId}`] : []),
            ...notes,
            ...(message.preferredTrackId ? [`extension_received_track_body:${message.preferredTrackId}`] : ["extension_received_page_cache_payload"])
          ]
        }
      });
    })
    .catch((error) => {
      sendResponse({
        page: {
          title: document.title || "",
          url: window.location.href,
          platform: "bilibili"
        },
        descriptionText: collectDescriptionText(),
        visibleText: collectVisibleText(),
        visibleCaptionText: collectVisibleCaptionText(),
        subtitleTracks: [],
        selectedTrackId: null,
        debug: {
          fetchStrategy: "browser-context-page-world",
          notes: [
            "page_world_started",
            `page_world_exception:${error instanceof Error ? error.message : "unknown"}`,
            "extension_received_page_cache_payload"
          ]
        }
      });
    });

  return true;
});

void ensureInjectedPageReader();
