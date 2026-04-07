import type { MessageDictionary } from "../../../lib/i18n";
import {
  getCreateRecordModeLabel,
  getCreateRecordModeOrder
} from "../../../features/create-record/createRecordModeConfig";
import type { CreateRecordUiMode } from "../../../features/create-record/createRecordUiMode";

interface CreateRecordModeSwitcherProps {
  mode: CreateRecordUiMode;
  onModeChange: (mode: CreateRecordUiMode) => void;
  t: MessageDictionary;
}

export function CreateRecordModeSwitcher({
  mode,
  onModeChange,
  t
}: CreateRecordModeSwitcherProps) {
  return (
    <div className="space-y-2" data-testid="create-record-mode-switcher">
      <div className="flex flex-wrap gap-2">
        {getCreateRecordModeOrder().map((value) => (
          <button
            key={value}
            aria-pressed={mode === value}
            className={`rounded-2xl border px-3.5 py-2.5 text-sm transition ${
              mode === value
                ? "border-teal-400 bg-teal-50 text-teal-950"
                : "border-slate-200 bg-white text-slate-700"
            }`}
            onClick={() => onModeChange(value)}
            type="button"
          >
            {getCreateRecordModeLabel(t, value)}
          </button>
        ))}
      </div>
    </div>
  );
}
