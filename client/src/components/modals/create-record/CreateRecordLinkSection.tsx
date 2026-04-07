import type { MessageDictionary } from "../../../lib/i18n";
import { getImportUiMessages } from "../../../lib/i18n";
import type { AppLanguage } from "../../../types/domain";
import type { ImportResult, ImportTrack } from "../../../services/import/importTypes";
import type { PasteLinkImportUiState } from "../../../features/create-record/createRecordImportUi";

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
  const visibleWarnings = importResult?.warnings.filter((warning) => warning.message.trim()) ?? [];
  const showImportResultPanel = Boolean(importResult && (showTrackSelector || visibleWarnings.length > 0));

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-900">{t.modals.linkImport.title}</p>
          <p className="mt-1 leading-6">{t.modals.linkImport.description}</p>
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

      {showStatusPanel ? (
        <div className="space-y-2">
          {primaryMessage ? (
            <p aria-live="polite" className={`rounded-2xl border px-3 py-2 text-xs leading-6 ${statusTone}`}>
              {primaryMessage}
            </p>
          ) : null}

          {helperMessage ? <p className="px-1 text-xs leading-6 text-slate-500">{helperMessage}</p> : null}

          {showImportResultPanel ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
              {showTrackSelector ? (
                <label className="block">
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

              {visibleWarnings.length ? (
                <div className={`${showTrackSelector ? "mt-3" : ""} rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-600`}>
                  <p className="font-medium text-slate-700">{importText.warningsTitle}</p>
                  {visibleWarnings.map((warning) => (
                    <p key={warning.code}>{warning.message}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
