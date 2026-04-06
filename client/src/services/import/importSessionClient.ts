import type {
  BrowserContextImportActiveSessionResponse,
  BrowserContextPayload,
  BrowserContextTrackRefetchResponse,
  BrowserContextImportSessionCreateResponse,
  BrowserContextImportSessionGetResponse,
  BrowserContextImportSubmitResponse
} from "../../types/api";
import { getApiBaseUrl } from "../apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function createBrowserContextSession() {
  const response = await fetch(`${API_BASE_URL}/api/import/browser-context/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return readJson<BrowserContextImportSessionCreateResponse>(response);
}

export async function getBrowserContextSession(sessionToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/import/browser-context/session/${sessionToken}`);
  return readJson<BrowserContextImportSessionGetResponse>(response);
}

export async function getActiveBrowserContextSession() {
  const response = await fetch(`${API_BASE_URL}/api/import/browser-context/session/active`);
  return readJson<BrowserContextImportActiveSessionResponse>(response);
}

export async function submitBrowserContextPayload(sessionToken: string, payload: BrowserContextPayload) {
  const response = await fetch(`${API_BASE_URL}/api/import/browser-context/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionToken,
      payload
    })
  });

  return readJson<BrowserContextImportSubmitResponse>(response);
}

export async function refetchBrowserContextTrack(sessionToken: string, trackId: string) {
  const response = await fetch(`${API_BASE_URL}/api/import/browser-context/session/${sessionToken}/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      trackId
    })
  });

  return readJson<BrowserContextTrackRefetchResponse>(response);
}
