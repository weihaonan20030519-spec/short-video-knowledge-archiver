import { useLiveQuery } from "dexie-react-hooks";

import { tagRepository } from "../db/repositories/tagRepository";

export function useTags() {
  return useLiveQuery(() => tagRepository.listAll(), [], []);
}
