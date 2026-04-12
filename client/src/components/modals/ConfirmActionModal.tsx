import { useAppI18n } from "../../hooks/useAppI18n";
import { ModalShell } from "../common/ModalShell";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "确认",
  danger = false,
  onClose,
  onConfirm
}: ConfirmActionModalProps) {
  const { t } = useAppI18n();

  return (
    <ModalShell open={open} title={title} description={description} onClose={onClose} showCloseButton={false}>
      <div className="flex justify-end gap-3">
        <button
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
          onClick={onClose}
          type="button"
        >
          {t.common.cancel}
        </button>
        <button
          className={`rounded-2xl px-4 py-3 text-sm font-medium text-white ${
            danger ? "bg-rose-600" : "bg-slate-900"
          }`}
          onClick={() => {
            void onConfirm();
          }}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
