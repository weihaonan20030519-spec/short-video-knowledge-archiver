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
}

export function CreateRecordPrimaryFields({
  mode,
  register,
  t
}: CreateRecordPrimaryFieldsProps) {
  const config = getCreateRecordModeConfig(mode);

  return (
    <div className="space-y-5">
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
            className="min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none"
            placeholder={getCreateRecordContentPlaceholder(t, mode)}
            {...register("content")}
          />
        </label>
      ) : null}
    </div>
  );
}
