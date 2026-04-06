import { db } from "../database";
import type { Folder } from "../../types/domain";

export const folderRepository = {
  async create(folder: Folder) {
    await db.folders.add(folder);
    return folder;
  },

  getById(id: string) {
    return db.folders.get(id);
  },

  async listAll() {
    const folders = await db.folders.orderBy("sortOrder").toArray();
    return folders.filter((folder) => !folder.isSystem);
  },

  async update(id: string, patch: Partial<Folder>) {
    await db.folders.update(id, patch);
    return this.getById(id);
  },

  async delete(id: string) {
    await db.folders.delete(id);
  }
};
