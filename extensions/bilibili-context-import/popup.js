import { DEFAULT_LOCALE, getMessage } from "./messages.js";

const API_BASE_URL = "http://localhost:3001";
const locale = DEFAULT_LOCALE;
const popupTitle = document.getElementById("popupTitle");
const popupSubtitle = document.getElementById("popupSubtitle");
const pageStatus = document.getElementById("pageStatus");
const statusText = document.getElementById("statusText");
const submitButton = document.getElementById("submitButton");

let activeTab = null;
let activeSession = null;

function t(key) {
  return getMessage(key, locale);
}

function setStatus(messageKey) {
  statusText.textContent = t(messageKey);
}

function localizeStaticText() {
  document.documentElement.lang = locale;
  document.title = t("popupTitle");
  popupTitle.textContent = t("popupTitle");
  popupSubtitle.textContent = t("popupSubtitle");
  pageStatus.textContent = t("checkingPage");
  submitButton.textContent = t("submitButton");
  statusText.textContent = "";
}

function isBilibiliVideoUrl(url) {
  return /^https:\/\/www\.bilibili\.com\/video\//i.test(url || "");
}

function isServiceUnavailable(error) {
  return error instanceof TypeError;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const json = await response.json();

  if (!response.ok || json?.success === false) {
    throw new Error(json?.error?.message || "request_failed");
  }

  return json;
}

async function getPendingSession() {
  const json = await requestJson(`${API_BASE_URL}/api/import/browser-context/session/active`);
  return json.data;
}

async function collectPageImport(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "collect-page-import" });
  } catch {
    return null;
  }
}

async function submitImport() {
  if (!activeTab?.id || !activeSession?.sessionToken) {
    setStatus("noSession");
    return;
  }

  submitButton.disabled = true;
  setStatus("collecting");

  try {
    const payload = await collectPageImport(activeTab.id);
    if (!payload) {
      throw new Error("page_context_unavailable");
    }

    payload.debug = payload.debug || {};
    payload.debug.notes = [...(payload.debug.notes || []), "extension_submitted_payload"];

    const json = await requestJson(`${API_BASE_URL}/api/import/browser-context/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionToken: activeSession.sessionToken,
        payload
      })
    });

    const result = json?.data?.result;
    setStatus(result?.shouldPromptManualInput ? "submitSuccessNeedsManual" : "submitSuccess");
  } catch (error) {
    if (isServiceUnavailable(error)) {
      setStatus("localServerUnavailable");
    } else {
      setStatus("submitFailed");
    }
  } finally {
    submitButton.disabled = false;
  }
}

async function init() {
  localizeStaticText();
  activeTab = await getActiveTab();

  if (!activeTab || !isBilibiliVideoUrl(activeTab.url)) {
    pageStatus.textContent = t("pageNotSupported");
    submitButton.disabled = true;
    return;
  }

  pageStatus.textContent = t("pageReady");

  try {
    activeSession = await getPendingSession();
  } catch (error) {
    setStatus(isServiceUnavailable(error) ? "localServerUnavailable" : "unknownError");
    submitButton.disabled = true;
    return;
  }

  if (!activeSession) {
    setStatus("noSession");
    submitButton.disabled = true;
    return;
  }

  setStatus("sessionReady");
  submitButton.disabled = false;
}

submitButton.addEventListener("click", () => {
  void submitImport();
});

void init();
