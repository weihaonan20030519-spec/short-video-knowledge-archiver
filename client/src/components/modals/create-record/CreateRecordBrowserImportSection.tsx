import type { MessageDictionary } from "../../../lib/i18n";
import { getImportUiMessages } from "../../../lib/i18n";
import {
  getBrowserImportMessage,
  getImportStatusTone,
  getPrimaryImportMessage,
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
  const primaryImportMessage = getPrimaryImportMessage(importSession, appLanguage);
  const shouldRecommendTrackSelection =
    importSession.flowState === "awaiting_track_selection" && !hasDetectedImportContent(importResult);

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">{t.modals.browserImport.waitingTitle}</p>
          <p className="mt-1 leading-6">{getBrowserImportMessage(t, browserImportState)}</p>
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

      {primaryImportMessage ? (
        <p
          aria-live="polite"
          className={`rounded-2xl border px-3 py-2 text-xs leading-6 ${getImportStatusTone(importSession.flowState, importResult)}`}
        >
          {primaryImportMessage}
        </p>
      ) : null}

      {importResult ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
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
                onChange={(event) => onTrackChange(event.target.value || null)}
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
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600">
              <p className="font-medium text-slate-700">{importText.warningsTitle}</p>
              {importResult.warnings.map((warning) => (
                <p key={warning.code}>{warning.message}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
