import type { Folder, RecordItem, Tag } from "../types/domain";

export function createFolder(overrides: Partial<Folder> = {}): Folder {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || "默认文件夹",
    createdAt: overrides.createdAt || new Date("2026-04-02T10:00:00.000Z").toISOString(),
    updatedAt: overrides.updatedAt || new Date("2026-04-02T10:00:00.000Z").toISOString(),
    sortOrder: overrides.sortOrder ?? 1,
    isSystem: overrides.isSystem ?? false
  };
}

export function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || "默认标签",
    createdAt: overrides.createdAt || new Date("2026-04-02T10:00:00.000Z").toISOString(),
    updatedAt: overrides.updatedAt || new Date("2026-04-02T10:00:00.000Z").toISOString()
  };
}

export function createRecord(overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || "默认记录",
    sourcePlatform: overrides.sourcePlatform || "unknown",
    sourceType: overrides.sourceType || "text",
    inputMethod: overrides.inputMethod || "text",
    originalUrl: overrides.originalUrl ?? null,
    folderId: overrides.folderId ?? null,
    tagIds: overrides.tagIds || [],
    createdAt: overrides.createdAt || new Date("2026-04-02T10:00:00.000Z").toISOString(),
    updatedAt: overrides.updatedAt || new Date("2026-04-02T10:00:00.000Z").toISOString(),
    watchedAt: overrides.watchedAt ?? null,
    lastViewedAt: overrides.lastViewedAt ?? null,
    originalContent: overrides.originalContent || "这是一段足够长的原始内容，用于测试页面交互。",
    personalNote: overrides.personalNote || "",
    transcriptionStatus: overrides.transcriptionStatus || "idle",
    contentCompleteness: overrides.contentCompleteness || "full",
    transcriptMeta: overrides.transcriptMeta ?? null,
    aiStatus: overrides.aiStatus || "not_started",
    aiErrorMessage: overrides.aiErrorMessage ?? null,
    aiErrorCode: overrides.aiErrorCode ?? null,
    importSummary: overrides.importSummary ?? null,
    currentMode: overrides.currentMode ?? null,
    aiOutputs: overrides.aiOutputs || {
      concise: null,
      learning: null
    }
  };
}
