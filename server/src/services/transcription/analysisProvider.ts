import type {
  AnalyzeRequest,
  ConciseOutput,
  LearningOutput
} from "../../schemas/analyzeSchemas.js";

export interface AnalysisProvider {
  readonly name: string;
  analyze(input: AnalyzeRequest): Promise<ConciseOutput | LearningOutput>;
}
