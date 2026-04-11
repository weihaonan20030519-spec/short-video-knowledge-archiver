import type {
  AnalyzeMode,
  ConciseOutput,
  LearningOutput
} from "../../../../shared/src/analysis/analyzeContracts.js";
import type { AnalyzePromptBuildOptions } from "../../prompts/analyzePromptOptions.js";
import type { AnalyzeInputAuditFixture } from "./inputAudit.fixtures.js";
import { buildAnalyzeExperimentMatrix, type AnalyzeExperimentCase } from "./experimentMatrix.js";

export interface AnalyzeExperimentProvider {
  analyzeWithPromptOptions(
    input: AnalyzeExperimentCase["request"],
    options: AnalyzePromptBuildOptions
  ): Promise<ConciseOutput | LearningOutput>;
}

export interface AnalyzeExperimentRunResult {
  experimentCase: AnalyzeExperimentCase;
  output: ConciseOutput | LearningOutput;
}

export async function runAnalyzeExperimentMatrix(
  provider: AnalyzeExperimentProvider,
  fixtures: AnalyzeInputAuditFixture[],
  mode: AnalyzeMode
): Promise<AnalyzeExperimentRunResult[]> {
  const cases = buildAnalyzeExperimentMatrix(fixtures, mode);
  const results: AnalyzeExperimentRunResult[] = [];

  for (const experimentCase of cases) {
    const output = await provider.analyzeWithPromptOptions(experimentCase.request, {
      methodology: experimentCase.methodology,
      inputVariant: experimentCase.inputVariant
    });

    results.push({
      experimentCase,
      output
    });
  }

  return results;
}
