import type { CSSProperties } from "react";
import type { Folder, RecordItem, Tag } from "../../types/domain";
import { useAppI18n } from "../../hooks/useAppI18n";
import { getFolderDisplayName } from "../../lib/i18n";
import { getContextualRecordSummarySignals } from "../../lib/recordSummary";
import { formatDateTime } from "../../lib/time";
import type { ActiveFilter } from "../../stores/queryStore";

const statusPillClass =
  "inline-flex min-h-7 max-w-[11rem] shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium leading-4";

const statusPillLabelClass = "inline-block max-w-full truncate";

const secondaryChipClass =
  "inline-flex min-h-6 max-w-[10rem] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium leading-4";

const secondaryChipLabelClass = "inline-block max-w-full truncate";

const twoLineClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden"
};

interface RecordListItemProps {
  record: RecordItem;
  folders: Folder[];
  tags: Tag[];
  activeFilter: ActiveFilter;
  selected: boolean;
  onClick: () => void;
}

function getSummaryChipClassName(tone: "default" | "muted" | "attention") {
  if (tone === "attention") {
    return `${secondaryChipClass} border-amber-200 bg-amber-50 text-amber-900`;
  }

  if (tone === "muted") {
    return `${secondaryChipClass} border-slate-200 bg-slate-50 text-slate-500`;
  }

  return `${secondaryChipClass} border-slate-200 bg-slate-50 text-slate-600`;
}

function getSummaryChipTestId(key: "status" | "entry" | "platform" | "reviewLater") {
  switch (key) {
    case "status":
      return "record-list-secondary-chip";
    case "entry":
      return "record-list-entry-chip";
    case "platform":
      return "record-list-platform-chip";
    case "reviewLater":
      return "record-list-review-later-chip";
    default:
      return undefined;
  }
}

export function RecordListItem({ record, folders, tags, activeFilter, selected, onClick }: RecordListItemProps) {
  const { appLanguage, t } = useAppI18n();
  const folder = folders.find((item) => item.id === record.folderId);
  const summarySignals = getContextualRecordSummarySignals(record, appLanguage, activeFilter);
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
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-6 text-slate-900" style={twoLineClampStyle}>
            {record.title}
          </h3>
          <div className="mt-2" data-testid="record-list-card-secondary-signals">
            <div className="flex flex-wrap gap-2" data-testid="record-list-summary-chips">
              {summarySignals.secondarySignals.map((signal) => (
                <span
                  key={`${signal.key}-${signal.label}`}
                  className={getSummaryChipClassName(signal.tone)}
                  data-chip-key={signal.key}
                  data-testid={getSummaryChipTestId(signal.key)}
                >
                  <span
                    className={secondaryChipLabelClass}
                    data-testid={signal.key === "status" ? "record-list-card-contextual-status" : undefined}
                  >
                    {signal.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
        {summarySignals.primaryStatus ? (
          <span
            className={`${statusPillClass} ${summarySignals.primaryStatus.tone}`}
            data-testid="record-list-primary-pill"
          >
            <span className={statusPillLabelClass} data-testid="record-list-card-primary-signal">
              {summarySignals.primaryStatus.label}
            </span>
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tagNames.map((tagName) => (
          <span key={tagName} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            #{tagName}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500" data-testid="record-list-card-meta-row">
        {folder ? getFolderDisplayName(folder, appLanguage) : t.common.systemFolder} · {t.list.createdAt}:{" "}
        {formatDateTime(record.createdAt)}
      </p>
    </button>
  );
}
