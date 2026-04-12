import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Folder, Tag } from "../../types/domain";
import { useAppI18n } from "../../hooks/useAppI18n";
import { useElementWidthThreshold } from "../../hooks/useElementWidthThreshold";
import { UNCATEGORIZED_RECORDS_VIEW_ID, isUncategorizedRecordsView } from "../../lib/folders";
import { getFolderDisplayName, languageOptions } from "../../lib/i18n";
import { getSidebarFilterPresentation } from "../../lib/status";
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

const twoLineClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden"
};

const SIDEBAR_HEADER_COMPACT_THRESHOLD_PX = 360;

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
  const unorganizedFilter = getSidebarFilterPresentation("unorganized", appLanguage);
  const notStartedFilter = getSidebarFilterPresentation("not_started", appLanguage);
  const needsReviewFilter = getSidebarFilterPresentation("needs_review", appLanguage);
  const reviewLaterFilter = getSidebarFilterPresentation("review_later", appLanguage);
  const [isUnorganizedBucketExpanded, setIsUnorganizedBucketExpanded] = useState(false);
  const [sidebarHeaderRowRef, isLanguageSwitcherCompact] = useElementWidthThreshold<HTMLDivElement>(
    SIDEBAR_HEADER_COMPACT_THRESHOLD_PX,
    "max"
  );
  const hasFolders = folders.length > 0;
  const hasMultipleFolders = folders.length > 1;
  const hasTags = tags.length > 0;
  const hasMultipleTags = tags.length > 1;

  useEffect(() => {
    if (activeFilter !== "not_started" && activeFilter !== "needs_review") {
      setIsUnorganizedBucketExpanded(false);
    }
  }, [activeFilter]);

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
          <div
            ref={sidebarHeaderRowRef}
            className={`items-start ${isLanguageSwitcherCompact ? "flex flex-col gap-2" : "flex flex-wrap gap-3"}`}
            data-testid="sidebar-header-row"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{t.sidebar.title}</p>
              <h1 className="mt-2 break-words text-2xl font-semibold text-slate-50">{t.sidebar.subtitle}</h1>
            </div>
            <div
              className={`inline-flex max-w-full shrink-0 items-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-300 ${
                isLanguageSwitcherCompact ? "self-start px-1 py-1" : "ml-auto gap-2 px-2 py-1.5"
              }`}
              data-layout={isLanguageSwitcherCompact ? "compact" : "inline"}
              data-testid="sidebar-language-switcher"
            >
              {isLanguageSwitcherCompact ? null : (
                <p
                  className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
                  data-testid="sidebar-language-switcher-label"
                >
                  {t.app.languageLabel}
                </p>
              )}
              <div
                className={`flex items-center rounded-lg bg-black/15 ${
                  isLanguageSwitcherCompact ? "gap-0.5 p-0.5" : "gap-1 p-0.5"
                }`}
                data-testid="sidebar-language-switcher-controls"
              >
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-md font-medium transition ${
                      isLanguageSwitcherCompact
                        ? "min-w-[2.2rem] px-1.5 py-1 text-[11px] leading-none"
                        : "min-w-[2.5rem] px-2.5 py-1.5 text-xs leading-none"
                    } ${
                      appLanguage === option.value
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                    data-testid={`sidebar-language-option-${option.value}`}
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
          className="block w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white text-ellipsis whitespace-nowrap outline-none placeholder:text-slate-500"
          placeholder={t.sidebar.searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div className="space-y-2">
          {[
            { key: "all", label: t.sidebar.filters.all },
            { key: "recent", label: t.sidebar.filters.recent },
          ].map((item) => (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm ${
                activeFilter === item.key && !selectedFolderId && !selectedTagId
                  ? "bg-slate-100 text-slate-950"
                  : "border border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.07]"
              }`}
              onClick={() => {
                setActiveFilter(item.key as "all" | "recent" | "unorganized" | "needs_review" | "review_later");
                resetScopedFilters();
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                className={`flex min-w-0 flex-1 items-center justify-between rounded-2xl px-3 py-2 text-sm ${
                  activeFilter === "unorganized"
                    ? "bg-slate-100 text-slate-950"
                    : "border border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.07]"
                }`}
                data-testid="sidebar-status-bucket"
                onClick={() => {
                  setActiveFilter("unorganized");
                  setIsUnorganizedBucketExpanded(false);
                  resetScopedFilters();
                }}
                type="button"
              >
                {unorganizedFilter.label}
              </button>
              <button
                aria-label={
                  isUnorganizedBucketExpanded ? t.sidebar.collapseSubFilters : t.sidebar.expandSubFilters
                }
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]"
                data-testid="sidebar-status-bucket-toggle"
                onClick={() => setIsUnorganizedBucketExpanded((value) => !value)}
                type="button"
              >
                <span className={`transition ${isUnorganizedBucketExpanded ? "rotate-90" : "rotate-0"}`}>
                  ›
                </span>
              </button>
            </div>

            {isUnorganizedBucketExpanded ? (
              <div className="ml-3 border-l border-white/10 pl-3">
                <button
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                    activeFilter === "not_started"
                      ? "bg-slate-100 text-slate-950"
                      : "border border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.06]"
                  }`}
                  data-testid="sidebar-status-child-filter-not-started"
                  onClick={() => {
                    setActiveFilter("not_started");
                    resetScopedFilters();
                  }}
                  type="button"
                >
                  <span>{notStartedFilter.label}</span>
                </button>
                <button
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition ${
                    activeFilter === "needs_review"
                      ? "bg-slate-100 text-slate-950"
                      : "border border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.06]"
                  }`}
                  data-testid="sidebar-status-child-filter"
                  onClick={() => {
                    setActiveFilter("needs_review");
                    resetScopedFilters();
                  }}
                  type="button"
                  >
                  <span>{needsReviewFilter.label}</span>
                </button>
              </div>
            ) : null}

            <button
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm ${
                activeFilter === "review_later"
                  ? "bg-slate-100 text-slate-950"
                  : "border border-transparent bg-white/[0.04] text-slate-300 hover:border-white/10 hover:bg-white/[0.07]"
              }`}
              data-testid="sidebar-status-review-later"
              onClick={() => {
                setActiveFilter("review_later");
                resetScopedFilters();
              }}
              type="button"
            >
              {reviewLaterFilter.label}
            </button>
          </div>
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
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-100" style={twoLineClampStyle}>
                    {t.common.systemFolder}
                  </p>
                  <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 px-3 text-xs font-medium leading-none whitespace-nowrap">
                    {t.sidebar.recordCount(uncategorizedCount)}
                  </span>
                </div>
                <p
                  className="min-w-0 text-xs leading-5 text-slate-300"
                  style={twoLineClampStyle}
                >
                  {t.sidebar.systemFolderDescription}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="min-w-0 shrink-0" data-testid="sidebar-collections-region">
        <div className="min-w-0 space-y-5">
          <div data-testid="sidebar-folders-section">
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
            {!hasFolders ? (
              <div
                className="rounded-2xl border border-dashed border-white/8 px-3 py-3 text-xs leading-5 text-slate-400"
                data-testid="sidebar-folders-empty"
              >
                <p className="font-medium text-slate-300">{t.sidebar.emptyFoldersTitle}</p>
                <p className="mt-1 text-slate-500">{t.sidebar.emptyFoldersDescription}</p>
              </div>
            ) : (
              <div className={hasMultipleFolders ? "space-y-2" : ""} data-testid="sidebar-folders-list">
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
            )}
          </div>

          <div data-testid="sidebar-tags-section">
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
            {!hasTags ? (
              <p className="px-1 text-xs leading-5 text-slate-500" data-testid="sidebar-tags-empty">
                {t.sidebar.emptyTagsTitle}
              </p>
            ) : (
              <div className={hasMultipleTags ? "space-y-2" : ""} data-testid="sidebar-tags-list">
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
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
