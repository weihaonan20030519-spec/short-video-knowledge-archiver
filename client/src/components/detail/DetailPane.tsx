import { useEffect, useMemo, useRef, useState } from "react";

import type { AnalyzeMode, Folder, RecordItem, Tag } from "../../types/domain";
import { recordRepository } from "../../db/repositories/recordRepository";
import { useAppI18n } from "../../hooks/useAppI18n";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useElementWidthThreshold } from "../../hooks/useElementWidthThreshold";
import { buildKnowledgeSections } from "../../lib/aiPresentation";
import { exportRecordToPdf } from "../../lib/exportPdf";
import {
  canResumeTranscription,
  type ResumeTranscriptionOutcome,
  type ResumeTranscriptionFailureReason
} from "../../lib/transcriptionResume";
import {
  getMediaAssetDisplayState,
  getSafeMediaAsset
} from "../../services/mediaAsset/mediaAssetMapper";
import {
  getAnalyzeErrorMessage,
  getFolderDisplayName
} from "../../lib/i18n";
import { getActiveMode } from "../../lib/aiTransform";
import { getRecordSummarySignals } from "../../lib/recordSummary";
import { deriveRecordSourceSummary } from "../../lib/sourceTransparency";
import { getDisplayedTranscriptionStatusLabel } from "../../lib/status";
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
  onResumeTranscription?: (record: RecordItem) => Promise<ResumeTranscriptionOutcome>;
  onDeleteRecord: (record: RecordItem) => Promise<void>;
}

function formatOriginalUrlForDisplay(originalUrl: string) {
  const trimmedUrl = originalUrl.trim();

  if (!trimmedUrl) {
    return trimmedUrl;
  }

  const parseUrl = (value: string) => {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  };

  const parsedUrl =
    parseUrl(trimmedUrl) ||
    (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")
      ? null
      : parseUrl(`https://${trimmedUrl}`));

  const displayValue = parsedUrl
    ? `${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
    : trimmedUrl;

  if (displayValue.length <= 60) {
    return displayValue;
  }

  return `${displayValue.slice(0, 34)}…${displayValue.slice(-18)}`;
}

export function DetailPane({
  record,
  folders,
  tags,
  onAnalyze,
  onResumeTranscription,
  onDeleteRecord
}: DetailPaneProps) {
  const { appLanguage, t } = useAppI18n();
  const { showOriginalAiResult, setShowOriginalAiResult } = useUIStore();
  const [draft, setDraft] = useState<RecordItem | null>(record);
  const [aiViewMode, setAiViewMode] = useState<"preview" | "edit">("preview");
  const [pendingAnalyzeMode, setPendingAnalyzeMode] = useState<AnalyzeMode | null>(null);
  const [freshResultMode, setFreshResultMode] = useState<AnalyzeMode | null>(null);
  const [resumeTranscriptionState, setResumeTranscriptionState] = useState<"idle" | "loading" | "error">("idle");
  const [resumeTranscriptionErrorReason, setResumeTranscriptionErrorReason] =
    useState<ResumeTranscriptionFailureReason | null>(null);
  const [aiWorkspaceControlsRef, isAiWorkspaceControlsExpanded] =
    useElementWidthThreshold<HTMLDivElement>(180, "min");
  const previousGeneratedAtRef = useRef<{ concise: string | null; learning: string | null }>({
    concise: null,
    learning: null
  });

  useEffect(() => {
    setDraft(record);
    setResumeTranscriptionState("idle");
    setResumeTranscriptionErrorReason(null);

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
  const sourceSummary = deriveRecordSourceSummary(draft, appLanguage);
  const summarySignals = getRecordSummarySignals(draft, appLanguage);
  const showResumeTranscriptionCta = canResumeTranscription(draft) && Boolean(onResumeTranscription);
  const originalUrl = draft.originalUrl?.trim() || "";
  const originalUrlDisplay = originalUrl ? formatOriginalUrlForDisplay(originalUrl) : "";
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
  const hasSourceContent = Boolean(draft.originalContent.trim());
  const hasAnyAiResult = Boolean(draft.aiOutputs.concise || draft.aiOutputs.learning);
  const shouldPrioritizeAi = hasAnyAiResult;
  const canRunAnalyze = hasSourceContent && !isAnalyzePending;
  const showAiResultControls = Boolean(activeSlot);

  const handleCopyOriginalUrl = async () => {
    if (!originalUrl) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(originalUrl);
        return;
      }
    } catch {
      // Fall back to a hidden textarea below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = originalUrl;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    try {
      textarea.focus();
      textarea.select();
      if (typeof document.execCommand === "function") {
        document.execCommand("copy");
      }
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleResumeTranscription = async () => {
    if (!onResumeTranscription || !showResumeTranscriptionCta) {
      return;
    }

    setResumeTranscriptionState("loading");
    try {
      const result = await onResumeTranscription(draft);
      if (result.status === "patched") {
        setResumeTranscriptionState("idle");
        setResumeTranscriptionErrorReason(null);
        return;
      }

      setResumeTranscriptionState("error");
      setResumeTranscriptionErrorReason(result.reason);
    } catch {
      setResumeTranscriptionState("error");
      setResumeTranscriptionErrorReason("request_failed");
    }
  };

  const getResumeTranscriptionErrorMessage = () => {
    if (!resumeTranscriptionErrorReason) {
      return t.detail.resumeTranscriptionError;
    }

    if (resumeTranscriptionErrorReason === "request_failed") {
      return t.detail.resumeTranscriptionErrorRequestFailed;
    }

    if (resumeTranscriptionErrorReason === "no_import_result") {
      return t.detail.resumeTranscriptionErrorNoImportResult;
    }

    if (resumeTranscriptionErrorReason === "no_detected_content") {
      return t.detail.resumeTranscriptionErrorNoDetectedContent;
    }

    if (resumeTranscriptionErrorReason === "patch_failed") {
      return t.detail.resumeTranscriptionErrorPatchFailed;
    }

    return t.detail.resumeTranscriptionError;
  };

  const renderAiLoadingState = () => {
    const statusTitle = t.detail.aiLoadingNoticeTitle;
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
          <p className="font-medium text-slate-700">
            {hasSourceContent ? t.detail.noAiResult : t.detail.noAiResultNeedsSource}
          </p>
          <p className="mt-1">
            {hasSourceContent ? t.detail.noAiResultDescription : t.detail.noAiResultNeedsSourceDescription}
          </p>
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
                title: t.detail.aiRefreshingNoticeTitle,
                description: t.detail.aiRefreshingNoticeDescription(pendingModeLabel)
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
          primary: t.detail.legend.primary,
          secondary: t.detail.legend.secondary
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

  const originalContentSection = (
    <SectionCard title={t.detail.originalContent}>
      <div data-testid="detail-original-content-section">
        <textarea
          className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none whitespace-pre-wrap break-words"
          placeholder={t.detail.originalContentPlaceholder}
          value={draft.originalContent}
          onChange={(event) => handleRecordPatch({ originalContent: event.target.value })}
        />
        {!draft.originalContent.trim() ? (
          <p className="mt-3 text-sm text-amber-700">{t.common.originalContentRequired}</p>
        ) : null}
      </div>
    </SectionCard>
  );

  const aiPanelSection = (
    <SectionCard
      title={t.detail.aiPanel}
      headerTestId="detail-ai-workspace-header"
      action={
        <div
          ref={aiWorkspaceControlsRef}
          className="flex max-w-full flex-wrap gap-2"
          data-layout={isAiWorkspaceControlsExpanded ? "expanded" : "compact"}
          data-testid="detail-ai-workspace-controls"
        >
          <button
            className={`rounded-full text-xs leading-none ${
              isAiWorkspaceControlsExpanded
                ? "min-w-[6.5rem] px-5 py-2"
                : "min-w-[5.75rem] px-4 py-1.5"
            } ${
              activeMode === "concise" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
            }`}
            disabled={isAnalyzePending}
            onClick={() => handleRecordPatch({ currentMode: "concise" })}
            type="button"
          >
            {t.detail.concise}
          </button>
          <button
            className={`rounded-full text-xs leading-none ${
              isAiWorkspaceControlsExpanded
                ? "min-w-[6.5rem] px-5 py-2"
                : "min-w-[5.75rem] px-4 py-1.5"
            } ${
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
      <div data-testid="detail-ai-section">
        <div
          className="mb-4 flex flex-wrap items-start gap-3"
          data-testid="detail-ai-toolbar"
        >
          <button
            data-testid="detail-ai-primary-action"
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white whitespace-normal break-words disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canRunAnalyze}
            onClick={async () => {
              if (!hasSourceContent) {
                return;
              }
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
                : hasSourceContent
                  ? t.detail.startAnalyze
                  : t.detail.startAnalyzeAfterContent}
          </button>
          {showAiResultControls ? (
            <div
              className="flex min-w-0 flex-[1_1_18rem] flex-wrap items-center gap-3"
              data-testid="detail-ai-result-controls"
            >
              <div
                className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-slate-100 p-1.5"
                data-testid="detail-segmented-control-layout"
              >
                <button
                  className={`min-w-[5.75rem] rounded-full px-4 py-1.5 text-xs leading-none ${
                    aiViewMode === "preview" ? "bg-white text-slate-900 shadow-subtle" : "text-slate-600"
                  }`}
                  onClick={() => setAiViewMode("preview")}
                  type="button"
                >
                  {t.detail.aiPreview}
                </button>
                <button
                  className={`min-w-[5.75rem] rounded-full px-4 py-1.5 text-xs leading-none ${
                    aiViewMode === "edit" ? "bg-white text-slate-900 shadow-subtle" : "text-slate-600"
                  }`}
                  disabled={!activeSlot || showOriginalAiResult}
                  onClick={() => setAiViewMode("edit")}
                  type="button"
                >
                  {t.detail.aiEdit}
                </button>
              </div>
              <label className="flex min-w-0 flex-[1_1_12rem] items-start gap-2 text-sm text-slate-600 break-words">
                <input
                  checked={showOriginalAiResult}
                  onChange={(event) => setShowOriginalAiResult(event.target.checked)}
                  type="checkbox"
                />
                {t.detail.viewOriginal}
              </label>
              {activeSlot ? (
                <span className="min-w-0 flex-[1_1_12rem] break-words text-sm text-slate-500">
                  {t.detail.generatedAt}: {formatDateTime(activeSlot.generatedAt)}
                </span>
              ) : null}
            </div>
          ) : null}
          {aiErrorMessage ? <span className="min-w-0 break-words text-sm text-rose-600">{aiErrorMessage}</span> : null}
        </div>
        {draft.aiStatus === "failed" && aiErrorMessage ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-medium">{t.detail.latestAnalyzeFailed}</p>
            <p className="mt-1">{aiErrorMessage}</p>
          </div>
        ) : null}
        {aiViewMode === "edit" ? renderAiEditor() : renderAiPreview()}
      </div>
    </SectionCard>
  );

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-y-auto rounded-[28px] border border-slate-200/90 bg-slate-50/95 p-4 shadow-panel scrollbar-thin"
      data-testid="detail-pane-scroll"
    >
      <section
        className="rounded-3xl border border-slate-200/90 bg-white/90 px-5 py-4 shadow-subtle"
        data-testid="detail-header-summary"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.detail.basicInfo}
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="sr-only">{t.detail.title}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none"
              value={draft.title}
              onChange={(event) => handleRecordPatch({ title: event.target.value })}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2" data-testid="detail-header-chips">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${summarySignals.status.tone}`}>
              {summarySignals.status.label}
            </span>
            {summarySignals.reviewLaterLabel ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                {summarySignals.reviewLaterLabel}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {summarySignals.entryLabel}
            </span>
            {summarySignals.platformLabel ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {summarySignals.platformLabel}
              </span>
            ) : null}
          </div>

          {sourceSummary.headline || sourceSummary.detail ? (
            <div
              className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600"
              data-testid="detail-source-summary"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t.detail.sourceSummary}
              </p>
              {sourceSummary.headline ? (
                <p className="mt-2 text-sm font-medium text-slate-800">{sourceSummary.headline}</p>
              ) : null}
              {sourceSummary.detail ? (
                <p className={`${sourceSummary.headline ? "mt-1" : "mt-2"} text-sm leading-6 text-slate-500`}>
                  {sourceSummary.detail}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="space-y-4" data-testid="detail-primary-reading-region">
        {shouldPrioritizeAi ? (
          <>
            {aiPanelSection}
            {originalContentSection}
          </>
        ) : (
          <>
            {originalContentSection}
            {aiPanelSection}
          </>
        )}
      </div>

      <SectionCard title={t.detail.personalNote}>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none whitespace-pre-wrap break-words"
          placeholder={t.detail.personalNotePlaceholder}
          value={draft.personalNote}
          onChange={(event) => handleRecordPatch({ personalNote: event.target.value })}
        />
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

      <SectionCard title={t.detail.supportingInfo}>
        <div className="space-y-4" data-testid="detail-supporting-info-region">
          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.detail.transcriptMetadata}
            </p>
            <div
              className="mt-2 flex flex-wrap items-start justify-between gap-3"
              data-testid="detail-transcription-status"
            >
              <div className="min-w-0 flex-1">
                <p>
                  {t.detail.transcriptionStatus}:{" "}
                  <span className="font-medium text-slate-700">
                    {getDisplayedTranscriptionStatusLabel(draft, appLanguage)}
                  </span>
                </p>
                {draft.transcriptMeta ? (
                  <p className="mt-1 leading-6 text-slate-500">
                    {draft.transcriptMeta.fileName} · {draft.transcriptMeta.mimeType} · {t.detail.language}:{" "}
                    {draft.transcriptMeta.language || t.common.emptyValue} · {t.detail.segments}:{" "}
                    {draft.transcriptMeta.segments?.length ?? 0}
                  </p>
                ) : (
                  <p className="mt-1 leading-6 text-slate-500">{t.detail.noTranscriptAvailable}</p>
                )}
                {showResumeTranscriptionCta ? (
                  <p className="mt-2 text-xs text-slate-500">{t.detail.resumeTranscriptionHint}</p>
                ) : null}
                {resumeTranscriptionState === "error" ? (
                  <p className="mt-2 text-xs text-rose-600">{getResumeTranscriptionErrorMessage()}</p>
                ) : null}
              </div>
              {showResumeTranscriptionCta ? (
                <button
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={resumeTranscriptionState === "loading"}
                  onClick={() => void handleResumeTranscription()}
                  type="button"
                >
                  {resumeTranscriptionState === "loading"
                    ? t.detail.resumeTranscriptionLoading
                    : t.detail.resumeTranscription}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.detail.mediaAsset.title}
            </p>
            <div className="mt-2 space-y-1.5">
              <p>
                {t.detail.mediaAsset.storageMode}:{" "}
                <span className="font-medium text-slate-700">{mediaAssetDisplay.storageLabel}</span>
              </p>
              <p>
                {t.detail.mediaAsset.availability}:{" "}
                <span className="font-medium text-slate-700">{mediaAssetDisplay.availabilityLabel}</span>
              </p>
              <p className="leading-6 text-slate-500">{mediaAssetDisplay.availabilityDescription}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <section
        className="rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-subtle"
        data-testid="detail-more-metadata"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t.detail.moreMetadata}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
            {t.detail.createdAt}: {formatDateTime(draft.createdAt)}
          </div>
          <div className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
            {t.detail.updatedAt}: {formatDateTime(draft.updatedAt)}
          </div>
          <div
            className="rounded-2xl bg-slate-50/90 px-4 py-3 text-sm text-slate-600 md:col-span-2"
            data-testid="detail-original-url"
          >
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t.detail.originalUrl}
              </p>
              <div
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                data-testid="detail-original-url-row"
              >
                {originalUrl ? (
                  <>
                    <span className="min-w-0 truncate font-medium text-slate-700" title={originalUrl}>
                      {originalUrlDisplay}
                    </span>
                    <button
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                      onClick={() => void handleCopyOriginalUrl()}
                      type="button"
                    >
                      {appLanguage === "zh-CN" ? "复制" : "Copy"}
                    </button>
                  </>
                ) : (
                  <span className="min-w-0 text-slate-500">{t.common.emptyValue}</span>
                )}
              </div>
            </div>
          </div>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">{t.detail.watchedAt}</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              type="datetime-local"
              value={toDateTimeLocalValue(draft.watchedAt)}
              onChange={(event) => handleRecordPatch({ watchedAt: fromDateTimeLocalValue(event.target.value) })}
            />
          </label>
        </div>
      </section>

      <section
        className="rounded-3xl border border-slate-200/80 bg-slate-100/80 px-5 py-4 shadow-subtle"
        data-testid="detail-action-region"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.detail.actions}</p>
        <div
          className="mt-3 rounded-2xl bg-white/80 px-4 py-3"
          data-testid="detail-action-card"
        >
          <div
            className="flex flex-wrap items-start gap-3"
            data-testid="detail-action-card-layout"
          >
            <div
              className="min-w-0 flex-[1_1_16rem] break-words"
              data-testid="detail-action-card-content"
            >
              <p className="text-sm font-medium leading-5 text-slate-900 break-words">{t.detail.reviewLaterLabel}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500 break-words">{t.detail.reviewLaterHint}</p>
            </div>
            <button
              aria-pressed={draft.reviewLater}
              className={`max-w-full flex-none rounded-2xl px-3 py-2 text-xs font-medium transition ${
                draft.reviewLater
                  ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
              data-testid="detail-action-card-button"
              onClick={() => handleRecordPatch({ reviewLater: !draft.reviewLater })}
              type="button"
            >
              {draft.reviewLater ? t.detail.removeFromReviewLater : t.detail.addToReviewLater}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
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
      </section>
    </section>
  );
}
