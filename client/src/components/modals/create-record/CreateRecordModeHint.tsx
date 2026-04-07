import type { MessageDictionary } from "../../../lib/i18n";
import { getCreateRecordModeHelper } from "../../../features/create-record/createRecordModeConfig";
import type { CreateRecordUiMode } from "../../../features/create-record/createRecordUiMode";

interface CreateRecordModeHintProps {
  mode: CreateRecordUiMode;
  t: MessageDictionary;
}

export function CreateRecordModeHint({ mode, t }: CreateRecordModeHintProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      {getCreateRecordModeHelper(t, mode)}
    </div>
  );
}
