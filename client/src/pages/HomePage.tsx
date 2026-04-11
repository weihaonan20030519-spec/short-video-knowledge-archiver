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
import type { CreateRecordDraft } from "../features/create-record/buildCreateRecordDraft";
import { buildRecordImportSnapshot, resolveImport } from "../services/import/importCoordinator";
import { isDuplicateFolderName, isDuplicateTagName, normalizeCollectionName } from "../lib/collection";
import { createConciseAiSlot, createLearningAiSlot, getActiveMode } from "../lib/aiTransform";
import { exportFolderToPdf } from "../lib/exportPdf";
import {
  countUncategorizedRecords,
  isUncategorizedRecordsView,
  UNCATEGORIZED_RECORDS_VIEW_ID
} from "../lib/folders";
import { getAnalyzeErrorMessage } from "../lib/i18n";
import { getSidebarFilterPresentation } from "../lib/status";
import { canResumeTranscription } from "../lib/transcriptionResume";
import type {
  AnalyzeMode,
  ConciseOutput,
  Folder,
  LearningOutput,
  RecordItem,
  Tag
} from "../types/domain";
import type { ResumeTranscriptionOutcome } from "../lib/transcriptionResume";
import type { AnalyzeFeedback } from "../types/api";

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

function buildAnalyzeFeedbackKey(recordId: string, mode: AnalyzeMode) {
  return `${recordId}:${mode}`;
}

function buildEmptyState(
  languageText: ReturnType<typeof useAppI18n>["t"],
  language: ReturnType<typeof useAppI18n>["appLanguage"],
  searchQuery: string,
  selectedFolderId: string | null,
  selectedTagId: string | null,
  activeFilter: "all" | "recent" | "unorganized" | "not_started" | "needs_review" | "review_later"
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
    const presentation = getSidebarFilterPresentation("unorganized", language);
    return { title: presentation.emptyTitle, description: presentation.emptyDescription };
  }

  if (activeFilter === "not_started") {
    const presentation = getSidebarFilterPresentation("not_started", language);
    return { title: presentation.emptyTitle, description: presentation.emptyDescription };
  }

  if (activeFilter === "needs_review") {
    const presentation = getSidebarFilterPresentation("needs_review", language);
    return { title: presentation.emptyTitle, description: presentation.emptyDescription };
  }

  if (activeFilter === "review_later") {
    const presentation = getSidebarFilterPresentation("review_later", language);
    return { title: presentation.emptyTitle, description: presentation.emptyDescription };
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
  const [detailDismissed, setDetailDismissed] = useState(false);
  const [analyzeFeedbackByKey, setAnalyzeFeedbackByKey] = useState<Record<string, AnalyzeFeedback>>({});

  const filteredRecords = useRecordFilters(records, tags, folders);
  const selectedRecord = filteredRecords.find((record) => record.id === selectedRecordId) || null;
  const selectedAnalyzeFeedback =
    selectedRecord
      ? analyzeFeedbackByKey[buildAnalyzeFeedbackKey(selectedRecord.id, getActiveMode(selectedRecord))] || null
      : null;

  useEffect(() => {
    const hasSelectedRecord = filteredRecords.some((record) => record.id === selectedRecordId);

    if (!selectedRecordId && detailDismissed) {
      return;
    }

    if ((!selectedRecordId || !hasSelectedRecord) && filteredRecords[0]) {
      setSelectedRecordId(filteredRecords[0].id);
    }
  }, [detailDismissed, filteredRecords, selectedRecordId, setSelectedRecordId]);

  useEffect(() => {
    if (selectedRecord) {
      void recordRepository.update(selectedRecord.id, {
        lastViewedAt: new Date().toISOString(),
        updatedAt: selectedRecord.updatedAt
      });
    }
  }, [selectedRecord?.id]);

  const emptyState = buildEmptyState(t, appLanguage, searchQuery, selectedFolderId, selectedTagId, activeFilter);

  const normalizedFolders = folders;
  const normalizedTags = tags;
  const uncategorizedCount = countUncategorizedRecords(records, normalizedFolders);

  const handleCreateRecord = async (draft: CreateRecordDraft) => {
    const tagIds: string[] = [];
    for (const tagName of draft.tagNames) {
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
      title: draft.title,
      sourcePlatform: draft.sourcePlatform,
      sourceType: draft.sourceType,
      inputMethod: draft.inputMethod,
      originalUrl: draft.originalUrl,
      folderId: draft.folderId,
      tagIds,
      createdAt: draft.createdAt,
      updatedAt: draft.createdAt,
      watchedAt: null,
      lastViewedAt: null,
      originalContent: draft.originalContent,
      personalNote: "",
      reviewLater: false,
      transcriptionStatus: draft.transcriptionStatus,
      contentCompleteness: draft.contentCompleteness,
      transcriptMeta: draft.transcriptMeta,
      mediaAsset: draft.mediaAsset,
      aiStatus: "not_started",
      aiErrorMessage: null,
      importSummary: draft.importSummary,
      currentMode: null,
      aiOutputs: {
        concise: null,
        learning: null
      }
    };

    await recordRepository.create(record);
    setDetailDismissed(false);
    setSelectedRecordId(record.id);
    setCreateModalOpen(false);
  };

  const handleAnalyze = async (record: RecordItem, mode: AnalyzeMode) => {
    const feedbackKey = buildAnalyzeFeedbackKey(record.id, mode);

    if (!record.originalContent.trim()) {
      window.alert(t.common.originalContentRequired);
      return;
    }

    setAnalyzeFeedbackByKey((current) => {
      const next = { ...current };
      delete next[feedbackKey];
      return next;
    });

    await recordRepository.update(record.id, {
      aiStatus: "processing",
      aiErrorMessage: null,
      aiErrorCode: null,
      updatedAt: new Date().toISOString()
    });

    const response = await analyzeRecord(record, mode, appLanguage);

    if (response.outcome === "failed") {
      setAnalyzeFeedbackByKey((current) => {
        const next = { ...current };
        delete next[feedbackKey];
        return next;
      });
      await recordRepository.update(record.id, {
        aiStatus: "failed",
        aiErrorCode: response.error.code,
        aiErrorMessage: getAnalyzeErrorMessage(response.error.code, appLanguage),
        updatedAt: new Date().toISOString()
      });
      return;
    }

    if (response.outcome === "needs_review") {
      setAnalyzeFeedbackByKey((current) => ({
        ...current,
        [feedbackKey]: {
          recordId: record.id,
          mode,
          generatedAt: response.meta.generatedAt,
          source: response.meta.source,
          review: response.review
        }
      }));
      await recordRepository.update(record.id, {
        currentMode: mode,
        aiStatus: "needs_review",
        aiErrorMessage: null,
        aiErrorCode: null,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    setAnalyzeFeedbackByKey((current) => {
      const next = { ...current };
      delete next[feedbackKey];
      return next;
    });

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

  const handleResumeTranscription = async (record: RecordItem): Promise<ResumeTranscriptionOutcome> => {
    if (!canResumeTranscription(record) || !record.originalUrl) {
      return { status: "failed", reason: "no_import_result" };
    }

    try {
      const session = await resolveImport({
        inputMethod: "link",
        originalUrl: record.originalUrl,
        appLanguage
      });

      if (!session.result) {
        return { status: "failed", reason: "no_import_result" };
      }

      const snapshot = buildRecordImportSnapshot(session.result);
      const patch: Partial<RecordItem> = {
        originalUrl: snapshot.originalUrl ?? record.originalUrl,
        sourcePlatform:
          snapshot.platform !== "unknown" ? snapshot.platform : record.sourcePlatform,
        importSummary: snapshot.importSummary,
        updatedAt: new Date().toISOString()
      };

      const detectedContent = session.result.detectedContent?.trim();
      if (detectedContent) {
        patch.originalContent = detectedContent;
        patch.contentCompleteness =
          session.result.contentCompleteness === "empty"
            ? "none"
            : session.result.contentCompleteness;
      }

      await recordRepository.update(record.id, patch);
      if (!detectedContent) {
        return { status: "failed", reason: "no_detected_content" };
      }

      return { status: "patched" };
    } catch {
      return { status: "failed", reason: "request_failed" };
    }
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

  const handleSelectRecord = (recordId: string) => {
    setDetailDismissed(false);
    setSelectedRecordId(recordId);
  };

  const handleCloseDetail = () => {
    setDetailDismissed(true);
    setSelectedRecordId(null);
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
    setAnalyzeFeedbackByKey((current) => {
      const next = { ...current };
      delete next[buildAnalyzeFeedbackKey(confirmState.target.id, "concise")];
      delete next[buildAnalyzeFeedbackKey(confirmState.target.id, "learning")];
      return next;
    });
    if (selectedRecordId === confirmState.target.id) {
      setDetailDismissed(false);
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
        detailOpen={Boolean(selectedRecord)}
        onCloseDetail={handleCloseDetail}
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
            activeFilter={activeFilter}
            selectedRecordId={selectedRecordId}
            emptyTitle={emptyState.title}
            emptyDescription={emptyState.description}
            onSelectRecord={handleSelectRecord}
          />
        }
        detail={
          <DetailPane
            record={selectedRecord}
            folders={normalizedFolders}
            tags={normalizedTags}
            analyzeFeedback={selectedAnalyzeFeedback}
            onAnalyze={handleAnalyze}
            onResumeTranscription={handleResumeTranscription}
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
