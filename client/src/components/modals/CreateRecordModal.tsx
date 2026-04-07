import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { useAppI18n } from "../../hooks/useAppI18n";
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
  getTerminalUploadUiStatus
} from "../../services/transcription/transcriptionPhases";
import {
  buildClientTranscriptionError,
  buildClientTranscriptionResult
} from "../../services/transcription/transcriptionResponseMapper";
import {
  inferSourceTypeFromFileName,
  isSupportedTranscriptionFile,
  TRANSCRIPTION_MAX_FILE_SIZE_BYTES,
  type ClientTranscriptionError,
  type ClientTranscriptionResult,
  type UploadUiStatus
} from "../../services/transcription/transcriptionTypes";
import { createRecordSchema, type CreateRecordValues } from "../../types/forms";
import type { Folder, Tag } from "../../types/domain";
import { buildCreateRecordDraft, type CreateRecordDraft } from "../../features/create-record/buildCreateRecordDraft";
import {
  derivePasteLinkImportUiState,
  getPasteLinkHelperMessage,
  getPasteLinkAwaitingTrackMessage,
  getPasteLinkResultPrimaryMessage,
  getPasteLinkPrimaryMessage,
  getPasteLinkStatusTone,
  deriveBrowserImportTerminalStatus,
  hasMeaningfulImportResult,
  type BrowserImportUiState
} from "../../features/create-record/createRecordImportUi";
import {
  getCreateRecordModeConfig,
  getCreateRecordSubmitLabel
} from "../../features/create-record/createRecordModeConfig";
import { getCreateRecordModeTransitionPlan } from "../../features/create-record/createRecordModeState";
import {
  isTextEntryMode,
  mapUiModeToInputMethod,
  type CreateRecordUiMode
} from "../../features/create-record/createRecordUiMode";
import { CreateRecordBrowserImportSection } from "./create-record/CreateRecordBrowserImportSection";
import { CreateRecordFormContent } from "./create-record/CreateRecordFormContent";
import { CreateRecordLinkSection } from "./create-record/CreateRecordLinkSection";
import { CreateRecordModeHint } from "./create-record/CreateRecordModeHint";
import { CreateRecordModeSwitcher } from "./create-record/CreateRecordModeSwitcher";
import { CreateRecordPrimaryFields } from "./create-record/CreateRecordPrimaryFields";
import { CreateRecordSecondaryFields } from "./create-record/CreateRecordSecondaryFields";
import { CreateRecordUploadSection } from "./create-record/CreateRecordUploadSection";

interface CreateRecordModalProps {
  open: boolean;
  folders: Folder[];
  tags: Tag[];
  onClose: () => void;
  onSubmit: (draft: CreateRecordDraft) => Promise<void>;
}

interface BrowserImportRuntimeState extends BrowserImportUiState {
  sessionToken: string | null;
  expiresAt: string | null;
  startedAt: number | null;
}

interface AutofillFieldSnapshot {
  lastValue: string;
}

interface AutofillSnapshotState {
  title: AutofillFieldSnapshot;
  content: AutofillFieldSnapshot;
  originalUrl: AutofillFieldSnapshot;
}

const BROWSER_IMPORT_FINALIZE_TIMEOUT_MS = 12_000;

function buildIdleBrowserImportState(): BrowserImportRuntimeState {
  return {
    status: "idle",
    sessionToken: null,
    expiresAt: null,
    startedAt: null
  };
}

export function CreateRecordModal({ open, folders, tags, onClose, onSubmit }: CreateRecordModalProps) {
  const { appLanguage, t } = useAppI18n();
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

  const [uiMode, setUiMode] = useState<CreateRecordUiMode>("upload");
  const originalUrl = watch("originalUrl");
  const content = watch("content");

  const [importSession, setImportSession] = useState<ImportSession>(() => createImportSession(null));
  const [preferredTrackId, setPreferredTrackId] = useState<string | null>(null);
  const [browserImportState, setBrowserImportState] = useState<BrowserImportRuntimeState>(buildIdleBrowserImportState);
  const [hasAttemptedLinkImport, setHasAttemptedLinkImport] = useState(false);
  const [uploadUiStatus, setUploadUiStatus] = useState<UploadUiStatus>("idle");
  const [transcriptionResult, setTranscriptionResult] = useState<ClientTranscriptionResult | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<ClientTranscriptionError | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const [selectedFileSourceType, setSelectedFileSourceType] = useState<"audio" | "video" | null>(null);
  const [hasUploadCompleted, setHasUploadCompleted] = useState(false);
  const activeTranscriptionRequestRef = useRef(0);
  const activeLinkImportRequestRef = useRef(0);
  const lastSeenUrlRef = useRef<string | null>(null);
  const lastAutofillSnapshotRef = useRef<AutofillSnapshotState>({
    title: { lastValue: "" },
    content: { lastValue: "" },
    originalUrl: { lastValue: "" }
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetAutofillSnapshot = () => {
    lastAutofillSnapshotRef.current = {
      title: { lastValue: "" },
      content: { lastValue: "" },
      originalUrl: { lastValue: "" }
    };
  };

  const canOverwriteAutofillField = (currentValue: string, nextValue: string, previousValue: string) => {
    if (!nextValue) {
      return false;
    }

    return !currentValue || currentValue === previousValue;
  };

  const updateAutofillSnapshot = (nextValues: { title: string; content: string; originalUrl: string }) => {
    lastAutofillSnapshotRef.current = {
      title: { lastValue: nextValues.title },
      content: { lastValue: nextValues.content },
      originalUrl: { lastValue: nextValues.originalUrl }
    };
  };

  const invalidateTranscriptionRequest = () => {
    activeTranscriptionRequestRef.current += 1;
  };

  const invalidateLinkImportRequest = () => {
    activeLinkImportRequestRef.current += 1;
  };

  const resetUploadRuntimeState = () => {
    invalidateTranscriptionRequest();
    setUploadUiStatus("idle");
    setHasUploadCompleted(false);
    setTranscriptionResult(null);
    setTranscriptionError(null);
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setSelectedFileSourceType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetImportRuntimeState = () => {
    invalidateLinkImportRequest();
    setImportSession(createImportSession(null));
    setPreferredTrackId(null);
    setBrowserImportState(buildIdleBrowserImportState());
    setHasAttemptedLinkImport(false);
    lastSeenUrlRef.current = null;
    resetAutofillSnapshot();
  };

  const resetModalState = () => {
    reset({
      inputMethod: "upload",
      title: "",
      originalUrl: "",
      content: "",
      folderId: null,
      tagsText: ""
    });
    setUiMode("upload");
    resetUploadRuntimeState();
    resetImportRuntimeState();
  };

  const handleClose = () => {
    resetUploadRuntimeState();
    onClose();
  };

  const applyAutofill = (nextValues: { title?: string; content?: string; url?: string }) => {
    const importedTitle = nextValues.title?.trim() || "";
    const importedContent = nextValues.content?.trim() || "";
    const importedUrl = nextValues.url?.trim() || "";
    const currentTitle = getValues("title")?.trim() || "";
    const currentContent = getValues("content")?.trim() || "";
    const currentUrl = getValues("originalUrl")?.trim() || "";
    const previousAutofill = lastAutofillSnapshotRef.current;

    if (canOverwriteAutofillField(currentUrl, importedUrl, previousAutofill.originalUrl.lastValue)) {
      setValue("originalUrl", importedUrl, { shouldDirty: true });
    }

    if (canOverwriteAutofillField(currentTitle, importedTitle, previousAutofill.title.lastValue)) {
      setValue("title", importedTitle, { shouldDirty: true });
    }

    if (canOverwriteAutofillField(currentContent, importedContent, previousAutofill.content.lastValue)) {
      setValue("content", importedContent, { shouldDirty: true });
    } else if (!importedContent && currentContent && currentContent === previousAutofill.content.lastValue) {
      setValue("content", "", { shouldDirty: true });
    }

    updateAutofillSnapshot({
      title: importedTitle,
      content: importedContent,
      originalUrl: importedUrl
    });
  };

  const resetPasteLinkRuntimeState = () => {
    setImportSession(createImportSession(null));
    setPreferredTrackId(null);
    setHasAttemptedLinkImport(false);
    lastSeenUrlRef.current = null;
  };

  const handleModeChange = (nextMode: CreateRecordUiMode) => {
    if (nextMode === uiMode) {
      return;
    }

    const transitionPlan = getCreateRecordModeTransitionPlan(uiMode, nextMode);

    if (transitionPlan.resetUploadRuntime) {
      resetUploadRuntimeState();
    }

    if (transitionPlan.resetImportRuntime) {
      resetImportRuntimeState();
    }

    setUiMode(nextMode);
    setValue("inputMethod", mapUiModeToInputMethod(nextMode), { shouldDirty: true });
  };

  const triggerBrowserImport = async () => {
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
    resetUploadRuntimeState();

    if (!file) {
      return;
    }

    const requestId = activeTranscriptionRequestRef.current;
    const isCurrentRequest = () => activeTranscriptionRequestRef.current === requestId;
    const inferredSourceType = inferSourceTypeFromFileName(file.name);

    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    setSelectedFileSourceType(inferredSourceType);
    setUploadUiStatus("uploading");

    if (!isSupportedTranscriptionFile(file)) {
      setUploadUiStatus("failed");
      setTranscriptionError({
        code: "UNSUPPORTED_FILE_FORMAT",
        message: "unsupported",
        phase: "failed",
        failureStage: "upload"
      });
      return;
    }

    if (file.size > TRANSCRIPTION_MAX_FILE_SIZE_BYTES) {
      setUploadUiStatus("too_large");
      setTranscriptionError({
        code: "FILE_TOO_LARGE",
        message: "too large",
        phase: "failed",
        failureStage: "upload"
      });
      return;
    }

    const response = await transcribeFile(file, appLanguage, {
      onUploadStarted: () => {
        if (isCurrentRequest()) {
          setUploadUiStatus("uploading");
        }
      },
      onUploadComplete: () => {
        if (isCurrentRequest()) {
          setHasUploadCompleted(true);
          setUploadUiStatus("processing");
        }
      }
    });

    if (!isCurrentRequest()) {
      return;
    }

    if (!response.success) {
      setUploadUiStatus(getTerminalUploadUiStatus(response));
      setTranscriptionError(buildClientTranscriptionError(response));
      return;
    }

    const nextResult = buildClientTranscriptionResult(response);
    setTranscriptionResult(nextResult);
    setUploadUiStatus("success");
    applyAutofill({
      title: nextResult.suggestedTitle,
      content: nextResult.transcriptText,
      url: ""
    });
  };

  useEffect(() => {
    if (!open) {
      resetModalState();
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isTextEntryMode(uiMode)) {
      return;
    }

    let cancelled = false;

    void resolveImport({
      inputMethod: mapUiModeToInputMethod(uiMode),
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
  }, [appLanguage, content, open, uiMode]);

  useEffect(() => {
    if (!open || uiMode !== "paste_link") {
      return;
    }

    const trimmedUrl = originalUrl?.trim() || "";
    if (trimmedUrl !== lastSeenUrlRef.current) {
      const previousImportedUrl = lastAutofillSnapshotRef.current.originalUrl.lastValue || "";
      lastSeenUrlRef.current = trimmedUrl;

      if (trimmedUrl && trimmedUrl === previousImportedUrl) {
        return;
      }

      resetPasteLinkRuntimeState();
      lastSeenUrlRef.current = trimmedUrl;
    }
  }, [open, originalUrl, uiMode]);

  useEffect(() => {
    if (
      !open ||
      uiMode !== "browser_import" ||
      browserImportState.status !== "waiting" ||
      !browserImportState.sessionToken
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
      setBrowserImportState((current) => ({
        ...current,
        status: deriveBrowserImportTerminalStatus(session.result)
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
  }, [appLanguage, browserImportState, importSession.result, open, uiMode]);

  useEffect(() => {
    if (!open || uiMode !== "browser_import" || browserImportState.status !== "idle") {
      return;
    }

    void triggerBrowserImport();
  }, [browserImportState.status, open, uiMode]);

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

  const triggerPasteLinkImport = async () => {
    const trimmedUrl = getValues("originalUrl")?.trim() || "";
    if (!trimmedUrl) {
      return;
    }
    const requestId = activeLinkImportRequestRef.current + 1;
    activeLinkImportRequestRef.current = requestId;
    const isCurrentRequest = () => activeLinkImportRequestRef.current === requestId;

    setHasAttemptedLinkImport(true);
    setImportSession((current) => ({
      result: current.result,
      flowState: "detecting_platform"
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    setImportSession((current) => ({
      result: current.result,
      flowState: "fetching_remote_content"
    }));

    const session = await resolveImport({
      inputMethod: "link",
      originalUrl: trimmedUrl,
      preferredTrackId,
      appLanguage
    });

    if (isCurrentRequest()) {
      setImportSession(session);
    }
  };

  const handlePasteLinkTrackChange = (trackId: string | null) => {
    setPreferredTrackId(trackId);

    if (!trackId) {
      return;
    }

    const nextImportResult = importResult;
    if (nextImportResult?.source !== "link_bilibili_server") {
      return;
    }

    void (async () => {
      const requestId = activeLinkImportRequestRef.current + 1;
      activeLinkImportRequestRef.current = requestId;
      const isCurrentRequest = () => activeLinkImportRequestRef.current === requestId;
      setHasAttemptedLinkImport(true);
      setImportSession((current) => ({
        result: current.result,
        flowState: "fetching_remote_content"
      }));

      const session = await resolveImport({
        inputMethod: "link",
        originalUrl: getValues("originalUrl")?.trim() || "",
        preferredTrackId: trackId,
        appLanguage
      });

      if (isCurrentRequest()) {
        setImportSession(session);
      }
    })();
  };

  if (!open) {
    return null;
  }

  const modeConfig = getCreateRecordModeConfig(uiMode);
  const importResult = importSession.result;
  const trackOptions = importResult?.availableTracks || [];
  const selectedTrackId = preferredTrackId || importResult?.selectedTrackId || "";
  const linkImportUiState = derivePasteLinkImportUiState(importSession, hasAttemptedLinkImport);
  const linkPrimaryMessage =
    getPasteLinkAwaitingTrackMessage(importSession, appLanguage) ||
    getPasteLinkPrimaryMessage(linkImportUiState, appLanguage) ||
    getPasteLinkResultPrimaryMessage(importResult, appLanguage);
  const linkStatusTone = getPasteLinkStatusTone(linkImportUiState);
  const linkHelperMessage =
    getPasteLinkHelperMessage(importResult, appLanguage) ||
    (importSession.flowState === "awaiting_track_selection"
      ? importResult?.detectedContent?.trim()
        ? t.modals.linkImport.partialHelper
        : t.modals.linkImport.failedHelper
      : linkImportUiState === "failed_but_editable"
        ? t.modals.linkImport.failedHelper
        : null);
  const modeSection =
    uiMode === "upload" ? (
      <CreateRecordUploadSection
        appLanguage={appLanguage}
        fileInputRef={fileInputRef}
        hasUploadCompleted={hasUploadCompleted}
        onFileChange={(event) => {
          void handleFileSelection(event.target.files?.[0] || null);
        }}
        selectedFileName={selectedFileName}
        selectedFileSize={selectedFileSize}
        selectedFileSourceType={selectedFileSourceType}
        t={t}
        transcriptionError={transcriptionError}
        transcriptionResult={transcriptionResult}
        uploadUiStatus={uploadUiStatus}
      />
    ) : uiMode === "paste_link" ? (
      <CreateRecordLinkSection
        appLanguage={appLanguage}
        canTriggerImport={Boolean((originalUrl || "").trim())}
        hasAttemptedImport={hasAttemptedLinkImport}
        helperMessage={linkHelperMessage}
        importResult={importResult}
        isTriggerDisabled={linkImportUiState === "detecting" || linkImportUiState === "extracting"}
        linkImportUiState={linkImportUiState}
        onTrackChange={handlePasteLinkTrackChange}
        onTriggerImport={() => {
          void triggerPasteLinkImport();
        }}
        primaryMessage={linkPrimaryMessage}
        selectedTrackId={selectedTrackId}
        statusTone={linkStatusTone}
        t={t}
        trackOptions={trackOptions}
      />
    ) : uiMode === "browser_import" ? (
      <CreateRecordBrowserImportSection
        appLanguage={appLanguage}
        browserImportState={browserImportState}
        importResult={importResult}
        importSession={importSession}
        onTrackChange={(trackId) => {
          if (!trackId || !importResult) {
            return;
          }

          setImportSession(selectImportTrack(importResult, trackId, appLanguage));
        }}
        onTrigger={() => {
          void triggerBrowserImport();
        }}
        selectedTrackId={selectedTrackId}
        t={t}
        trackOptions={trackOptions}
      />
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/55 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-sm md:items-center md:p-4">
      <div
        aria-labelledby="create-record-modal-title"
        aria-modal="true"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.09)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] md:max-h-[calc(100dvh-2rem)]"
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
            const draft = buildCreateRecordDraft({
              uiMode,
              values,
              importResult: importSession.result,
              transcriptionResult
            });

            await onSubmit(draft);
            resetModalState();
          })}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            data-testid="create-record-modal-body"
          >
            <input type="hidden" {...register("inputMethod")} />

            <CreateRecordFormContent
              modeHint={<CreateRecordModeHint mode={uiMode} t={t} />}
              modeSection={modeSection}
              modeSwitcher={
                <CreateRecordModeSwitcher
                  mode={uiMode}
                  onModeChange={handleModeChange}
                  t={t}
                />
              }
              primaryFields={<CreateRecordPrimaryFields mode={uiMode} register={register} t={t} />}
              secondaryFields={
                modeConfig.showSecondaryMeta ? (
                  <CreateRecordSecondaryFields
                    appLanguage={appLanguage}
                    folders={folders}
                    register={register}
                    t={t}
                    tags={tags}
                  />
                ) : null
              }
            />
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
                (uiMode === "paste_link" &&
                  (linkImportUiState === "detecting" || linkImportUiState === "extracting")) ||
                uploadUiStatus === "uploading" ||
                uploadUiStatus === "processing"
              }
              type="submit"
            >
              {getCreateRecordSubmitLabel(t, uiMode)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
