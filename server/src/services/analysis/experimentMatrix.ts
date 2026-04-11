import type {
  AnalyzeMode,
  AnalyzeRequest
} from "../../../../shared/src/analysis/analyzeContracts.js";
import { buildConcisePrompt } from "../../prompts/concisePrompt.js";
import { buildLearningPrompt } from "../../prompts/learningPrompt.js";
import type {
  AnalyzePromptBuildOptions,
  AnalyzePromptInputVariant,
  AnalyzePromptMethodology
} from "../../prompts/analyzePromptOptions.js";
import type { AnalyzeInputAuditFixture } from "./inputAudit.fixtures.js";

export type AnalyzeExperimentMatrixCell =
  | "old_input_old_prompt"
  | "new_input_old_prompt"
  | "old_input_new_prompt"
  | "new_input_new_prompt";

export interface AnalyzeExperimentCase {
  sampleId: string;
  mode: AnalyzeMode;
  matrixCell: AnalyzeExperimentMatrixCell;
  methodology: AnalyzePromptMethodology;
  inputVariant: AnalyzePromptInputVariant;
  request: AnalyzeRequest;
  expectedMainJudgment: string;
  expectedHasMechanismLayer: boolean;
  expectedOcrIsSupplementOnly: boolean;
  failureModes: string[];
  prompt: {
    systemInstruction: string;
    userPrompt: string;
  };
}

const MATRIX_OPTIONS: Record<AnalyzeExperimentMatrixCell, Required<AnalyzePromptBuildOptions>> = {
  old_input_old_prompt: {
    methodology: "legacy",
    inputVariant: "raw_text_only"
  },
  new_input_old_prompt: {
    methodology: "legacy",
    inputVariant: "audited_layers"
  },
  old_input_new_prompt: {
    methodology: "restructured",
    inputVariant: "raw_text_only"
  },
  new_input_new_prompt: {
    methodology: "restructured",
    inputVariant: "audited_layers"
  }
};

function buildExperimentRequest(
  fixture: AnalyzeInputAuditFixture,
  mode: AnalyzeMode
): AnalyzeRequest {
  return {
    mode,
    appLanguage: "zh-CN",
    sourcePlatform: "xiaohongshu",
    originalUrl: null,
    rawText: fixture.rawText
  };
}

function buildPrompt(input: AnalyzeRequest, options: Required<AnalyzePromptBuildOptions>) {
  return input.mode === "concise"
    ? buildConcisePrompt(input, options)
    : buildLearningPrompt(input, options);
}

export function buildAnalyzeExperimentMatrix(
  fixtures: AnalyzeInputAuditFixture[],
  mode: AnalyzeMode
): AnalyzeExperimentCase[] {
  return fixtures.flatMap((fixture) =>
    (Object.entries(MATRIX_OPTIONS) as Array<
      [AnalyzeExperimentMatrixCell, Required<AnalyzePromptBuildOptions>]
    >).map(([matrixCell, options]) => {
      const request = buildExperimentRequest(fixture, mode);

      return {
        sampleId: fixture.sampleId,
        mode,
        matrixCell,
        methodology: options.methodology,
        inputVariant: options.inputVariant,
        request,
        expectedMainJudgment: fixture.expectedMainJudgment,
        expectedHasMechanismLayer: fixture.expectedHasMechanismLayer,
        expectedOcrIsSupplementOnly: fixture.expectedOcrIsSupplementOnly,
        failureModes: fixture.failureModes,
        prompt: buildPrompt(request, options)
      };
    })
  );
}

export function summarizeAnalyzeExperimentMatrix(cases: AnalyzeExperimentCase[]) {
  return cases.reduce<Record<AnalyzeExperimentMatrixCell, number>>(
    (summary, entry) => {
      summary[entry.matrixCell] += 1;
      return summary;
    },
    {
      old_input_old_prompt: 0,
      new_input_old_prompt: 0,
      old_input_new_prompt: 0,
      new_input_new_prompt: 0
    }
  );
}
