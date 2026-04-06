import { useEffect, useState } from "react";

import { Sidebar } from "../components/sidebar/Sidebar";
import { RecordListPane } from "../components/record-list/RecordListPane";
import { DetailPane } from "../components/detail/DetailPane";
import { CreateRecordModal } from "../components/modals/CreateRecordModal";
import { ConfirmActionModal } from "../components/modals/ConfirmActionModal";
import { ManageCollectionModal } from "../components/modals/ManageCollectionModal";
import { ThreePaneLayout } from "../layouts/ThreePaneLayout";
import { useFolders } from "../hooks/useFolders";
import { useRecords } from "../hooks/useRecords";
import { useTags } from "../hooks/useTags";
import { useAppI18n } from "../hooks/useAppI18n";
import { useRecordFilters } from "../hooks/useRecordFilters";
import { useUIStore } from "../stores/uiStore";
import { useQueryStore } from "../stores/queryStore";
import { folderRepository } from "../db/repositories/folderRepository";
import { recordRepository } from "../db/repositories/recordRepository";
import { tagRepository } from "../db/repositories/tagRepository";
import { analyzeRecord } from "../services/aiService";
import { buildRecordImportSnapshot } from "../services/import/importCoordinator";
import type { ImportResult } from "../services/import/importTypes";
import type { ClientTranscriptionResult } from "../services/transcription/transcriptionTypes";
import { buildRecordTitle } from "../lib/title";
import { isDuplicateFolderName, isDuplicateTagName, normalizeCollectionName } from "../lib/collection";
import { detectPlatform, extractLinkTitle } from "../lib/platform";
import { createConciseAiSlot, createLearningAiSlot } from "../lib/aiTransform";
import { exportFolderToPdf } from "../lib/exportPdf";
import {
  countUncategorizedRecords,
  isUncategorizedRecordsView,
  UNCATEGORIZED_RECORDS_VIEW_ID
} from "../lib/folders";
import { getAnalyzeErrorMessage } from "../lib/i18n";
import type {
  AnalyzeMode,
  ConciseOutput,
  Folder,
  LearningOutput,
  RecordItem,
  Tag
} from "../types/domain";
import type { CreateRecordValues } from "../types/forms";

type CollectionModalState =
  | { entity: "folder"; mode: "create"; target: null }
  | { entity: "folder"; mode: "rename"; target: Folder }
  | { entity: "tag"; mode: "create"; target: null }
  | { entity: "tag"; mode: "rename"; target: Tag }
  | null;

type ConfirmState =
  | { entity: "folder"; target: Folder }
  | { entity: "tag"; target: Tag }
  | { entity: "record"; target: RecordItem }
  | null;

function buildEmptyState(
  languageText: ReturnType<typeof useAppI18n>["t"],
  searchQuery: string,
  selectedFolderId: string | null,
  selectedTagId: string | null,
  activeFilter: "all" | "recent" | "unorganized" | "needs_review"
) {
  if (searchQuery.trim()) {
    return {
      title: languageText.empty.searchTitle,
      description: languageText.empty.searchDescription
    };
  }

  if (selectedFolderId) {
    if (isUncategorizedRecordsView(selectedFolderId)) {
      return {
        title: languageText.empty.systemFolderTitle,
        description: languageText.empty.systemFolderDescription
      };
    }

    return {
      title: languageText.empty.folderTitle,
      description: languageText.empty.folderDescription
    };
  }

  if (selectedTagId) {
    return {
      title: languageText.empty.tagTitle,
      description: languageText.empty.tagDescription
    };
  }

  if (activeFilter === "unorganized") {
    return {
      title: languageText.empty.unorganizedTitle,
      description: languageText.empty.unorganizedDescription
    };
  }

  if (activeFilter === "needs_review") {
    return {
      title: languageText.empty.needsReviewTitle,
      description: languageText.empty.needsReviewDescription
    };
  }

  return {
    title: languageText.empty.allTitle,
    description: languageText.empty.allDescription
  };
}

export function HomePage() {
  const { appLanguage, t } = useAppI18n();
  const records = useRecords();
  const folders = useFolders();
  const tags = useTags();
  const { selectedRecordId, createModalOpen, setSelectedRecordId, setCreateModalOpen } = useUIStore();
  const { activeFilter, searchQuery, selectedFolderId, selectedTagId, setSelectedFolderId } = useQueryStore();
  const [collectionModal, setCollectionModal] = useState<CollectionModalState>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const filteredRecords = useRecordFilters(records, tags, folders);
  const selectedRecord = filteredRecords.find((record) => record.id === selectedRecordId) || null;

  useEffect(() => {
    const hasSelectedRecord = filteredRecords.some((record) => record.id === selectedRecordId);

    if ((!selectedRecordId || !hasSelectedRecord) && filteredRecords[0]) {
      setSelectedRecordId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedRecordId, setSelectedRecordId]);

  useEffect(() => {
    if (selectedRecord) {
      void recordRepository.update(selectedRecord.id, {
        lastViewedAt: new Date().toISOString(),
        updatedAt: selectedRecord.updatedAt
      });
    }
  }, [selectedRecord?.id]);

  const emptyState = buildEmptyState(t, searchQuery, selectedFolderId, selectedTagId, activeFilter);

  const normalizedFolders = folders;
  const normalizedTags = tags;
  const uncategorizedCount = countUncategorizedRecords(records, normalizedFolders);

  const handleCreateRecord = async (
    values: CreateRecordValues,
    importResult: ImportResult | null,
    transcriptionResult: ClientTranscriptionResult | null
  ) => {
    const createdAt = new Date().toISOString();
    const importSnapshot = buildRecordImportSnapshot(importResult);
    const originalUrl =
      values.inputMethod === "link"
        ? importSnapshot.originalUrl || values.originalUrl?.trim() || null
        : null;
    const originalContent =
      values.content?.trim() || transcriptionResult?.transcriptText || importSnapshot.detectedContent || "";
    const sourcePlatform =
      values.inputMethod === "link" ? detectPlatform(originalUrl) : importSnapshot.platform;
    const sourceType =
      transcriptionResult?.sourceType ||
      (values.inputMethod === "link"
        ? "link"
        : values.inputMethod === "manual"
          ? "manual"
          : "text");
    const contentCompleteness =
      transcriptionResult != null
        ? originalContent.trim()
          ? "full"
          : "none"
        : importSnapshot.importSummary?.contentCompleteness === "full"
          ? "full"
          : importSnapshot.importSummary?.contentCompleteness === "partial"
            ? "partial"
            : originalContent.trim()
              ? "minimal"
              : "none";

    const title = buildRecordTitle({
      userTitle: values.title,
      linkTitle: values.inputMethod === "upload"
        ? transcriptionResult?.suggestedTitle || importSnapshot.detectedTitle || undefined
        : importSnapshot.detectedTitle || extractLinkTitle(originalUrl) || undefined,
      content: originalContent,
      createdAt
    });

    const tagNames = values.tagsText
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) || [];

    const tagIds: string[] = [];
    for (const tagName of tagNames) {
      const existing = normalizedTags.find((tag) => tag.name === tagName);
      if (existing) {
        tagIds.push(existing.id);
        continue;
      }

      const now = new Date().toISOString();
      const tag: Tag = {
        id: crypto.randomUUID(),
        name: tagName,
        createdAt: now,
        updatedAt: now
      };

      await tagRepository.create(tag);
      tagIds.push(tag.id);
    }

    const record: RecordItem = {
      id: crypto.randomUUID(),
      title,
      sourcePlatform,
      sourceType,
      inputMethod: values.inputMethod,
      originalUrl,
      folderId: values.folderId || null,
      tagIds,
      createdAt,
      updatedAt: createdAt,
      watchedAt: null,
      lastViewedAt: null,
      originalContent,
      personalNote: "",
      transcriptionStatus: transcriptionResult?.transcriptionStatus || "idle",
      contentCompleteness,
      transcriptMeta: transcriptionResult?.transcriptMeta || null,
      aiStatus: "not_started",
      aiErrorMessage: null,
      importSummary: importSnapshot.importSummary,
      currentMode: null,
      aiOutputs: {
        concise: null,
        learning: null
      }
    };

    await recordRepository.create(record);
    setSelectedRecordId(record.id);
    setCreateModalOpen(false);
  };

  const handleAnalyze = async (record: RecordItem, mode: AnalyzeMode) => {
    if (!record.originalContent.trim()) {
      window.alert(t.common.originalContentRequired);
      return;
    }

    await recordRepository.update(record.id, {
      aiStatus: "processing",
      aiErrorMessage: null,
      aiErrorCode: null,
      updatedAt: new Date().toISOString()
    });

    const response = await analyzeRecord(record, mode, appLanguage);

    if (!response.success) {
      await recordRepository.update(record.id, {
        aiStatus: "failed",
        aiErrorCode: response.error.code,
        aiErrorMessage: getAnalyzeErrorMessage(response.error.code, appLanguage),
        updatedAt: new Date().toISOString()
      });
      return;
    }

    const previous = record.aiOutputs[mode];
    const slot =
      mode === "concise"
        ? createConciseAiSlot(response.data as ConciseOutput, response.meta.generatedAt, previous?.version || 0)
        : createLearningAiSlot(
            response.data as LearningOutput,
            response.meta.generatedAt,
            previous?.version || 0
          );

    await recordRepository.update(record.id, {
      currentMode: mode,
      aiStatus: "done",
      transcriptionStatus:
        record.transcriptionStatus === "transcript_needs_review"
          ? "transcript_ready"
          : record.transcriptionStatus,
      aiErrorMessage: null,
      aiErrorCode: null,
      aiOutputs: {
        ...record.aiOutputs,
        [mode]: slot
      },
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteRecord = async (record: RecordItem) => {
    setConfirmState({ entity: "record", target: record });
  };

  const createFolder = async (name: string) => {
    const normalizedName = normalizeCollectionName(name);
    if (isDuplicateFolderName(normalizedFolders, normalizedName)) {
      return t.errors.duplicateFolder;
    }
    const now = new Date().toISOString();
    const sortOrder = normalizedFolders.length;
    await folderRepository.create({
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
      sortOrder,
      isSystem: false
    });
    setCollectionModal(null);
    return null;
  };

  const renameFolder = async (folder: Folder, name: string) => {
    const normalizedName = normalizeCollectionName(name);
    if (!normalizedName || normalizedName === folder.name) {
      return null;
    }
    if (isDuplicateFolderName(normalizedFolders, normalizedName, folder.id)) {
      return t.errors.duplicateFolder;
    }

    await folderRepository.update(folder.id, {
      name: normalizedName,
      updatedAt: new Date().toISOString()
    });
    setCollectionModal(null);
    return null;
  };

  const deleteFolder = async (folder: Folder) => {
    const recordsInFolder = await recordRepository.listByFolder(folder.id);

    await Promise.all(
      recordsInFolder.map((record) =>
        recordRepository.update(record.id, {
          folderId: null,
          updatedAt: new Date().toISOString()
        })
      )
    );

    await folderRepository.delete(folder.id);
    if (selectedFolderId === folder.id) {
      setSelectedFolderId(UNCATEGORIZED_RECORDS_VIEW_ID);
    }
    setConfirmState(null);
  };

  const createTag = async (name: string) => {
    const normalizedName = normalizeCollectionName(name);
    if (isDuplicateTagName(normalizedTags, normalizedName)) {
      return t.errors.duplicateTag;
    }
    const now = new Date().toISOString();
    await tagRepository.create({
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: now,
      updatedAt: now
    });
    setCollectionModal(null);
    return null;
  };

  const renameTag = async (tag: Tag, name: string) => {
    const normalizedName = normalizeCollectionName(name);
    if (!normalizedName || normalizedName === tag.name) {
      return null;
    }
    if (isDuplicateTagName(normalizedTags, normalizedName, tag.id)) {
      return t.errors.duplicateTag;
    }

    await tagRepository.update(tag.id, {
      name: normalizedName,
      updatedAt: new Date().toISOString()
    });
    setCollectionModal(null);
    return null;
  };

  const deleteTag = async (tag: Tag) => {
    await Promise.all(
      records
        .filter((record) => record.tagIds.includes(tag.id))
        .map((record) =>
          recordRepository.update(record.id, {
            tagIds: record.tagIds.filter((tagId) => tagId !== tag.id),
            updatedAt: new Date().toISOString()
          })
        )
    );

    await tagRepository.delete(tag.id);
    setConfirmState(null);
  };

  const handleExportFolder = async (folder: Folder) => {
    const folderRecords = await recordRepository.listByFolder(folder.id);
    await exportFolderToPdf(folder, folderRecords, normalizedTags, appLanguage);
  };

  const handleConfirmAction = async () => {
    if (!confirmState) {
      return;
    }

    if (confirmState.entity === "folder") {
      await deleteFolder(confirmState.target);
      return;
    }

    if (confirmState.entity === "tag") {
      await deleteTag(confirmState.target);
      return;
    }

    await recordRepository.delete(confirmState.target.id);
    if (selectedRecordId === confirmState.target.id) {
      setSelectedRecordId(null);
    }
    setConfirmState(null);
  };

  let confirmTitle = t.confirm.defaultTitle;
  let confirmDescription = "";

  if (confirmState?.entity === "folder") {
    confirmTitle = t.confirm.deleteFolderTitle(confirmState.target.name);
    confirmDescription = t.confirm.deleteFolderDescription;
  } else if (confirmState?.entity === "tag") {
    confirmTitle = t.confirm.deleteTagTitle(confirmState.target.name);
    confirmDescription = t.confirm.deleteTagDescription;
  } else if (confirmState?.entity === "record") {
    confirmTitle = t.confirm.deleteRecordTitle(confirmState.target.title);
    confirmDescription = t.confirm.deleteRecordDescription;
  }

  return (
    <>
      <ThreePaneLayout
        sidebar={
          <Sidebar
            folders={normalizedFolders}
            uncategorizedCount={uncategorizedCount}
            tags={normalizedTags}
            onOpenCreate={() => setCreateModalOpen(true)}
            onCreateFolder={() => setCollectionModal({ entity: "folder", mode: "create", target: null })}
            onCreateTag={() => setCollectionModal({ entity: "tag", mode: "create", target: null })}
            onRenameFolder={(folder) => setCollectionModal({ entity: "folder", mode: "rename", target: folder })}
            onDeleteFolder={(folder) => setConfirmState({ entity: "folder", target: folder })}
            onRenameTag={(tag) => setCollectionModal({ entity: "tag", mode: "rename", target: tag })}
            onDeleteTag={(tag) => setConfirmState({ entity: "tag", target: tag })}
            onExportFolder={handleExportFolder}
          />
        }
        list={
          <RecordListPane
            records={filteredRecords}
            folders={normalizedFolders}
            tags={normalizedTags}
            selectedRecordId={selectedRecordId}
            emptyTitle={emptyState.title}
            emptyDescription={emptyState.description}
            onSelectRecord={setSelectedRecordId}
          />
        }
        detail={
          <DetailPane
            record={selectedRecord}
            folders={normalizedFolders}
            tags={normalizedTags}
            onAnalyze={handleAnalyze}
            onDeleteRecord={handleDeleteRecord}
          />
        }
      />

      <CreateRecordModal
        open={createModalOpen}
        folders={normalizedFolders}
        tags={normalizedTags}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRecord}
      />

      <ManageCollectionModal
        open={Boolean(collectionModal)}
        entityLabel={collectionModal?.entity === "tag" ? "tag" : "folder"}
        mode={collectionModal?.mode || "create"}
        initialName={collectionModal?.target ? collectionModal.target.name : ""}
        description={
          collectionModal?.entity === "tag"
            ? t.modals.tagDescription
            : t.modals.folderDescription
        }
        onClose={() => setCollectionModal(null)}
        onSubmit={async (name) => {
          if (!collectionModal) {
            return;
          }

          if (collectionModal.entity === "folder") {
            if (collectionModal.mode === "create") {
              await createFolder(name);
            } else {
              await renameFolder(collectionModal.target, name);
            }
            return;
          }

          if (collectionModal.mode === "create") {
            await createTag(name);
          } else {
            await renameTag(collectionModal.target, name);
          }
        }}
      />

      <ConfirmActionModal
        open={Boolean(confirmState)}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={
          confirmState?.entity === "record" ? t.confirm.deleteRecordConfirm : t.confirm.deleteConfirm
        }
        danger
        onClose={() => setConfirmState(null)}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}
