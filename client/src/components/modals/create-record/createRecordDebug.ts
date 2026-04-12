const CREATE_RECORD_DEBUG_STORAGE_KEY = "svka:create-record-debug";

function readDebugFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(CREATE_RECORD_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isCreateRecordDebugEnabled() {
  return readDebugFlag();
}

export function createRecordDebugLog(event: string, payload: Record<string, unknown>) {
  if (!readDebugFlag()) {
    return;
  }

  console.debug(`[CreateRecordDebug] ${event}`, payload);
}
