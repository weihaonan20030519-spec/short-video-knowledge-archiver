import Dexie, { type Table } from "dexie";

import type {
  ContentCompleteness,
  Folder,
  RecordItem,
  SourceType,
  Tag,
  TranscriptionStatus
} from "../types/domain";
import { buildDefaultMediaAsset } from "../services/mediaAsset/mediaAssetMapper";

function deriveSourceType(record: Partial<RecordItem>): SourceType {
  if (record.sourceType) {
    return record.sourceType;
  }

  if (record.inputMethod === "link") {
    return "link";
  }

  if (record.inputMethod === "text") {
    return "text";
  }

  return "manual";
}

function deriveContentCompleteness(record: Partial<RecordItem>): ContentCompleteness {
  const importCompleteness = record.importSummary?.contentCompleteness;

  if (importCompleteness === "full") {
    return "full";
  }

  if (importCompleteness === "partial") {
    return "partial";
  }

  if (record.originalContent?.trim()) {
    return "full";
  }

  return "none";
}

function deriveTranscriptionStatus(record: Partial<RecordItem>): TranscriptionStatus {
  return record.transcriptionStatus || "idle";
}

function deriveReviewLater(record: Partial<RecordItem>) {
  return record.reviewLater === true;
}

function deriveMediaAsset(record: Partial<RecordItem>) {
  return buildDefaultMediaAsset(record.mediaAsset || {});
}

export class KnowledgeArchiveDB extends Dexie {
  records!: Table<RecordItem, string>;
  folders!: Table<Folder, string>;
  tags!: Table<Tag, string>;

  constructor() {
    super("short-video-knowledge-archiver");

    this.version(1).stores({
      records: "id, createdAt, updatedAt, folderId, aiStatus, currentMode",
      folders: "id, name, sortOrder",
      tags: "id, name"
    });

    this.version(2)
      .stores({
        records:
          "id, createdAt, updatedAt, folderId, aiStatus, currentMode, sourceType, transcriptionStatus",
        folders: "id, name, sortOrder",
        tags: "id, name"
      })
      .upgrade(async (tx) => {
        await tx
          .table("records")
          .toCollection()
          .modify((record: Partial<RecordItem>) => {
            record.sourceType = deriveSourceType(record);
            record.transcriptionStatus = deriveTranscriptionStatus(record);
            record.contentCompleteness = record.contentCompleteness || deriveContentCompleteness(record);
            record.transcriptMeta = record.transcriptMeta || null;
          });
      });

    this.version(3)
      .stores({
        records:
          "id, createdAt, updatedAt, folderId, aiStatus, currentMode, sourceType, transcriptionStatus",
        folders: "id, name, sortOrder",
        tags: "id, name"
      })
      .upgrade(async (tx) => {
        const legacySystemFolders = await tx
          .table("folders")
          .filter(
            (folder: Partial<Folder>) =>
              folder.isSystem === true ||
              ((folder.name === "未分类" || folder.name === "Uncategorized") && folder.sortOrder === 0)
          )
          .toArray();

        const legacySystemFolderIds = legacySystemFolders
          .map((folder) => folder.id)
          .filter((id): id is string => Boolean(id));

        if (legacySystemFolderIds.length) {
          const systemFolderIdSet = new Set(legacySystemFolderIds);
          await tx
            .table("records")
            .toCollection()
            .modify((record: Partial<RecordItem>) => {
              if (record.folderId && systemFolderIdSet.has(record.folderId)) {
                record.folderId = null;
              }
            });

          await Promise.all(legacySystemFolderIds.map((id) => tx.table("folders").delete(id)));
        }
      });

    this.version(4)
      .stores({
        records:
          "id, createdAt, updatedAt, folderId, aiStatus, currentMode, sourceType, transcriptionStatus",
        folders: "id, name, sortOrder",
        tags: "id, name"
      })
      .upgrade(async (tx) => {
        await tx
          .table("records")
          .toCollection()
          .modify((record: Partial<RecordItem>) => {
            record.mediaAsset = deriveMediaAsset(record);
          });
      });

    this.version(5)
      .stores({
        records:
          "id, createdAt, updatedAt, folderId, aiStatus, currentMode, sourceType, transcriptionStatus, reviewLater",
        folders: "id, name, sortOrder",
        tags: "id, name"
      })
      .upgrade(async (tx) => {
        await tx
          .table("records")
          .toCollection()
          .modify((record: Partial<RecordItem>) => {
            record.reviewLater = deriveReviewLater(record);
          });
      });
  }
}

export const db = new KnowledgeArchiveDB();
