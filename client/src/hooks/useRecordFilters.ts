import { useMemo } from "react";

import type { Folder, RecordItem, Tag } from "../types/domain";
import { isRecordUncategorized, isUncategorizedRecordsView } from "../lib/folders";
import { buildRecordSearchText } from "../lib/search";
import { matchesRecordStageFilter } from "../lib/status";
import { useQueryStore } from "../stores/queryStore";

export function useRecordFilters(records: RecordItem[], tags: Tag[], folders: Folder[]) {
  const { activeFilter, searchQuery, selectedFolderId, selectedTagId } = useQueryStore();

  return useMemo(() => {
    const now = Date.now();

    const filtered = records.filter((record) => {
      if (activeFilter === "recent") {
        const createdAt = new Date(record.createdAt).getTime();
        if (now - createdAt > 1000 * 60 * 60 * 24 * 7) {
          return false;
        }
      }

      if (
        (activeFilter === "unorganized" || activeFilter === "not_started" || activeFilter === "needs_review") &&
        !matchesRecordStageFilter(record, activeFilter)
      ) {
        return false;
      }

      if (activeFilter === "review_later" && !record.reviewLater) {
        return false;
      }

      if (selectedFolderId) {
        if (isUncategorizedRecordsView(selectedFolderId)) {
          if (!isRecordUncategorized(record, folders)) {
            return false;
          }
        } else if (record.folderId !== selectedFolderId) {
          return false;
        }
      }

      if (selectedTagId && !record.tagIds.includes(selectedTagId)) {
        return false;
      }

      if (searchQuery.trim()) {
        return buildRecordSearchText(record, tags).includes(searchQuery.trim().toLowerCase());
      }

      return true;
    });

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activeFilter, folders, records, searchQuery, selectedFolderId, selectedTagId, tags]);
}
