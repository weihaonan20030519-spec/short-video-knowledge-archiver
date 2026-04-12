import type { MessageDictionary } from "../../../lib/i18n";
import { getCreateRecordModeHelper } from "../../../features/create-record/createRecordModeConfig";
import type { CreateRecordUiMode } from "../../../features/create-record/createRecordUiMode";

interface CreateRecordModeHintProps {
  mode: CreateRecordUiMode;
  t: MessageDictionary;
}

export function CreateRecordModeHint({ mode, t }: CreateRecordModeHintProps) {
  return (
    <div
      className="rounded-xl bg-slate-100/70 px-3 py-2 text-xs leading-5 text-slate-500"
      data-testid="create-record-mode-hint"
    >
      {getCreateRecordModeHelper(t, mode)}
    </div>
  );
}
