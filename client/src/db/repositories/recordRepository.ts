import { db } from "../database";
import type { RecordItem } from "../../types/domain";
import { buildRecordSearchText } from "../../lib/search";

export const recordRepository = {
  async create(record: RecordItem) {
    await db.records.add(record);
    return record;
  },

  getById(id: string) {
    return db.records.get(id);
  },

  async listAll() {
    const items = await db.records.toArray();
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async update(id: string, patch: Partial<RecordItem>) {
    await db.records.update(id, patch);
    return this.getById(id);
  },

  async delete(id: string) {
    await db.records.delete(id);
  },

  async listByFolder(folderId: string) {
    const items = await db.records.where("folderId").equals(folderId).toArray();
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listByTag(tagId: string) {
    const all = await db.records.toArray();
    return all
      .filter((record) => record.tagIds.includes(tagId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async search(query: string) {
    const [records, tags] = await Promise.all([db.records.toArray(), db.tags.toArray()]);
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return records
      .filter((record) => buildRecordSearchText(record, tags).includes(normalized))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
};
