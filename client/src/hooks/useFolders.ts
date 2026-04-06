import { useLiveQuery } from "dexie-react-hooks";

import { folderRepository } from "../db/repositories/folderRepository";

export function useFolders() {
  return useLiveQuery(() => folderRepository.listAll(), [], []);
}
