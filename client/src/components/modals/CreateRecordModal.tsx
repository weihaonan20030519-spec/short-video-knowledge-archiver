import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useAppI18n } from "../../hooks/useAppI18n";
import {
  getSourceTypeLabel,
  getFolderDisplayName,
  getImportUiMessages,
  getTranscriptionErrorMessage
} from "../../lib/i18n";
import {
  createBrowserImportSession,
  createImportSession,
  resolveBrowserImportSession,
  resolveImport,
  selectImportTrack
} from "../../services/import/importCoordinator";
import type { ImportResult, ImportSession } from "../../services/import/importTypes";
import { transcribeFile } from "../../services/transcription/transcriptionClient";
import {
  inferSourceTypeFromFileName,
  isSupportedTranscriptionFile,
  SUPPORTED_TRANSCRIPTION_ACCEPT,
  LARGE_FILE_HINT_THRESHOLD_BYTES,
  TRANSCRIPTION_MAX_FILE_SIZE_BYTES,
  TRANSCRIPTION_RECOMMENDED_MAX_MINUTES,
  type ClientTranscriptionError,
  type ClientTranscriptionResult,
  type UploadUiStatus
} from "../../services/transcription/transcriptionTypes";
import { createRecordSchema, type CreateRecordValues } from "../../types/forms";
import type { Folder, Tag, TranscriptionStatus } from "../../types/domain";

interface CreateRecordModalProps {
  open: boolean;
  folders: Folder[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (
    values: CreateRecordValues,
    importResult: ImportResult | null,
    transcriptionResult: ClientTranscriptionResult | null
  ) => Promise<void>;
}

type BrowserImportState =
  | {
      status: "idle";
      sessionToken: null;
      expiresAt: null;
      startedAt: null;
    }
  | {
      status: "waiting" | "ready" | "incomplete" | "failed";
      sessionToken: string | null;
      expiresAt: string | null;
      startedAt: number | null;
    };

const BROWSER_IMPORT_FINALIZE_TIMEOUT_MS = 12_000;

function hasDetectedContent(result: ImportResult | null) {
  return Boolean(result?.detectedContent?.trim()) && result?.contentCompleteness !== "empty";
}

function getStatusTone(flowState: ImportSession["flowState"], result: ImportResult | null) {
  if (flowState === "ready_complete") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (flowState === "ready_partial" || (flowState === "awaiting_track_selection" && hasDetectedContent(result))) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (flowState === "ready_manual_completion") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (flowState === "error_but_can_continue") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPrimaryImportMessage(session: ImportSession, importText: ReturnType<typeof getImportUiMessages>) {
  if (session.flowState === "detecting_platform") {
    return importText.detectingPlatform;
  }

  if (session.flowState === "fetching_remote_content") {
    return importText.fetchingRemoteContent;
  }

  if (session.flowState === "awaiting_track_selection") {
    return hasDetectedContent(session.result) ? importText.multipleTracksAvailable : importText.selectTrackRecommended;
  }

  if (session.flowState === "ready_complete") {
    return importText.complete;
  }

  if (session.flowState === "ready_partial") {
    return importText.partial;
  }

  if (session.flowState === "ready_manual_completion") {
    return importText.needsUserInput;
  }

  if (session.flowState === "error_but_can_continue") {
    return importText.failedButCreatable;
  }

  return null;
}

function isResultEmpty(result: ImportResult | null) {
  return !result || (!result.detectedTitle && !result.detectedContent && result.warnings.length === 0);
}

function hasMeaningfulImportResult(result: ImportResult | null) {
  return Boolean(
    result &&
      (result.detectedTitle ||
        result.detectedContent ||
        result.originalUrl ||
        result.availableTracks.length > 0 ||
        result.warnings.length > 0)
  );
}

function deriveBrowserImportTerminalStatus(result: ImportResult | null): Exclude<BrowserImportState["status"], "idle" | "waiting"> {
  if (!result || result.outcome === "failed_but_creatable") {
    return "failed";
  }

  if (result.outcome === "complete") {
    return "ready";
  }

  return "incomplete";
}

function uploadStatusTone(status: UploadUiStatus) {
  switch (status) {
    case "uploading":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "timeout":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "too_large":
    case "failed":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadWorkflowStep {
  key: string;
  label: string;
}

function buildUploadWorkflowSteps(
  sourceType: "audio" | "video" | null,
  stepLabels: {
    uploading: string;
    extracting: string;
    transcribing: string;
  }
): UploadWorkflowStep[] {
  const baseSteps: UploadWorkflowStep[] = [
    { key: "uploading", label: stepLabels.uploading }
  ];

  if (sourceType === "video") {
    baseSteps.push({ key: "extracting_audio", label: stepLabels.extracting });
  }

  baseSteps.push({ key: "transcribing", label: stepLabels.transcribing });

  return baseSteps;
}

export function CreateRecordModal({ open, folders, tags, onClose, onSubmit }: CreateRecordModalProps) {
  const { appLanguage, t } = useAppI18n();
  const importText = getImportUiMessages(appLanguage);
  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    getValues
  } = useForm<CreateRecordValues>({
    resolver: zodResolver(createRecordSchema),
    defaultValues: {
      inputMethod: "upload",
      title: "",
      originalUrl: "",
      content: "",
      folderId: null,
      tagsText: ""
    }
  });

  const inputMethod = watch("inputMethod");
  const originalUrl = watch("originalUrl");
  const content = watch("content");

  const [importSession, setImportSession] = useState<ImportSession>(() => createImportSession(null));
  const [preferredTrackId, setPreferredTrackId] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<"link" | "browser_context" | null>(null);
  const [browserImportState, setBrowserImportState] = useState<BrowserImportState>({
    status: "idle",
    sessionToken: null,
    expiresAt: null,
    startedAt: null
  });
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>("idle");
  const [uploadUiStatus, setUploadUiStatus] = useState<UploadUiStatus>("idle");
  const [transcriptionResult, setTranscriptionResult] = useState<ClientTranscriptionResult | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<ClientTranscriptionError | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const [selectedFileSourceType, setSelectedFileSourceType] = useState<"audio" | "video" | null>(null);
  const activeTranscriptionRequestRef = useRef(0);
  const lastSeenUrlRef = useRef<string | null>(null);
  const lastImportedValueRef = useRef<{ title: string; content: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const invalidateTranscriptionRequest = () => {
    activeTranscriptionRequestRef.current += 1;
  };

  const resetModalState = () => {
    invalidateTranscriptionRequest();
    reset({
      inputMethod: "upload",
      title: "",
      originalUrl: "",
      content: "",
      folderId: null,
      tagsText: ""
    });
    setImportSession(createImportSession(null));
    setPreferredTrackId(null);
    setActiveProvider(null);
    setBrowserImportState({
      status: "idle",
      sessionToken: null,
      expiresAt: null,
      startedAt: null
    });
    setTranscriptionStatus("idle");
    setUploadUiStatus("idle");
    setTranscriptionResult(null);
    setTranscriptionError(null);
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setSelectedFileSourceType(null);
    lastSeenUrlRef.current = null;
    lastImportedValueRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    invalidateTranscriptionRequest();
    onClose();
  };

  const applyAutofill = (nextValues: { title?: string; content?: string; url?: string }) => {
    const importedTitle = nextValues.title?.trim() || "";
    const importedContent = nextValues.content?.trim() || "";
    const importedUrl = nextValues.url?.trim() || "";
    const currentTitle = getValues("title")?.trim() || "";
    const currentContent = getValues("content")?.trim() || "";
    const currentUrl = getValues("originalUrl")?.trim() || "";
    const previousImported = lastImportedValueRef.current;

    if (importedUrl && (!currentUrl || currentUrl === previousImported?.url)) {
      setValue("originalUrl", importedUrl, { shouldDirty: true });
    }

    if (importedTitle && (!currentTitle || currentTitle === previousImported?.title)) {
      setValue("title", importedTitle, { shouldDirty: true });
    }

    if (importedContent && (!currentContent || currentContent === previousImported?.content)) {
      setValue("content", importedContent, { shouldDirty: true });
    } else if (!importedContent && currentContent && currentContent === previousImported?.content) {
      setValue("content", "", { shouldDirty: true });
    }

    lastImportedValueRef.current = {
      title: importedTitle || currentTitle,
      content: importedContent,
      url: importedUrl || currentUrl
    };
  };

  useEffect(() => {
    if (!open) {
      resetModalState();
      return;
    }

    const trimmedUrl = originalUrl?.trim() || "";
    if (trimmedUrl !== lastSeenUrlRef.current) {
      const previousImportedUrl = lastImportedValueRef.current?.url || "";
      lastSeenUrlRef.current = trimmedUrl;

      if (trimmedUrl && trimmedUrl === previousImportedUrl) {
        return;
      }

      setPreferredTrackId(null);
      setImportSession(createImportSession(null));
      setActiveProvider(trimmedUrl ? "link" : null);
      setBrowserImportState({
        status: "idle",
        sessionToken: null,
        expiresAt: null,
        startedAt: null
      });
      lastImportedValueRef.current = null;
    }
  }, [open, originalUrl, reset]);

  useEffect(() => {
    if (inputMethod !== "upload") {
      invalidateTranscriptionRequest();
      setUploadUiStatus("idle");
    }
  }, [inputMethod]);

  useEffect(() => {
    if (!open || (inputMethod !== "text" && inputMethod !== "manual")) {
      return;
    }

    let cancelled = false;

    void resolveImport({
      inputMethod,
      content,
      appLanguage
    }).then((session) => {
      if (!cancelled) {
        setImportSession(session);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appLanguage, content, inputMethod, open]);

  useEffect(() => {
    if (!open || inputMethod !== "link" || activeProvider === "browser_context") {
      return;
    }

    const trimmedUrl = originalUrl?.trim() || "";
    if (!trimmedUrl) {
      setImportSession(createImportSession(null));
      return;
    }

    let cancelled = false;
    setImportSession((current) => ({
      result: current.result,
      flowState: "detecting_platform"
    }));

    const timer = window.setTimeout(async () => {
      if (cancelled) {
        return;
      }

      setImportSession((current) => ({
        result: current.result,
        flowState: "fetching_remote_content"
      }));

      const session = await resolveImport({
        inputMethod,
        originalUrl: trimmedUrl,
        preferredTrackId,
        appLanguage
      });

      if (!cancelled) {
        setImportSession(session);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeProvider, appLanguage, inputMethod, open, originalUrl, preferredTrackId]);

  useEffect(() => {
    if (
      !open ||
      browserImportState.status !== "waiting" ||
      !browserImportState.sessionToken ||
      activeProvider !== "browser_context"
    ) {
      return;
    }

    let cancelled = false;
    const sessionToken = browserImportState.sessionToken;

    const poll = async () => {
      const session = await resolveBrowserImportSession(sessionToken, appLanguage);

      if (cancelled) {
        return;
      }

      if (!session.result) {
        const currentElapsed =
          browserImportState.startedAt ? Date.now() - browserImportState.startedAt : 0;

        if (currentElapsed >= BROWSER_IMPORT_FINALIZE_TIMEOUT_MS && hasMeaningfulImportResult(importSession.result)) {
          setBrowserImportState((current) => ({
            ...current,
            status: deriveBrowserImportTerminalStatus(importSession.result)
          }));
          return;
        }

        setImportSession({
          result: null,
          flowState: "fetching_remote_content"
        });
        return;
      }

      setImportSession(session);
      const resolvedResult = session.result;
      setBrowserImportState((current) => ({
        ...current,
        status: deriveBrowserImportTerminalStatus(resolvedResult)
      }));
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeProvider, appLanguage, browserImportState, importSession.result, open]);

  useEffect(() => {
    if (!open || !importSession.result) {
      return;
    }

    applyAutofill({
      title: importSession.result.detectedTitle || "",
      content: importSession.result.detectedContent || "",
      url: importSession.result.originalUrl || ""
    });
  }, [getValues, importSession.result, open, setValue]);

  if (!open) {
    return null;
  }

  const importResult = importSession.result;
  const trackOptions = importResult?.availableTracks || [];
  const selectedTrackId = preferredTrackId || importResult?.selectedTrackId || "";
  const primaryImportMessage = getPrimaryImportMessage(importSession, importText);
  const shouldShowImportPanel =
    inputMethod === "link" &&
    (Boolean(originalUrl?.trim()) ||
      browserImportState.status !== "idle" ||
      !isResultEmpty(importResult));
  const shouldRecommendTrackSelection =
    importSession.flowState === "awaiting_track_selection" && !hasDetectedContent(importResult);
  const browserImportMessage =
    browserImportState.status === "waiting"
      ? t.modals.browserImport.waitingDescription
      : browserImportState.status === "ready"
        ? t.modals.browserImport.ready
        : browserImportState.status === "incomplete"
          ? t.modals.browserImport.incomplete
          : browserImportState.status === "failed"
            ? t.modals.browserImport.failed
            : null;
  const transcriptionErrorMessage = transcriptionError
    ? getTranscriptionErrorMessage(
        transcriptionError.code,
        appLanguage,
        TRANSCRIPTION_MAX_FILE_SIZE_BYTES / (1024 * 1024)
      )
    : null;
  const selectedSourceTypeLabel = selectedFileSourceType
    ? getSourceTypeLabel(selectedFileSourceType, appLanguage)
    : t.common.emptyValue;
  const uploadWorkflowSteps = buildUploadWorkflowSteps(selectedFileSourceType, {
    uploading: t.modals.uploadStateLabel.uploading,
    extracting: t.modals.transcriptionStatus.extracting_audio,
    transcribing: t.modals.transcriptionStatus.transcribing
  });
  const isUploadProcessing = uploadUiStatus === "uploading" || uploadUiStatus === "processing";
  const uploadStatusDescription =
    uploadUiStatus === "timeout"
      ? t.modals.uploadTimeoutDescription
      : uploadUiStatus === "too_large" || uploadUiStatus === "failed"
      ? t.modals.uploadFailureDescription
      : uploadUiStatus === "success"
        ? t.modals.uploadSuccessDescription
        : t.modals.uploadProcessingDescription;
  const currentUploadStatusLabel =
    uploadUiStatus === "idle" ? null : t.modals.uploadStateLabel[uploadUiStatus];
  const shouldShowLargeFileHint =
    selectedFileSize != null &&
    selectedFileSize >= LARGE_FILE_HINT_THRESHOLD_BYTES &&
    (uploadUiStatus === "uploading" || uploadUiStatus === "processing");

  const triggerBrowserImport = async () => {
    setValue("inputMethod", "link", { shouldDirty: true });
    setActiveProvider("browser_context");
    setImportSession({
      result: null,
      flowState: "fetching_remote_content"
    });

    try {
      const session = await createBrowserImportSession();
      setBrowserImportState({
        status: "waiting",
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
        startedAt: Date.now()
      });
    } catch {
      setBrowserImportState({
        status: "failed",
        sessionToken: null,
        expiresAt: null,
        startedAt: Date.now()
      });
      setImportSession(
        createImportSession({
          source: "browser_context",
          platform: "bilibili",
          outcome: "failed_but_creatable",
          originalUrl: null,
          detectedTitle: null,
          detectedContent: null,
          contentCompleteness: "empty",
          availableTracks: [],
          selectedTrackId: null,
          warnings: [],
          canCreateRecord: true,
          shouldPromptManualInput: true
        })
      );
    }
  };

  const handleFileSelection = async (file: File | null) => {
    invalidateTranscriptionRequest();
    setTranscriptionResult(null);
    setTranscriptionError(null);

    if (!file) {
      setSelectedFileName(null);
      setSelectedFileSize(null);
      setSelectedFileSourceType(null);
      setTranscriptionStatus("idle");
      setUploadUiStatus("idle");
      return;
    }

    const requestId = activeTranscriptionRequestRef.current;
    const isCurrentRequest = () => activeTranscriptionRequestRef.current === requestId;
    const inferredSourceType = inferSourceTypeFromFileName(file.name);

    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    setSelectedFileSourceType(inferredSourceType);
    setTranscriptionStatus("idle");
    setUploadUiStatus("uploading");

    if (!isSupportedTranscriptionFile(file)) {
      setTranscriptionStatus("transcript_failed");
      setUploadUiStatus("failed");
      setTranscriptionError({
        code: "UNSUPPORTED_FILE_FORMAT",
        message: "unsupported"
      });
      return;
    }

    if (file.size > TRANSCRIPTION_MAX_FILE_SIZE_BYTES) {
      setTranscriptionStatus("transcript_failed");
      setUploadUiStatus("too_large");
      setTranscriptionError({
        code: "FILE_TOO_LARGE",
        message: "too large"
      });
      return;
    }

    const response = await transcribeFile(file, appLanguage, {
      onUploadStarted: () => {
        if (!isCurrentRequest()) {
          return;
        }

        setUploadUiStatus("uploading");
      },
      onUploadComplete: () => {
        if (!isCurrentRequest()) {
          return;
        }

        setUploadUiStatus("processing");
      }
    });

    if (!isCurrentRequest()) {
      return;
    }

    if (!response.success) {
      setTranscriptionStatus("transcript_failed");
      setUploadUiStatus(
        response.error.code === "TRANSCRIPTION_TIMEOUT"
          ? "timeout"
          : response.error.code === "FILE_TOO_LARGE"
            ? "too_large"
            : "failed"
      );
      setTranscriptionError(response.error);
      return;
    }

    const nextResult: ClientTranscriptionResult = {
      sourceType: response.data.sourceType,
      suggestedTitle: response.data.suggestedTitle,
      transcriptText: response.data.transcriptText,
      transcriptionStatus: response.data.transcriptionStatus,
      transcriptMeta: {
        fileName: response.data.fileMeta.fileName,
        mimeType: response.data.fileMeta.mimeType,
        size: response.data.fileMeta.size,
        duration: response.data.fileMeta.duration,
        language: response.data.language ?? null,
        segments: response.data.segments,
        timestamps: response.data.timestamps,
        provider: "gemini",
        warnings: response.data.warnings
      },
      warnings: response.data.warnings
    };

    setTranscriptionResult(nextResult);
    setTranscriptionStatus("transcript_needs_review");
    setUploadUiStatus("success");
    applyAutofill({
      title: nextResult.suggestedTitle,
      content: nextResult.transcriptText,
      url: ""
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/55 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-sm md:items-center md:p-4">
      <div
        aria-labelledby="create-record-modal-title"
        aria-modal="true"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-panel max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] md:max-h-[calc(100dvh-2rem)]"
        data-testid="create-record-modal-shell"
        role="dialog"
      >
        <div
          className="sticky top-0 z-10 flex flex-none items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6"
          data-testid="create-record-modal-header"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{t.modals.createRecordEyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900" id="create-record-modal-title">
              {t.modals.createRecordTitle}
            </h2>
          </div>
          <button
            className="shrink-0 rounded-xl px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={handleClose}
            type="button"
          >
            {t.common.close}
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values, importSession.result, transcriptionResult);
            resetModalState();
          })}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            data-testid="create-record-modal-body"
          >
            <input type="hidden" {...register("inputMethod")} />

            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["upload", t.modals.inputMethods.upload],
                  ["text", t.modals.inputMethods.text],
                  ["manual", t.modals.inputMethods.manual]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      inputMethod === value ? "border-teal-400 bg-teal-50 text-teal-950" : "border-slate-200 bg-white"
                    }`}
                    onClick={() => setValue("inputMethod", value as CreateRecordValues["inputMethod"], { shouldDirty: true })}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.modals.otherImportMethods}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      inputMethod === "link" && activeProvider !== "browser_context"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    onClick={() => {
                      setValue("inputMethod", "link", { shouldDirty: true });
                      setActiveProvider("link");
                    }}
                    type="button"
                  >
                    {t.modals.inputMethods.link}
                  </button>
                  <button
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      activeProvider === "browser_context"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    onClick={() => {
                      void triggerBrowserImport();
                    }}
                    type="button"
                  >
                    {t.modals.browserImport.trigger}
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.optionalTitle}</span>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
                  placeholder={t.modals.optionalTitlePlaceholder}
                  {...register("title")}
                />
              </label>

              {inputMethod === "upload" ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.modals.uploadTitle}</p>
                    <p className="mt-1 text-sm text-slate-600">{t.modals.uploadDescription}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {t.modals.uploadHint(
                        TRANSCRIPTION_MAX_FILE_SIZE_BYTES / (1024 * 1024),
                        TRANSCRIPTION_RECOMMENDED_MAX_MINUTES
                      )}
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.uploadInputLabel}</span>
                    <input
                      accept={SUPPORTED_TRANSCRIPTION_ACCEPT}
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      onChange={(event) => {
                        void handleFileSelection(event.target.files?.[0] || null);
                      }}
                      ref={fileInputRef}
                      type="file"
                    />
                  </label>

                  {selectedFileName ? (
                    <div
                      aria-live="polite"
                      className={`rounded-3xl border px-4 py-4 shadow-subtle ${uploadStatusTone(uploadUiStatus)}`}
                      data-testid="upload-status-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.modals.uploadStatusCardTitle}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{uploadStatusDescription}</p>
                          {shouldShowLargeFileHint ? (
                            <p className="mt-2 text-xs leading-5 text-slate-500">{t.modals.uploadLargeFileHint}</p>
                          ) : null}
                        </div>
                        {isUploadProcessing ? (
                          <span
                            aria-hidden="true"
                            className="mt-1 inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                            data-testid="upload-status-spinner"
                          />
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/40 bg-white/70 px-3 py-3 text-xs text-slate-700">
                          <p className="font-medium text-slate-900">{t.modals.fileName}</p>
                          <p className="mt-1 break-all">{selectedFileName}</p>
                        </div>
                        <div className="rounded-2xl border border-white/40 bg-white/70 px-3 py-3 text-xs text-slate-700">
                          <p className="font-medium text-slate-900">{t.modals.fileType}</p>
                          <p className="mt-1">{selectedSourceTypeLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/40 bg-white/70 px-3 py-3 text-xs text-slate-700">
                          <p className="font-medium text-slate-900">{t.modals.uploadFileSize}</p>
                          <p className="mt-1">{selectedFileSize != null ? formatFileSize(selectedFileSize) : t.common.emptyValue}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t.modals.uploadCurrentStatus}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {isUploadProcessing ? (
                            <span
                              aria-hidden="true"
                              className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-slate-700"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                uploadUiStatus === "timeout"
                                  ? "bg-orange-500"
                                  : uploadUiStatus === "too_large" || uploadUiStatus === "failed"
                                    ? "bg-rose-500"
                                    : "bg-emerald-500"
                              }`}
                            />
                          )}
                          <p className="text-sm font-medium text-slate-900">
                            {currentUploadStatusLabel}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {t.modals.uploadSteps}
                        </p>
                        <div className="mt-3 space-y-2">
                          {uploadWorkflowSteps.map((step) => (
                            <div key={step.key} className="flex items-center gap-3 text-sm text-slate-700">
                              <span aria-hidden="true" className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-300" />
                              <span>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {transcriptionErrorMessage ? (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                          <p>{transcriptionErrorMessage}</p>
                          <p className="mt-1">{t.errors.youCanContinueEditingManually}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {transcriptionResult?.transcriptMeta ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">{t.modals.transcriptMetadata}</p>
                      <p>
                        {t.modals.fileName}: {transcriptionResult.transcriptMeta.fileName}
                      </p>
                      <p>
                        {t.modals.fileType}: {transcriptionResult.transcriptMeta.mimeType}
                      </p>
                      <p>
                        {t.modals.language}: {transcriptionResult.transcriptMeta.language || t.common.emptyValue}
                      </p>
                      <p>
                        {t.modals.segments}: {transcriptionResult.transcriptMeta.segments?.length ?? 0}
                      </p>
                      <p>
                        {t.modals.timestamps}: {transcriptionResult.transcriptMeta.timestamps?.length ?? 0}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {inputMethod === "link" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.originalUrl}</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
                    placeholder="https://..."
                    {...register("originalUrl")}
                  />

                  <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs leading-5 text-slate-600">
                      <p className="font-medium text-slate-700">{t.modals.browserImport.waitingTitle}</p>
                      <p>{browserImportMessage || t.modals.browserImport.waitingDescription}</p>
                    </div>
                    <button
                      className="shrink-0 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      disabled={browserImportState.status === "waiting"}
                      onClick={() => {
                        void triggerBrowserImport();
                      }}
                    >
                      {t.modals.browserImport.trigger}
                    </button>
                  </div>

                  {shouldShowImportPanel ? (
                    <div className="mt-2 space-y-2">
                      {primaryImportMessage ? (
                        <p
                          aria-live="polite"
                          className={`rounded-2xl border px-3 py-2 text-xs leading-6 ${getStatusTone(importSession.flowState, importResult)}`}
                        >
                          {primaryImportMessage}
                        </p>
                      ) : null}

                      {importResult ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                          {trackOptions.length > 0 ? (
                            <p className="font-medium text-slate-700">{importText.trackCountLabel(trackOptions.length)}</p>
                          ) : null}

                          {trackOptions.length > 1 ? (
                            <label className="mt-3 block">
                              <span className="mb-2 block font-medium text-slate-700">
                                {t.modals.bilibiliImport.trackSelectLabel}
                              </span>
                              <select
                                aria-label={t.modals.bilibiliImport.trackSelectLabel}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                                value={selectedTrackId}
                                onChange={(event) => {
                                  const nextTrackId = event.target.value || null;
                                  if (!nextTrackId) {
                                    setPreferredTrackId(null);
                                    return;
                                  }

                                  if (importResult?.source === "browser_context") {
                                    setImportSession(selectImportTrack(importResult, nextTrackId, appLanguage));
                                    return;
                                  }

                                  setPreferredTrackId(nextTrackId);
                                }}
                              >
                                {!selectedTrackId ? <option value="">{importText.selectTrackPlaceholder}</option> : null}
                                {trackOptions.map((track) => (
                                  <option key={track.id} value={track.id}>
                                    {track.label}
                                  </option>
                                ))}
                              </select>
                              <span className="mt-2 block text-[11px] text-slate-500">
                                {shouldRecommendTrackSelection ? importText.selectTrackRecommended : importText.multipleTracksAvailable}
                              </span>
                            </label>
                          ) : null}

                          {importResult.warnings.length ? (
                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] leading-5 text-slate-600">
                              <p className="font-medium text-slate-700">{importText.warningsTitle}</p>
                              {importResult.warnings.map((warning) => (
                                <p key={warning.code}>{warning.message}</p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  {inputMethod === "upload"
                    ? t.modals.originalTranscript
                    : inputMethod === "manual"
                      ? t.modals.manualContent
                      : t.modals.content}
                </span>
                <textarea
                  className="min-h-40 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none"
                  placeholder={t.modals.contentPlaceholder}
                  {...register("content")}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.folder}</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
                    {...register("folderId")}
                  >
                    <option value="">{t.common.systemFolder}</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {getFolderDisplayName(folder, appLanguage)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">{t.modals.tags}</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
                    placeholder={t.modals.tagsPlaceholder(tags[0]?.name || null)}
                    {...register("tagsText")}
                  />
                </label>
              </div>
            </div>
          </div>

          <div
            className="flex flex-none items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6"
            data-testid="create-record-modal-footer"
          >
            <button
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700"
              onClick={handleClose}
              type="button"
            >
              {t.common.cancel}
            </button>
            <button
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={
                (importSession.flowState === "fetching_remote_content" && activeProvider !== "browser_context") ||
                uploadUiStatus === "uploading" ||
                uploadUiStatus === "processing"
              }
              type="submit"
            >
              {t.modals.createRecord}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
