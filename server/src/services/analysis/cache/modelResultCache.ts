import type {
  AnalyzeDecision,
  AnalyzeRenderableOutput
} from "../../../../../shared/src/analysis/analyzeContracts.js";

export interface ModelResultCacheEntry {
  data: AnalyzeRenderableOutput;
  generatedAt: string;
  source: "model";
  decision: AnalyzeDecision;
}

export interface ModelResultCacheStore {
  get(key: string): ModelResultCacheEntry | undefined;
  set(key: string, value: ModelResultCacheEntry): void;
  clear(): void;
}

function createMemoryModelResultCacheStore(): ModelResultCacheStore {
  const cache = new Map<string, ModelResultCacheEntry>();

  return {
    get(key) {
      return cache.get(key);
    },
    set(key, value) {
      cache.set(key, value);
    },
    clear() {
      cache.clear();
    }
  };
}

export function buildModelResultCacheKey(contentHash: string, modelContextHash: string) {
  return `${contentHash}:${modelContextHash}`;
}

export const modelResultCache = createMemoryModelResultCacheStore();
