import { describe, expect, it } from "vitest";

import { APP_LANGUAGE_STORAGE_KEY, readStoredAppLanguage, writeStoredAppLanguage } from "./i18n";

describe("i18n storage", () => {
  it("writes and reads the persisted app language", () => {
    writeStoredAppLanguage("en");

    expect(window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(readStoredAppLanguage()).toBe("en");
  });

  it("falls back to zh-CN for invalid values", () => {
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, "fr");

    expect(readStoredAppLanguage()).toBe("zh-CN");
  });
});
