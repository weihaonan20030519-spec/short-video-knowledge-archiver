import { db } from "../database";
import type { Tag } from "../../types/domain";

export const tagRepository = {
  async create(tag: Tag) {
    await db.tags.add(tag);
    return tag;
  },

  getById(id: string) {
    return db.tags.get(id);
  },

  listAll() {
    return db.tags.orderBy("name").toArray();
  },

  async update(id: string, patch: Partial<Tag>) {
    await db.tags.update(id, patch);
    return this.getById(id);
  },

  async delete(id: string) {
    await db.tags.delete(id);
  }
};
