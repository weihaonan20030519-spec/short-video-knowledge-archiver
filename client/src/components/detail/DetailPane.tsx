import { useEffect, useMemo, useRef, useState } from "react";

import type { AnalyzeMode, Folder, RecordItem, Tag } from "../../types/domain";
import { recordRepository } from "../../db/repositories/recordRepository";
import { useAppI18n } from "../../hooks/useAppI18n";
import { useAutoSave } from "../../hooks/useAutoSave";
import { buildKnowledgeSections } from "../../lib/aiPresentation";
import { exportRecordToPdf } from "../../lib/exportPdf";
import {
  getMediaAssetDisplayState,
  getSafeMediaAsset
} from "../../services/mediaAsset/mediaAssetMapper";
import {
  getAnalyzeErrorMessage,
  getFolderDisplayName,
  getSourceTypeLabel
} from "../../lib/i18n";
import { getActiveMode } from "../../lib/aiTransform";
import { getPlatformLabel } from "../../lib/platform";
import {
  getStatusLabel,
  getTranscriptionStatusLabel,
  statusToneMap
} from "../../lib/status";
import { formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from "../../lib/time";
import { useUIStore } from "../../stores/uiStore";
import { EmptyState } from "../common/EmptyState";
import { SectionCard } from "../common/SectionCard";
import { AiKnowledgeSkeleton, AiKnowledgeView } from "./AiKnowledgeView";

interface DetailPaneProps {
  record: RecordItem | null;
  folders: Folder[];
  tags: Tag[];
  onAnalyze: (record: RecordItem, mode: AnalyzeMode) => Promise<void>;
  onDeleteRecord: (record: RecordItem) => Promise<void>;
}

export function DetailPane({ record, folders, tags, onAnalyze, onDeleteRecord }: DetailPaneProps) {
  const { appLanguage, t } = useAppI18n();
  const { showOriginalAiResult, setShowOriginalAiResult } = useUIStore();
  const [draft, setDraft] = useState<RecordItem | null>(record);
  const [aiViewMode, setAiViewMode] = useState<"preview" | "edit">("preview");
  const [pendingAnalyzeMode, setPendingAnalyzeMode] = useState<AnalyzeMode | null>(null);
  const [freshResultMode, setFreshResultMode] = useState<AnalyzeMode | null>(null);
  const previousGeneratedAtRef = useRef<{ concise: string | null; learning: string | null }>({
    concise: null,
    learning: null
  });

  useEffect(() => {
    setDraft(record);

    if (!record) {
      setPendingAnalyzeMode(null);
      previousGeneratedAtRef.current = {
        concise: null,
        learning: null
      };
      return;
    }

    const nextGeneratedAt = {
      concise: record.aiOutputs.concise?.generatedAt || null,
      learning: record.aiOutputs.learning?.generatedAt || null
    };

    (["concise", "learning"] as AnalyzeMode[]).forEach((mode) => {
      if (
        nextGeneratedAt[mode] &&
        nextGeneratedAt[mode] !== previousGeneratedAtRef.current[mode]
      ) {
        setFreshResultMode(mode);
      }
    });

    if (record.aiStatus !== "processing") {
      setPendingAnalyzeMode(null);
    }

    previousGeneratedAtRef.current = nextGeneratedAt;
  }, [record]);

  useEffect(() => {
    if (!freshResultMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFreshResultMode(null);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [freshResultMode]);

  const autoSave = useAutoSave(async (patch: Partial<RecordItem>) => {
    if (!record) {
      return;
    }

    await recordRepository.update(record.id, {
      ...patch,
      updatedAt: new Date().toISOString()
    });
  });

  const tagOptions = useMemo(() => {
    if (!draft) {
      return [];
    }

    return tags.map((tag) => ({
      ...tag,
      checked: draft.tagIds.includes(tag.id)
    }));
  }, [draft, tags]);

  if (!draft) {
    return (
      <section className="flex h-full min-w-0 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50/95 p-6 shadow-panel">
        <EmptyState title={t.empty.noSelectionTitle} description={t.empty.noSelectionDescription} />
      </section>
    );
  }

  const activeMode = getActiveMode(draft);
  const mediaAsset = getSafeMediaAsset(draft);
  const mediaAssetDisplay = getMediaAssetDisplayState(appLanguage, mediaAsset);
  const activeSlot = draft.aiOutputs[activeMode];
  const pendingMode = pendingAnalyzeMode || (draft.aiStatus === "processing" ? activeMode : null);
  const isAnalyzePending = Boolean(pendingMode);
  const pendingModeLabel =
    pendingMode === "learning" ? t.detail.learning : t.detail.concise;

  const handleRecordPatch = (patch: Partial<RecordItem>) => {
    const nextTranscriptionStatus =
      patch.originalContent !== undefined &&
      patch.originalContent !== draft.originalContent &&
      draft.transcriptionStatus === "transcript_needs_review"
        ? "transcript_ready"
        : patch.transcriptionStatus || draft.transcriptionStatus;
    const nextRecord = {
      ...draft,
      ...patch,
      transcriptionStatus: nextTranscriptionStatus,
      updatedAt: new Date().toISOString()
    };

    setDraft(nextRecord);
    autoSave({
      ...patch,
      transcriptionStatus: nextTranscriptionStatus
    });
  };

  const currentFolder = folders.find((folder) => folder.id === draft.folderId) || null;
  const currentFolderName = currentFolder
    ? getFolderDisplayName(currentFolder, appLanguage)
    : t.common.systemFolder;
  const activeResult = activeSlot
    ? showOriginalAiResult
      ? activeSlot.originalResult
      : activeSlot.currentResult
    : null;
  const knowledgeSections = activeResult
    ? buildKnowledgeSections(activeMode, activeResult, {
        summary: t.detail.summary,
        bullets: t.detail.bullets,
        coreConclusion: t.detail.coreConclusion,
        logicFramework: t.detail.logicFramework,
        keyDetails: t.detail.keyDetails,
        reusablePoints: t.detail.reusablePoints
      })
    : [];
  const aiErrorMessage =
    draft.aiErrorCode != null
      ? getAnalyzeErrorMessage(draft.aiErrorCode, appLanguage)
      : draft.aiErrorMessage;

  const renderAiLoadingState = () => {
    const statusTitle = t.detail.analyzingMode(pendingModeLabel);
    const statusDescription = t.detail.analyzingDescription(pendingModeLabel);

    const sectionTitles =
      pendingMode === "learning"
        ? [
            t.detail.coreConclusion,
            t.detail.logicFramework,
            t.detail.keyDetails,
            t.detail.reusablePoints
          ]
        : [t.detail.summary, t.detail.bullets];

    return (
      <AiKnowledgeSkeleton
        sectionTitles={sectionTitles}
        title={statusTitle}
        description={statusDescription}
      />
    );
  };

  const renderAiPreview = () => {
    if (!activeSlot || !activeResult) {
      if (isAnalyzePending) {
        return renderAiLoadingState();
      }

      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">{t.detail.noAiResult}</p>
          <p className="mt-1">{t.detail.noAiResultDescription}</p>
        </div>
      );
    }

    return (
      <AiKnowledgeView
        sections={knowledgeSections}
        previewHint={t.detail.previewHint}
        isRefreshing={isAnalyzePending}
        statusBanner={
          isAnalyzePending
            ? {
                tone: "processing",
                title: t.detail.analyzingMode(pendingModeLabel),
                description: t.detail.keepPreviousResult
              }
            : freshResultMode === activeMode
              ? {
                  tone: "updated",
                  title: t.detail.updatedJustNow,
                  description: `${t.detail.generatedAt}: ${formatDateTime(activeSlot.generatedAt)}`
                }
              : null
        }
        legend={{
          core: t.detail.legend.core,
          method: t.detail.legend.method,
          action: t.detail.legend.action,
          warning: t.detail.legend.warning
        }}
      />
    );
  };

  const renderAiEditor = () => {
    if (!activeSlot || showOriginalAiResult || isAnalyzePending) {
      return renderAiPreview();
    }

    if (activeMode === "concise") {
      const conciseSlot = draft.aiOutputs.concise;

      if (!conciseSlot) {
        return renderAiPreview();
      }

      const result = conciseSlot.currentResult;

      return (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.summary}</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none"
              value={result.summary}
              onChange={(event) =>
                handleRecordPatch({
                  aiOutputs: {
                    ...draft.aiOutputs,
                    concise: {
                      ...conciseSlot,
                      currentResult: {
                        ...result,
                        summary: event.target.value
                      },
                      lastEditedAt: new Date().toISOString()
                    }
                  }
                })
              }
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.bullets}</span>
            <textarea
              className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none"
              value={result.bullets.join("\n")}
              onChange={(event) =>
                handleRecordPatch({
                  aiOutputs: {
                    ...draft.aiOutputs,
                    concise: {
                      ...conciseSlot,
                      currentResult: {
                        ...result,
                        bullets: event.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      },
                      lastEditedAt: new Date().toISOString()
                    }
                  }
                })
              }
            />
          </label>
        </div>
      );
    }

    const learningSlot = draft.aiOutputs.learning;

    if (!learningSlot) {
      return renderAiPreview();
    }

    const result = learningSlot.currentResult;

    return (
      <div className="space-y-4">
        {[
          ["coreConclusion", t.detail.coreConclusion],
          ["logicFramework", t.detail.logicFramework],
          ["keyDetails", t.detail.keyDetails],
          ["reusablePoints", t.detail.reusablePoints]
        ].map(([field, label]) => (
          <label className="block" key={field}>
            <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none"
              value={
                Array.isArray(result[field as keyof typeof result])
                  ? (result[field as keyof typeof result] as string[]).join("\n")
                  : String(result[field as keyof typeof result] || "")
              }
              onChange={(event) =>
                handleRecordPatch({
                  aiOutputs: {
                    ...draft.aiOutputs,
                    learning: {
                      ...learningSlot,
                      currentResult: {
                        ...result,
                        [field]:
                          field === "coreConclusion"
                            ? event.target.value
                            : event.target.value
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean)
                      },
                      lastEditedAt: new Date().toISOString()
                    }
                  }
                })
              }
            />
          </label>
        ))}
      </div>
    );
  };

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-[28px] border border-slate-200/90 bg-slate-50/95 p-4 shadow-panel scrollbar-thin"
      data-testid="detail-pane-scroll"
    >
      <SectionCard
        title={t.detail.basicInfo}
        action={
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusToneMap[draft.aiStatus]}`}>
            {getStatusLabel(draft.aiStatus, appLanguage)}
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.title}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              value={draft.title}
              onChange={(event) => handleRecordPatch({ title: event.target.value })}
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.sourcePlatform}: {getPlatformLabel(draft.sourcePlatform, appLanguage)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.sourceType}: {getSourceTypeLabel(draft.sourceType, appLanguage)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.transcriptionStatus}:{" "}
            <span className="font-medium text-slate-700">
              {getTranscriptionStatusLabel(draft.transcriptionStatus, appLanguage)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.createdAt}: {formatDateTime(draft.createdAt)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.updatedAt}: {formatDateTime(draft.updatedAt)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.originalUrl}: {draft.originalUrl || t.common.emptyValue}
          </div>

          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.watchedAt}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              type="datetime-local"
              value={toDateTimeLocalValue(draft.watchedAt)}
              onChange={(event) => handleRecordPatch({ watchedAt: fromDateTimeLocalValue(event.target.value) })}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title={t.detail.transcriptMetadata}>
        {draft.transcriptMeta ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.fileName}: {draft.transcriptMeta.fileName}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.fileType}: {draft.transcriptMeta.mimeType}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.duration}: {draft.transcriptMeta.duration ?? t.common.emptyValue}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.language}: {draft.transcriptMeta.language || t.common.emptyValue}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.segments}: {draft.transcriptMeta.segments?.length ?? 0}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t.detail.timestamps}: {draft.transcriptMeta.timestamps?.length ?? 0}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t.detail.noTranscriptAvailable}</p>
        )}
      </SectionCard>

      <SectionCard title={t.detail.mediaAsset.title}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.mediaAsset.storageMode}: {mediaAssetDisplay.storageLabel}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.mediaAsset.availability}:{" "}
            <span className="font-medium text-slate-700">{mediaAssetDisplay.availabilityLabel}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.fileName}: {mediaAsset.fileName || t.common.emptyValue}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.fileType}: {mediaAsset.mimeType || t.common.emptyValue}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.mediaAsset.fileSize}: {mediaAsset.size ?? t.common.emptyValue}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.detail.duration}: {mediaAsset.duration ?? t.common.emptyValue}
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">{mediaAssetDisplay.availabilityDescription}</p>
      </SectionCard>

      <SectionCard title={t.detail.classification}>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.folder}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              value={currentFolder?.id || ""}
              onChange={(event) => handleRecordPatch({ folderId: event.target.value || null })}
            >
              <option value="">{t.common.systemFolder}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {getFolderDisplayName(folder, appLanguage)}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.tags}</span>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag.id}
                  aria-pressed={tag.checked}
                  className={`rounded-full px-3 py-2 text-sm ${
                    tag.checked ? "bg-teal-100 text-teal-900 ring-1 ring-teal-200" : "bg-slate-100 text-slate-600"
                  }`}
                  onClick={() => {
                    const nextTagIds = tag.checked
                      ? draft.tagIds.filter((tagId) => tagId !== tag.id)
                      : [...draft.tagIds, tag.id];
                    handleRecordPatch({ tagIds: nextTagIds });
                  }}
                  type="button"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t.detail.originalContent}>
        <textarea
          className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none"
          placeholder={t.detail.originalContentPlaceholder}
          value={draft.originalContent}
          onChange={(event) => handleRecordPatch({ originalContent: event.target.value })}
        />
        {!draft.originalContent.trim() ? (
          <p className="mt-3 text-sm text-amber-700">{t.common.originalContentRequired}</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title={t.detail.aiPanel}
        action={
          <div className="flex items-center gap-2">
            <button
              className={`rounded-full px-3 py-1 text-xs ${
                activeMode === "concise" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
              disabled={isAnalyzePending}
              onClick={() => handleRecordPatch({ currentMode: "concise" })}
              type="button"
            >
              {t.detail.concise}
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs ${
                activeMode === "learning" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
              disabled={isAnalyzePending}
              onClick={() => handleRecordPatch({ currentMode: "learning" })}
              type="button"
            >
              {t.detail.learning}
            </button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isAnalyzePending}
            onClick={async () => {
              setPendingAnalyzeMode(activeMode);
              try {
                await onAnalyze(draft, activeMode);
              } finally {
                setPendingAnalyzeMode(null);
              }
            }}
            type="button"
          >
            {isAnalyzePending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            {isAnalyzePending
              ? t.detail.analyzingMode(pendingModeLabel)
              : activeSlot
                ? t.detail.retryAnalyze
                : t.detail.startAnalyze}
          </button>
          <div className="rounded-full bg-slate-100 p-1">
            <button
              className={`rounded-full px-3 py-1 text-xs ${
                aiViewMode === "preview" ? "bg-white text-slate-900 shadow-subtle" : "text-slate-600"
              }`}
              onClick={() => setAiViewMode("preview")}
              type="button"
            >
              {t.detail.aiPreview}
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs ${
                aiViewMode === "edit" ? "bg-white text-slate-900 shadow-subtle" : "text-slate-600"
              }`}
              disabled={!activeSlot || showOriginalAiResult}
              onClick={() => setAiViewMode("edit")}
              type="button"
            >
              {t.detail.aiEdit}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              checked={showOriginalAiResult}
              onChange={(event) => setShowOriginalAiResult(event.target.checked)}
              type="checkbox"
            />
            {t.detail.viewOriginal}
          </label>
          {activeSlot ? (
            <span className="text-sm text-slate-500">
              {t.detail.generatedAt}: {formatDateTime(activeSlot.generatedAt)}
            </span>
          ) : null}
          {aiErrorMessage ? <span className="text-sm text-rose-600">{aiErrorMessage}</span> : null}
        </div>
        {draft.aiStatus === "failed" && aiErrorMessage ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-medium">{t.detail.latestAnalyzeFailed}</p>
            <p className="mt-1">{aiErrorMessage}</p>
          </div>
        ) : null}
        {aiViewMode === "edit" ? renderAiEditor() : renderAiPreview()}
      </SectionCard>

      <SectionCard title={t.detail.personalNote}>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none"
          placeholder={t.detail.personalNotePlaceholder}
          value={draft.personalNote}
          onChange={(event) => handleRecordPatch({ personalNote: event.target.value })}
        />
      </SectionCard>

      <SectionCard title={t.detail.actions}>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
            onClick={() => exportRecordToPdf(draft, currentFolderName, tags, appLanguage)}
            type="button"
          >
            {t.detail.exportPdf}
          </button>
          <button
            className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white"
            onClick={() => onDeleteRecord(draft)}
            type="button"
          >
            {t.detail.deleteRecord}
          </button>
        </div>
      </SectionCard>
    </section>
  );
}
