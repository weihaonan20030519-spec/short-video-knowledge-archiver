import type { InputMethod } from "../../types/domain";

export type CreateRecordUiMode =
  | "upload"
  | "paste_text"
  | "blank"
  | "paste_link"
  | "browser_import";

export const CREATE_RECORD_UI_MODE_ORDER: CreateRecordUiMode[] = [
  "upload",
  "paste_text",
  "paste_link",
  "browser_import"
];

export function mapUiModeToInputMethod(mode: CreateRecordUiMode): InputMethod {
  switch (mode) {
    case "paste_text":
      return "text";
    case "blank":
      return "manual";
    case "paste_link":
    case "browser_import":
      return "link";
    default:
      return "upload";
  }
}

export function isLinkFamilyMode(mode: CreateRecordUiMode) {
  return mode === "paste_link" || mode === "browser_import";
}

export function isTextEntryMode(mode: CreateRecordUiMode) {
  return mode === "paste_text" || mode === "blank";
}
