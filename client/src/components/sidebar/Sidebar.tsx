import type { Folder, Tag } from "../../types/domain";
import { useAppI18n } from "../../hooks/useAppI18n";
import { UNCATEGORIZED_RECORDS_VIEW_ID, isUncategorizedRecordsView } from "../../lib/folders";
import { getFolderDisplayName, languageOptions } from "../../lib/i18n";
import { useQueryStore } from "../../stores/queryStore";

interface SidebarProps {
  folders: Folder[];
  uncategorizedCount: number;
  tags: Tag[];
  onOpenCreate: () => void;
  onCreateFolder: () => void;
  onCreateTag: () => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onRenameTag: (tag: Tag) => void;
  onDeleteTag: (tag: Tag) => void;
  onExportFolder: (folder: Folder) => void;
}

export function Sidebar(props: SidebarProps) {
  const { appLanguage, setAppLanguage, t } = useAppI18n();
  const { folders, tags, uncategorizedCount } = props;
  const {
    activeFilter,
    searchQuery,
    selectedFolderId,
    selectedTagId,
    setActiveFilter,
    setSearchQuery,
    setSelectedFolderId,
    setSelectedTagId,
    resetScopedFilters
  } = useQueryStore();

  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedTagId(null);
    setActiveFilter("all");
  };

  const selectTag = (tagId: string) => {
    setSelectedTagId(tagId);
    setSelectedFolderId(null);
    setActiveFilter("all");
  };

  return (
    <aside
      className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-y-auto rounded-[28px] border border-slate-800 bg-slate-950/95 px-4 py-5 text-white shadow-panel scrollbar-thin"
      data-testid="sidebar-pane"
    >
      <div className="shrink-0 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{t.sidebar.title}</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-50">{t.sidebar.subtitle}</h1>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1">
              <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {t.app.languageLabel}
              </p>
              <div className="flex gap-1">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      appLanguage === option.value
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                    onClick={() => setAppLanguage(option.value)}
                    type="button"
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          className="rounded-2xl border border-teal-200/60 bg-gradient-to-b from-teal-300 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_28px_rgba(20,184,166,0.24)] ring-1 ring-white/10 transition hover:from-teal-200 hover:to-teal-300 hover:shadow-[0_14px_32px_rgba(45,212,191,0.32)] active:translate-y-px active:from-teal-200 active:to-teal-300 active:shadow-[0_8px_18px_rgba(20,184,166,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          onClick={props.onOpenCreate}
          type="button"
        >
          {t.sidebar.newRecord}
        </button>

        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          placeholder={t.sidebar.searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div className="space-y-2">
          {[
            { key: "all", label: t.sidebar.filters.all },
            { key: "recent", label: t.sidebar.filters.recent },
            { key: "unorganized", label: t.sidebar.filters.unorganized },
            { key: "needs_review", label: t.sidebar.filters.needsReview }
          ].map((item) => (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm ${
                activeFilter === item.key && !selectedFolderId && !selectedTagId
                  ? "bg-slate-100 text-slate-950"
                  : "border border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.07]"
              }`}
              onClick={() => {
                setActiveFilter(item.key as "all" | "recent" | "unorganized" | "needs_review");
                resetScopedFilters();
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              {t.sidebar.systemSection}
            </h2>
          </div>
          <div
            className={`rounded-3xl border px-4 py-4 ${
              isUncategorizedRecordsView(selectedFolderId)
                ? "border-teal-300/50 bg-teal-400/10 text-teal-50"
                : "border-white/10 bg-white/[0.06] text-slate-100"
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => {
                setSelectedFolderId(UNCATEGORIZED_RECORDS_VIEW_ID);
                setSelectedTagId(null);
                setActiveFilter("all");
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{t.common.systemFolder}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{t.sidebar.systemFolderDescription}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-medium">
                  {t.sidebar.recordCount(uncategorizedCount)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-[18rem] min-w-0 shrink-0" data-testid="sidebar-collections-region">
        <div className="flex min-h-[18rem] min-w-0 flex-col gap-5">
          <div className="min-h-0 flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{t.sidebar.folders}</h2>
              <button
                className="text-xs text-teal-300 hover:text-teal-200"
                onClick={props.onCreateFolder}
                type="button"
              >
                {t.sidebar.create}
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`cursor-pointer rounded-2xl border px-3 py-2 ${
                    selectedFolderId === folder.id
                      ? "border-white/20 bg-slate-100 text-slate-950"
                      : "border-white/5 bg-white/[0.04] text-slate-200"
                  }`}
                  data-testid={`folder-item-${folder.id}`}
                  onClick={() => selectFolder(folder.id)}
                >
                  <button
                    className="w-full cursor-pointer text-left text-sm font-medium"
                    onClick={() => selectFolder(folder.id)}
                    type="button"
                  >
                    {getFolderDisplayName(folder, appLanguage)}
                  </button>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <button
                      className="text-slate-400 hover:text-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onExportFolder(folder);
                      }}
                      type="button"
                    >
                      {t.sidebar.export}
                    </button>
                    <button
                      className="text-slate-400 hover:text-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onRenameFolder(folder);
                      }}
                      type="button"
                    >
                      {t.sidebar.rename}
                    </button>
                    <button
                      className="text-rose-300 hover:text-rose-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDeleteFolder(folder);
                      }}
                      type="button"
                    >
                      {t.sidebar.delete}
                    </button>
                  </div>
                </div>
                ))}
            </div>
          </div>

          <div className="min-h-0 flex flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{t.sidebar.tags}</h2>
              <button
                className="text-xs text-teal-300 hover:text-teal-200"
                onClick={props.onCreateTag}
                type="button"
              >
                {t.sidebar.create}
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={`cursor-pointer rounded-2xl border px-3 py-2 ${
                    selectedTagId === tag.id
                      ? "border-white/20 bg-slate-100 text-slate-950"
                      : "border-white/5 bg-white/[0.04] text-slate-200"
                  }`}
                  data-testid={`tag-item-${tag.id}`}
                  onClick={() => selectTag(tag.id)}
                >
                  <button
                    className="w-full cursor-pointer text-left text-sm font-medium"
                    onClick={() => selectTag(tag.id)}
                    type="button"
                  >
                    #{tag.name}
                  </button>
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <button
                      className="text-slate-400 hover:text-slate-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onRenameTag(tag);
                      }}
                      type="button"
                    >
                      {t.sidebar.rename}
                    </button>
                    <button
                      className="text-rose-300 hover:text-rose-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onDeleteTag(tag);
                      }}
                      type="button"
                    >
                      {t.sidebar.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
