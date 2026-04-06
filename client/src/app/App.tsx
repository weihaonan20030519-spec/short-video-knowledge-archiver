import { useEffect, useState } from "react";

import { useAppI18n } from "../hooks/useAppI18n";
import { Providers } from "./providers";
import { HomePage } from "../pages/HomePage";

export default function App() {
  const { appLanguage, t } = useAppI18n();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = appLanguage;
  }, [appLanguage]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center overflow-hidden text-sm text-slate-700">
        {t.app.loading}
      </div>
    );
  }

  return (
    <Providers>
      <HomePage />
    </Providers>
  );
}
