import type { MessageDictionary } from "../../../lib/i18n";
import { getImportUiMessages } from "../../../lib/i18n";
import {
  getBrowserImportHelperMessage,
  getBrowserImportMessage,
  getBrowserImportPrimaryMessage,
  getImportStatusTone,
  getPrimaryImportMessage,
  getVisibleImportWarnings,
  hasDetectedImportContent
} from "../../../features/create-record/createRecordImportUi";
import type { BrowserImportUiState } from "../../../features/create-record/createRecordImportUi";
import type { AppLanguage } from "../../../types/domain";
import type { ImportResult, ImportSession, ImportTrack } from "../../../services/import/importTypes";

interface CreateRecordBrowserImportSectionProps {
  t: MessageDictionary;
  appLanguage: AppLanguage;
  browserImportState: BrowserImportUiState;
  importSession: ImportSession;
  importResult: ImportResult | null;
  trackOptions: ImportTrack[];
  selectedTrackId: string;
  onTrackChange: (trackId: string | null) => void;
  onTrigger: () => void;
}

export function CreateRecordBrowserImportSection({
  t,
  appLanguage,
  browserImportState,
  importSession,
  importResult,
  trackOptions,
  selectedTrackId,
  onTrackChange,
  onTrigger
}: CreateRecordBrowserImportSectionProps) {
  const importText = getImportUiMessages(appLanguage);
  const flowPrimaryMessage = getPrimaryImportMessage(importSession, appLanguage);
  const resultPrimaryMessage = getBrowserImportPrimaryMessage(importResult, appLanguage);
  const primaryMessage = flowPrimaryMessage ?? resultPrimaryMessage;
  const helperMessage = flowPrimaryMessage ? null : getBrowserImportHelperMessage(importResult, appLanguage);
  const visibleWarnings = getVisibleImportWarnings(importResult, appLanguage);
  const shouldRecommendTrackSelection =
    importSession.flowState === "awaiting_track_selection" && !hasDetectedImportContent(importResult);

  return (
    <div className="space-y-2 rounded-[24px] border border-slate-200 bg-slate-50/90 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">{t.modals.browserImport.waitingTitle}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{getBrowserImportMessage(t, browserImportState)}</p>
        </div>
        <button
          className="shrink-0 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={browserImportState.status === "waiting"}
          onClick={onTrigger}
          type="button"
        >
          {t.modals.browserImport.trigger}
        </button>
      </div>

      {primaryMessage || helperMessage || importResult ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600"
          data-testid="browser-import-result-panel"
        >
          {primaryMessage ? (
            <p
              aria-live="polite"
              className={`rounded-2xl border px-3 py-2 text-xs leading-6 ${getImportStatusTone(importSession.flowState, importResult)}`}
            >
              {primaryMessage}
            </p>
          ) : null}

          {helperMessage ? (
            <p
              className="mt-2 px-1 text-xs leading-6 text-slate-500"
              data-testid="browser-import-helper-message"
            >
              {helperMessage}
            </p>
          ) : null}

          {importResult && trackOptions.length > 0 ? (
            <p className={`${primaryMessage || helperMessage ? "mt-2" : ""} font-medium text-slate-700`}>
              {importText.trackCountLabel(trackOptions.length)}
            </p>
          ) : null}

          {importResult && trackOptions.length > 1 ? (
            <label className="mt-2 block">
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
              <span className="mt-1 block text-[11px] text-slate-500">
                {shouldRecommendTrackSelection ? importText.selectTrackRecommended : importText.multipleTracksAvailable}
              </span>
            </label>
          ) : null}

          {importResult && visibleWarnings.length ? (
            <div
              className={`${primaryMessage || helperMessage || trackOptions.length > 0 ? "mt-2" : ""} rounded-xl bg-amber-50/70 px-3 py-2 text-[11px] leading-5 text-amber-900 ring-1 ring-inset ring-amber-100`}
              data-testid="browser-import-warning-group"
            >
              <p className="font-medium text-amber-950">{importText.warningsTitle}</p>
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
