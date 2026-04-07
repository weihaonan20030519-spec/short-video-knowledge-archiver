import type { CreateRecordUiMode } from "./createRecordUiMode";
import { isLinkFamilyMode } from "./createRecordUiMode";

export interface CreateRecordModeTransitionPlan {
  preserveOriginalUrl: boolean;
  resetUploadRuntime: boolean;
  resetImportRuntime: boolean;
}

export function getCreateRecordModeTransitionPlan(
  previousMode: CreateRecordUiMode,
  nextMode: CreateRecordUiMode
): CreateRecordModeTransitionPlan {
  return {
    preserveOriginalUrl: isLinkFamilyMode(previousMode) && isLinkFamilyMode(nextMode),
    resetUploadRuntime: previousMode === "upload" && previousMode !== nextMode,
    resetImportRuntime:
      (previousMode === "paste_link" || previousMode === "browser_import" || previousMode === "paste_text") &&
      previousMode !== nextMode
  };
}
