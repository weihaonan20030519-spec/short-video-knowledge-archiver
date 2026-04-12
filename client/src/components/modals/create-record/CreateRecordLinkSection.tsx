import type { MessageDictionary } from "../../../lib/i18n";
import { getImportUiMessages } from "../../../lib/i18n";
import type { AppLanguage } from "../../../types/domain";
import type { ImportResult, ImportTrack } from "../../../services/import/importTypes";
import {
  getVisibleImportWarnings,
  type PasteLinkImportUiState
} from "../../../features/create-record/createRecordImportUi";

interface CreateRecordLinkSectionProps {
  t: MessageDictionary;
  appLanguage: AppLanguage;
  canTriggerImport: boolean;
  hasAttemptedImport: boolean;
  importResult: ImportResult | null;
  isTriggerDisabled: boolean;
  linkImportUiState: PasteLinkImportUiState;
  primaryMessage: string | null;
  helperMessage: string | null;
  statusTone: string;
  trackOptions: ImportTrack[];
  selectedTrackId: string;
  onTrackChange: (trackId: string | null) => void;
  onTriggerImport: () => void;
}

export function CreateRecordLinkSection({
  t,
  appLanguage,
  canTriggerImport,
  hasAttemptedImport,
  importResult,
  isTriggerDisabled,
  primaryMessage,
  helperMessage,
  statusTone,
  trackOptions,
  selectedTrackId,
  onTrackChange,
  onTriggerImport
}: CreateRecordLinkSectionProps) {
  const importText = getImportUiMessages(appLanguage);
  const showTrackSelector = trackOptions.length > 1;
  const showStatusPanel = hasAttemptedImport && (primaryMessage || helperMessage || importResult);
  const showEmptyPanel = !showStatusPanel;
  const visibleWarnings = getVisibleImportWarnings(importResult, appLanguage);
  const showImportResultPanel = Boolean(importResult && (showTrackSelector || visibleWarnings.length > 0));

  return (
    <div className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">{t.modals.linkImport.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{t.modals.linkImport.description}</p>
        </div>
        <button
          className="shrink-0 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canTriggerImport || isTriggerDisabled}
          onClick={onTriggerImport}
          type="button"
        >
          {t.modals.linkImport.trigger}
        </button>
      </div>

      {showEmptyPanel ? (
        <div
          className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-2.5 text-xs leading-6 text-slate-500"
          data-testid="link-import-empty-panel"
        >
          <p>{importText.idleHint}</p>
        </div>
      ) : null}

      {showStatusPanel ? (
        <div
          className={`rounded-2xl border px-3 py-2.5 text-xs ${statusTone}`}
          data-testid="link-import-result-panel"
        >
          {primaryMessage ? (
            <p aria-live="polite" className="text-xs font-medium leading-6">
              {primaryMessage}
            </p>
          ) : null}

          {helperMessage ? (
            <p className="mt-2 text-[11px] leading-5 opacity-80" data-testid="link-import-helper-message">
              {helperMessage}
            </p>
          ) : null}

          {showImportResultPanel && showTrackSelector ? (
            <label className={`${primaryMessage || helperMessage ? "mt-2" : ""} block`}>
              <span className="mb-2 block font-medium text-slate-700">
                {t.modals.bilibiliImport.trackSelectLabel}
              </span>
              <select
                aria-label={t.modals.bilibiliImport.trackSelectLabel}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                value={selectedTrackId}
                onChange={(event) => onTrackChange(event.target.value || null)}
              >
                {!selectedTrackId ? <option value="">{importText.selectTrackPlaceholder}</option> : null}
                {trackOptions.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showImportResultPanel && visibleWarnings.length ? (
            <div
              className={`${primaryMessage || helperMessage || showTrackSelector ? "mt-2 pt-2" : ""} text-[11px] leading-5 opacity-90`}
              data-testid="link-import-warning-group"
            >
              <p className="font-medium">{importText.warningsTitle}</p>
              {visibleWarnings.map((warning) => (
                <p key={warning.code} className="mt-1 first:mt-0">
                  {warning.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
