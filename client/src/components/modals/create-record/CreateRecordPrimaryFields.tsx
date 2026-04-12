import type { UseFormRegister } from "react-hook-form";

import type { MessageDictionary } from "../../../lib/i18n";
import {
  getCreateRecordContentLabel,
  getCreateRecordContentPlaceholder,
  getCreateRecordModeConfig
} from "../../../features/create-record/createRecordModeConfig";
import type { CreateRecordUiMode } from "../../../features/create-record/createRecordUiMode";
import type { CreateRecordValues } from "../../../types/forms";

interface CreateRecordPrimaryFieldsProps {
  mode: CreateRecordUiMode;
  register: UseFormRegister<CreateRecordValues>;
  t: MessageDictionary;
  contentFieldId: string;
  onRepairShortcutClick: () => void;
  showRepairShortcut: boolean;
}

export function CreateRecordPrimaryFields({
  mode,
  register,
  t,
  contentFieldId,
  onRepairShortcutClick,
  showRepairShortcut
}: CreateRecordPrimaryFieldsProps) {
  const config = getCreateRecordModeConfig(mode);

  return (
    <div className="space-y-5">
      {showRepairShortcut ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{t.modals.repairShortcut.title}</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">{t.modals.repairShortcut.description}</p>
          <button
            className="mt-3 inline-flex rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:text-sky-900"
            onClick={onRepairShortcutClick}
            type="button"
          >
            {t.modals.repairShortcut.action}
          </button>
        </div>
      ) : null}

      {config.showTitle ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.optionalTitle}</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            placeholder={t.modals.optionalTitlePlaceholder}
            {...register("title")}
          />
        </label>
      ) : null}

      {config.showLinkInput ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.originalUrl}</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            placeholder="https://..."
            {...register("originalUrl")}
          />
        </label>
      ) : null}

      {config.showOriginalContent ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            {getCreateRecordContentLabel(t, mode)}
          </span>
          <textarea
            id={contentFieldId}
            className="min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none whitespace-pre-wrap break-words"
            placeholder={getCreateRecordContentPlaceholder(t, mode)}
            {...register("content")}
          />
        </label>
      ) : null}
    </div>
  );
}
