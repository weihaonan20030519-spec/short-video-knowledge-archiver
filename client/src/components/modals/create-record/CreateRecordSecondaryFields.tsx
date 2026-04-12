import type { UseFormRegister } from "react-hook-form";

import type { MessageDictionary } from "../../../lib/i18n";
import { getCreateRecordFolderOptions, getCreateRecordTagsPlaceholder } from "../../../features/create-record/createRecordModeConfig";
import type { Folder, Tag } from "../../../types/domain";
import type { CreateRecordValues } from "../../../types/forms";

interface CreateRecordSecondaryFieldsProps {
  folders: Folder[];
  tags: Tag[];
  register: UseFormRegister<CreateRecordValues>;
  t: MessageDictionary;
  appLanguage: "zh-CN" | "en";
}

export function CreateRecordSecondaryFields({
  folders,
  tags,
  register,
  t,
  appLanguage
}: CreateRecordSecondaryFieldsProps) {
  const folderOptions = getCreateRecordFolderOptions(folders, appLanguage);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.folder}</span>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          {...register("folderId")}
        >
          <option value="">{t.common.systemFolder}</option>
          {folderOptions.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.tags}</span>
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          placeholder={getCreateRecordTagsPlaceholder(t, tags)}
          {...register("tagsText")}
        />
      </label>
    </div>
  );
}
