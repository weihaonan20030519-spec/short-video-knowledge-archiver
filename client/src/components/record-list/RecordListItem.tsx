import type { Folder, RecordItem, Tag } from "../../types/domain";
import { useAppI18n } from "../../hooks/useAppI18n";
import { getFolderDisplayName, getSourceTypeLabel } from "../../lib/i18n";
import { getPlatformLabel } from "../../lib/platform";
import {
  getRecordListStatus
} from "../../lib/status";
import { formatDateTime } from "../../lib/time";

interface RecordListItemProps {
  record: RecordItem;
  folders: Folder[];
  tags: Tag[];
  selected: boolean;
  onClick: () => void;
}

export function RecordListItem({ record, folders, tags, selected, onClick }: RecordListItemProps) {
  const { appLanguage, t } = useAppI18n();
  const folder = folders.find((item) => item.id === record.folderId);
  const derivedStatus = getRecordListStatus(record, appLanguage);
  const tagNames = tags
    .filter((tag) => record.tagIds.includes(tag.id))
    .slice(0, 3)
    .map((tag) => tag.name);

  return (
    <button
      className={`w-full rounded-3xl border p-4 text-left transition ${
        selected
          ? "border-teal-300 bg-white shadow-subtle"
          : "border-slate-200/80 bg-white/92 hover:border-slate-300 hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{record.title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {getSourceTypeLabel(record.sourceType, appLanguage)} · {getPlatformLabel(record.sourcePlatform, appLanguage)} ·{" "}
            {folder ? getFolderDisplayName(folder, appLanguage) : t.common.systemFolder}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${derivedStatus.tone}`}
        >
          {derivedStatus.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tagNames.map((tagName) => (
          <span key={tagName} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            #{tagName}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        {t.list.createdAt}: {formatDateTime(record.createdAt)}
      </p>
    </button>
  );
}
