import { useAppI18n } from "../../hooks/useAppI18n";
import type { ReactNode } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  showCloseButton?: boolean;
}

export function ModalShell({
  open,
  title,
  description,
  children,
  onClose,
  showCloseButton = true
}: ModalShellProps) {
  const { t } = useAppI18n();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/55 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] md:items-center md:p-4">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] md:max-h-[calc(100dvh-2rem)]">
        <div className="sticky top-0 z-10 flex flex-none items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              className="shrink-0 rounded-xl px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
              type="button"
            >
              {t.common.close}
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
