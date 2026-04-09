import type { Folder, RecordItem, Tag } from "../../types/domain";
import { useAppI18n } from "../../hooks/useAppI18n";
import type { ActiveFilter } from "../../stores/queryStore";
import { EmptyState } from "../common/EmptyState";
import { RecordListItem } from "./RecordListItem";

interface RecordListPaneProps {
  records: RecordItem[];
  folders: Folder[];
  tags: Tag[];
  activeFilter: ActiveFilter;
  selectedRecordId: string | null;
  emptyTitle: string;
  emptyDescription: string;
  onSelectRecord: (id: string) => void;
}

export function RecordListPane({
  records,
  folders,
  tags,
  activeFilter,
  selectedRecordId,
  emptyTitle,
  emptyDescription,
  onSelectRecord
}: RecordListPaneProps) {
  const { t } = useAppI18n();

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-slate-50/95 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{t.list.title}</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{t.list.resultCount(records.length)}</h2>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1"
        data-testid="record-list-scroll-region"
      >
        {records.length ? (
          records.map((record) => (
            <RecordListItem
              key={record.id}
              record={record}
              folders={folders}
              tags={tags}
              activeFilter={activeFilter}
              selected={selectedRecordId === record.id}
              onClick={() => onSelectRecord(record.id)}
            />
          ))
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </section>
  );
}
