import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { db } from "../db/database";
import { APP_LANGUAGE_STORAGE_KEY } from "../lib/i18n";
import { useQueryStore } from "../stores/queryStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";

beforeEach(async () => {
  await db.delete();
  await db.open();

  useUIStore.setState({
    selectedRecordId: null,
    createModalOpen: false,
    showOriginalAiResult: false
  });

  window.localStorage.removeItem(APP_LANGUAGE_STORAGE_KEY);
  useSettingsStore.setState({
    appLanguage: "zh-CN"
  });

  useQueryStore.setState({
    activeFilter: "all",
    searchQuery: "",
    selectedFolderId: null,
    selectedTagId: null
  });

  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});
