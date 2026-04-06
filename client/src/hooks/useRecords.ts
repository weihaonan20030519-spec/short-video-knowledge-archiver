import { useLiveQuery } from "dexie-react-hooks";

import { recordRepository } from "../db/repositories/recordRepository";

export function useRecords() {
  return useLiveQuery(() => recordRepository.listAll(), [], []);
}
