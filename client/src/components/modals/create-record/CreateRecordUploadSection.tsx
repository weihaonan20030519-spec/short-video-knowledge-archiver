import type { ChangeEventHandler, MutableRefObject } from "react";

import { getFailureStageLabel } from "../../../services/transcription/transcriptionPhases";
import {
  LARGE_FILE_HINT_THRESHOLD_BYTES,
  SUPPORTED_TRANSCRIPTION_ACCEPT,
  TRANSCRIPTION_MAX_FILE_SIZE_BYTES,
  TRANSCRIPTION_RECOMMENDED_MAX_MINUTES,
  formatTranscriptionModelName,
  type ClientTranscriptionError,
  type ClientTranscriptionResult,
  type UploadUiStatus
} from "../../../services/transcription/transcriptionTypes";
import type { AppLanguage } from "../../../types/domain";
import type { MessageDictionary } from "../../../lib/i18n";
import { getSourceTypeLabel, getTranscriptionErrorMessage } from "../../../lib/i18n";

interface UploadWorkflowStep {
  key: string;
  label: string;
  state: "pending" | "current" | "done" | "failed";
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

function buildUploadWorkflowSteps(
  sourceType: "audio" | "video" | null,
  uploadUiStatus: UploadUiStatus,
  hasUploadCompleted: boolean,
  stepLabels: {
    upload: string;
    transcribe: string;
    process: string;
  }
): UploadWorkflowStep[] {
  const steps: UploadWorkflowStep[] =
    sourceType === "video"
      ? [
          { key: "upload", label: stepLabels.upload, state: "pending" },
          { key: "process", label: stepLabels.process, state: "pending" }
        ]
      : [
          { key: "upload", label: stepLabels.upload, state: "pending" },
          { key: "transcribe", label: stepLabels.transcribe, state: "pending" }
        ];

  if (uploadUiStatus === "idle") {
    return steps;
  }

  if (uploadUiStatus === "uploading") {
    return steps.map((step, index) => ({
      ...step,
      state: index === 0 ? "current" : "pending"
    }));
  }

  if (uploadUiStatus === "processing") {
    return steps.map((step, index) => ({
      ...step,
      state: index === 0 ? "done" : "current"
    }));
  }

  if (uploadUiStatus === "success") {
    return steps.map((step) => ({
      ...step,
      state: "done"
    }));
  }

  if (uploadUiStatus === "timeout" || uploadUiStatus === "failed") {
    return steps.map((step, index) => ({
      ...step,
      state: hasUploadCompleted ? (index === 0 ? "done" : "failed") : index === 0 ? "failed" : "pending"
    }));
  }

  if (uploadUiStatus === "too_large") {
    return steps.map((step, index) => ({
      ...step,
      state: index === 0 ? "failed" : "pending"
    }));
  }

  return steps;
}

function uploadWorkflowTone(state: UploadWorkflowStep["state"]) {
  switch (state) {
    case "current":
      return {
        dot: "bg-amber-500 ring-4 ring-amber-100",
        text: "text-slate-900"
      };
    case "done":
      return {
        dot: "bg-emerald-500",
        text: "text-slate-900"
      };
    case "failed":
      return {
        dot: "bg-rose-500",
        text: "text-rose-700"
      };
    default:
      return {
        dot: "bg-slate-300",
        text: "text-slate-500"
      };
  }
}

interface CreateRecordUploadSectionProps {
  t: MessageDictionary;
  appLanguage: AppLanguage;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  uploadUiStatus: UploadUiStatus;
  selectedFileName: string | null;
  selectedFileSize: number | null;
  selectedFileSourceType: "audio" | "video" | null;
  hasUploadCompleted: boolean;
  transcriptionResult: ClientTranscriptionResult | null;
  transcriptionError: ClientTranscriptionError | null;
}

export function CreateRecordUploadSection({
  t,
  appLanguage,
  fileInputRef,
  onFileChange,
  uploadUiStatus,
  selectedFileName,
  selectedFileSize,
  selectedFileSourceType,
  hasUploadCompleted,
  transcriptionResult,
  transcriptionError
}: CreateRecordUploadSectionProps) {
  const selectedSourceTypeLabel = selectedFileSourceType
    ? getSourceTypeLabel(selectedFileSourceType, appLanguage)
    : t.common.emptyValue;
  const uploadWorkflowSteps = buildUploadWorkflowSteps(selectedFileSourceType, uploadUiStatus, hasUploadCompleted, {
    upload: t.modals.uploadWorkflowLabelUpload,
    transcribe: t.modals.uploadWorkflowLabelTranscribe,
    process: t.modals.uploadWorkflowLabelProcess
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
  const transcriptionErrorMessage = transcriptionError
    ? getTranscriptionErrorMessage(
        transcriptionError.code,
        appLanguage,
        TRANSCRIPTION_MAX_FILE_SIZE_BYTES / (1024 * 1024)
      )
    : null;
  const transcriptionModelAttempts =
    transcriptionResult?.transcriptionModelAttempts ||
    transcriptionResult?.transcriptMeta.transcriptionModelAttempts ||
    transcriptionError?.transcriptionModelAttempts ||
    [];
  const transcriptionModelUsed =
    transcriptionResult?.transcriptionModelUsed ||
    transcriptionResult?.transcriptMeta.transcriptionModelUsed ||
    transcriptionError?.transcriptionModelUsed ||
    null;
  const formattedModelUsed = formatTranscriptionModelName(transcriptionModelUsed);
  const formattedModelAttempts = transcriptionModelAttempts
    .map((model) => formatTranscriptionModelName(model))
    .filter((model): model is string => Boolean(model));
  const hasModelFallback =
    formattedModelAttempts.length > 1 &&
    formattedModelUsed != null &&
    formattedModelUsed === formattedModelAttempts.at(-1);
  const showArchivePlaceholder = !selectedFileName;

  return (
    <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3.5">
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
          onChange={onFileChange}
          ref={fileInputRef}
          type="file"
        />
      </label>

      {showArchivePlaceholder ? (
        <div
          className="rounded-xl bg-slate-100/80 px-3 py-2.5"
          data-testid="create-record-upload-placeholder"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-700">{t.modals.archiveModePlaceholderTitle}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t.modals.archiveModePlaceholderDescription}</p>
            </div>
            <button
              className="shrink-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600"
              type="button"
            >
              {t.modals.archiveModePlaceholderAction}
            </button>
          </div>
        </div>
      ) : null}

      {selectedFileName ? (
        <div
          aria-live="polite"
          className={`rounded-3xl border px-4 py-4 shadow-subtle ${uploadStatusTone(uploadUiStatus)}`}
          data-testid="upload-status-card"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{t.modals.uploadStatusCardTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{uploadStatusDescription}</p>
            {shouldShowLargeFileHint ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">{t.modals.uploadLargeFileHint}</p>
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
                  data-testid="upload-status-spinner"
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
              <p className="text-sm font-medium text-slate-900">{currentUploadStatusLabel}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t.modals.uploadSteps}
            </p>
            <div className="mt-3 space-y-2">
              {uploadWorkflowSteps.map((step) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 text-sm ${uploadWorkflowTone(step.state).text}`}
                  data-step-state={step.state}
                  data-testid={`upload-workflow-step-${step.key}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${uploadWorkflowTone(step.state).dot}`}
                  />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
            {selectedFileSourceType === "video" ? (
              <p className="mt-3 text-xs leading-5 text-slate-500">{t.modals.uploadWorkflowVideoHelper}</p>
            ) : null}
          </div>

          {formattedModelUsed || formattedModelAttempts.length ? (
            <div className="mt-4 rounded-2xl border border-white/40 bg-white/70 px-3 py-3 text-sm text-slate-700">
              {formattedModelAttempts.length > 1 ? (
                <p>
                  <span className="font-medium text-slate-900">{t.modals.uploadModelAttempts}: </span>
                  {formattedModelAttempts.join(" → ")}
                </p>
              ) : formattedModelUsed ? (
                <p>
                  <span className="font-medium text-slate-900">{t.modals.uploadModelUsed}: </span>
                  {formattedModelUsed}
                  {hasModelFallback ? `（${t.modals.uploadModelFallback}）` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {transcriptionErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              <p>{transcriptionErrorMessage}</p>
              {transcriptionError?.failureStage ? (
                <p className="mt-1 text-xs">
                  {t.modals.failureStagePrefix}: {getFailureStageLabel(appLanguage, transcriptionError.failureStage)}
                </p>
              ) : null}
              <p className="mt-1">{t.errors.youCanContinueEditingManually}</p>
            </div>
          ) : null}
          {transcriptionResult?.transcriptMeta ? (
            <div
              className="mt-4 border-t border-white/50 pt-3 text-xs leading-5 text-slate-600"
              data-testid="upload-metadata-group"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t.modals.transcriptMetadata}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="font-medium text-slate-900">{t.modals.fileName}: </span>
                  {transcriptionResult.transcriptMeta.fileName}
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t.modals.fileType}: </span>
                  {transcriptionResult.transcriptMeta.mimeType}
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t.modals.language}: </span>
                  {transcriptionResult.transcriptMeta.language || t.common.emptyValue}
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t.modals.segments}: </span>
                  {transcriptionResult.transcriptMeta.segments?.length ?? 0}
                </p>
                <p>
                  <span className="font-medium text-slate-900">{t.modals.timestamps}: </span>
                  {transcriptionResult.transcriptMeta.timestamps?.length ?? 0}
                </p>
                {formattedModelUsed ? (
                  <p>
                    <span className="font-medium text-slate-900">{t.modals.uploadModelUsed}: </span>
                    {formattedModelUsed}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
