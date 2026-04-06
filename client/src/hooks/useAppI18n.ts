import { getMessages } from "../lib/i18n";
import { useSettingsStore } from "../stores/settingsStore";

export function useAppI18n() {
  const appLanguage = useSettingsStore((state) => state.appLanguage);
  const setAppLanguage = useSettingsStore((state) => state.setAppLanguage);

  return {
    appLanguage,
    setAppLanguage,
    t: getMessages(appLanguage)
  };
}
