import type { Folder, Tag } from "../types/domain";

export function normalizeCollectionName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isDuplicateFolderName(folders: Folder[], name: string, currentId?: string) {
  const normalized = normalizeCollectionName(name).toLowerCase();
  return folders.some(
    (folder) =>
      folder.id !== currentId && normalizeCollectionName(folder.name).toLowerCase() === normalized
  );
}

export function isDuplicateTagName(tags: Tag[], name: string, currentId?: string) {
  const normalized = normalizeCollectionName(name).toLowerCase();
  return tags.some((tag) => tag.id !== currentId && normalizeCollectionName(tag.name).toLowerCase() === normalized);
}
