import { create } from "zustand";

import type { AppLanguage } from "../types/domain";
import { readStoredAppLanguage, writeStoredAppLanguage } from "../lib/i18n";

interface SettingsState {
  appLanguage: AppLanguage;
  setAppLanguage: (language: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  appLanguage: readStoredAppLanguage(),
  setAppLanguage: (appLanguage) => {
    writeStoredAppLanguage(appLanguage);
    set({ appLanguage });
  }
}));
