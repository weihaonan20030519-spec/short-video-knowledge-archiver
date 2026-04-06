import type {
  AIOutputSlot,
  AnalyzeMode,
  ConciseOutput,
  LearningOutput,
  RecordItem
} from "../types/domain";

export function getActiveMode(record: RecordItem): AnalyzeMode {
  return record.currentMode || (record.aiOutputs.learning ? "learning" : "concise");
}

export function createConciseAiSlot(
  result: ConciseOutput,
  generatedAt: string,
  previousVersion = 0
): AIOutputSlot<ConciseOutput> {
  return {
    mode: "concise",
    generatedAt,
    lastEditedAt: null,
    originalResult: result,
    currentResult: result,
    version: previousVersion + 1
  };
}

export function createLearningAiSlot(
  result: LearningOutput,
  generatedAt: string,
  previousVersion = 0
): AIOutputSlot<LearningOutput> {
  return {
    mode: "learning",
    generatedAt,
    lastEditedAt: null,
    originalResult: result,
    currentResult: result,
    version: previousVersion + 1
  };
}
