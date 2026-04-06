import { describe, expect, it, vi } from "vitest";

import { ImportSessionStore } from "./importSessionStore.js";

describe("ImportSessionStore", () => {
  it("creates sessions and exposes the active pending session", () => {
    const store = new ImportSessionStore(60_000);
    const session = store.createSession();

    expect(store.getActivePendingSession()).toEqual(session);
    expect(store.getSessionState(session.sessionToken)?.status).toBe("pending");
  });

  it("marks sessions ready after submit", () => {
    const store = new ImportSessionStore(60_000);
    const session = store.createSession();
    const state = store.submitResult(session.sessionToken, {
      source: "browser_context",
      platform: "bilibili",
      outcome: "complete",
      originalUrl: "https://www.bilibili.com/video/BV1xx411c7mD/",
      detectedTitle: "导入标题",
      detectedContent: "正文",
      contentCompleteness: "full",
      availableTracks: [],
      selectedTrackId: null,
      warningCodes: [],
      canCreateRecord: true,
      shouldPromptManualInput: false
    });

    expect(state?.status).toBe("ready");
    expect(store.getActivePendingSession()).toBeNull();
  });

  it("returns expired for outdated sessions", () => {
    vi.useFakeTimers();
    const store = new ImportSessionStore(1_000);
    const session = store.createSession();

    vi.advanceTimersByTime(1_500);

    expect(store.getSessionState(session.sessionToken)?.status).toBe("expired");
    vi.useRealTimers();
  });
});
