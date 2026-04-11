import type {
  ConciseOutput,
  LearningOutput
} from "../../../../shared/src/analysis/analyzeContracts.js";
import type { AnalyzeRequest } from "../../../../shared/src/analysis/analyzeContracts.js";

export interface AnalysisProvider {
  readonly name: string;
  analyze(input: AnalyzeRequest): Promise<ConciseOutput | LearningOutput>;
}
