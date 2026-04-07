import type { Folder, Tag } from "../../types/domain";
import type { CreateRecordValues } from "../../types/forms";
import { getFolderDisplayName, type MessageDictionary } from "../../lib/i18n";
import {
  CREATE_RECORD_UI_MODE_ORDER,
  mapUiModeToInputMethod,
  type CreateRecordUiMode
} from "./createRecordUiMode";

export interface CreateRecordModeConfig {
  inputMethod: CreateRecordValues["inputMethod"];
  showTitle: boolean;
  showOriginalContent: boolean;
  showLinkInput: boolean;
  showUploadInput: boolean;
  showBrowserImportSection: boolean;
  showSecondaryMeta: boolean;
  requiresRuntimeState: boolean;
}

export const CREATE_RECORD_MODE_CONFIG: Record<CreateRecordUiMode, CreateRecordModeConfig> = {
  upload: {
    inputMethod: mapUiModeToInputMethod("upload"),
    showTitle: true,
    showOriginalContent: true,
    showLinkInput: false,
    showUploadInput: true,
    showBrowserImportSection: false,
    showSecondaryMeta: true,
    requiresRuntimeState: true
  },
  paste_text: {
    inputMethod: mapUiModeToInputMethod("paste_text"),
    showTitle: true,
    showOriginalContent: true,
    showLinkInput: false,
    showUploadInput: false,
    showBrowserImportSection: false,
    showSecondaryMeta: true,
    requiresRuntimeState: true
  },
  blank: {
    inputMethod: mapUiModeToInputMethod("blank"),
    showTitle: true,
    showOriginalContent: true,
    showLinkInput: false,
    showUploadInput: false,
    showBrowserImportSection: false,
    showSecondaryMeta: true,
    requiresRuntimeState: false
  },
  paste_link: {
    inputMethod: mapUiModeToInputMethod("paste_link"),
    showTitle: true,
    showOriginalContent: true,
    showLinkInput: true,
    showUploadInput: false,
    showBrowserImportSection: false,
    showSecondaryMeta: true,
    requiresRuntimeState: true
  },
  browser_import: {
    inputMethod: mapUiModeToInputMethod("browser_import"),
    showTitle: true,
    showOriginalContent: true,
    showLinkInput: true,
    showUploadInput: false,
    showBrowserImportSection: true,
    showSecondaryMeta: true,
    requiresRuntimeState: true
  }
};

export function getCreateRecordModeConfig(mode: CreateRecordUiMode) {
  return CREATE_RECORD_MODE_CONFIG[mode];
}

export function getCreateRecordModeLabel(
  t: MessageDictionary,
  mode: CreateRecordUiMode
) {
  switch (mode) {
    case "paste_text":
      return t.modals.inputMethods.text;
    case "blank":
      return t.modals.inputMethods.manual;
    case "paste_link":
      return t.modals.inputMethods.link;
    case "browser_import":
      return t.modals.browserImport.trigger;
    default:
      return t.modals.inputMethods.upload;
  }
}

export function getCreateRecordModeHelper(
  t: MessageDictionary,
  mode: CreateRecordUiMode
) {
  return t.modals.modeHelpers[mode];
}

export function getCreateRecordContentLabel(
  t: MessageDictionary,
  mode: CreateRecordUiMode
) {
  if (mode === "upload") {
    return t.modals.originalTranscript;
  }

  if (mode === "blank") {
    return t.modals.blankContentLabel;
  }

  if (mode === "paste_text") {
    return t.modals.pasteTextContentLabel;
  }

  return t.modals.content;
}

export function getCreateRecordContentPlaceholder(
  t: MessageDictionary,
  mode: CreateRecordUiMode
) {
  if (mode === "blank") {
    return t.modals.blankContentPlaceholder;
  }

  if (mode === "paste_text") {
    return t.modals.pasteTextContentPlaceholder;
  }

  if (mode === "paste_link" || mode === "browser_import") {
    return t.modals.linkContentPlaceholder;
  }

  return t.modals.contentPlaceholder;
}

export function getCreateRecordSubmitLabel(
  t: MessageDictionary,
  mode: CreateRecordUiMode
) {
  return t.modals.createRecordCta[mode];
}

export function getCreateRecordFolderOptions(
  folders: Folder[],
  language: "zh-CN" | "en"
) {
  return folders.map((folder) => ({
    id: folder.id,
    label: getFolderDisplayName(folder, language)
  }));
}

export function getCreateRecordModeOrder() {
  return CREATE_RECORD_UI_MODE_ORDER;
}

export function getCreateRecordTagsPlaceholder(t: MessageDictionary, tags: Tag[]) {
  return t.modals.tagsPlaceholder(tags[0]?.name || null);
}
