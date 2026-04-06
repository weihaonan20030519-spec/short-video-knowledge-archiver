import type { Folder, RecordItem } from "../types/domain";

export const UNCATEGORIZED_RECORDS_VIEW_ID = "__system_uncategorized_records__";

export function isUncategorizedRecordsView(folderId: string | null) {
  return folderId === UNCATEGORIZED_RECORDS_VIEW_ID;
}

export function isRecordUncategorized(record: Pick<RecordItem, "folderId">, folders: Folder[]) {
  if (!record.folderId) {
    return true;
  }

  return !folders.some((folder) => folder.id === record.folderId);
}

export function countUncategorizedRecords(records: RecordItem[], folders: Folder[]) {
  return records.filter((record) => isRecordUncategorized(record, folders)).length;
}
