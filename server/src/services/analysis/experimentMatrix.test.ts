import { describe, expect, it } from "vitest";

import { buildAnalyzeExperimentMatrix, summarizeAnalyzeExperimentMatrix } from "./experimentMatrix.js";
import { analyzeInputAuditFixtures } from "./inputAudit.fixtures.js";
import { createAnalyzeExperimentRubricCard, summarizeRubricCompletion } from "./experimentRubric.js";

describe("buildAnalyzeExperimentMatrix", () => {
  it("builds the full four-cell matrix for every fixture in learning mode", () => {
    const cases = buildAnalyzeExperimentMatrix(analyzeInputAuditFixtures, "learning");

    expect(cases).toHaveLength(analyzeInputAuditFixtures.length * 4);
    expect(summarizeAnalyzeExperimentMatrix(cases)).toEqual({
      old_input_old_prompt: analyzeInputAuditFixtures.length,
      new_input_old_prompt: analyzeInputAuditFixtures.length,
      old_input_new_prompt: analyzeInputAuditFixtures.length,
      new_input_new_prompt: analyzeInputAuditFixtures.length
    });
  });

  it("keeps the matrix dimensions orthogonal: old/new input and old/new prompt", () => {
    const [oldOld, newOld, oldNew, newNew] = buildAnalyzeExperimentMatrix(
      [analyzeInputAuditFixtures[0]!],
      "learning"
    );

    expect(oldOld.matrixCell).toBe("old_input_old_prompt");
    expect(oldOld.inputVariant).toBe("raw_text_only");
    expect(oldOld.methodology).toBe("legacy");
    expect(oldOld.prompt.userPrompt).toContain("Raw text:");
    expect(oldOld.prompt.userPrompt).not.toContain("Input layers and priority:");

    expect(newOld.matrixCell).toBe("new_input_old_prompt");
    expect(newOld.inputVariant).toBe("audited_layers");
    expect(newOld.methodology).toBe("legacy");
    expect(newOld.prompt.userPrompt).toContain("Input layers and priority:");
    expect(newOld.prompt.userPrompt).toContain("logicFramework should describe the visible structure");

    expect(oldNew.matrixCell).toBe("old_input_new_prompt");
    expect(oldNew.inputVariant).toBe("raw_text_only");
    expect(oldNew.methodology).toBe("restructured");
    expect(oldNew.prompt.userPrompt).toContain("Generation units you must produce before section mapping:");
    expect(oldNew.prompt.userPrompt).toContain("Raw text:");

    expect(newNew.matrixCell).toBe("new_input_new_prompt");
    expect(newNew.inputVariant).toBe("audited_layers");
    expect(newNew.methodology).toBe("restructured");
    expect(newNew.prompt.userPrompt).toContain("Generation units you must produce before section mapping:");
    expect(newNew.prompt.userPrompt).toContain("Input layers and priority:");
  });
});

describe("createAnalyzeExperimentRubricCard", () => {
  it("creates a learning rubric card with the full Phase 3 criteria set", () => {
    const matrixCase = buildAnalyzeExperimentMatrix([analyzeInputAuditFixtures[0]!], "learning")[0]!;
    const rubricCard = createAnalyzeExperimentRubricCard(matrixCase);

    expect(rubricCard.criteria.map((criterion) => criterion.id)).toEqual([
      "core_conclusion_background_pollution",
      "learning_mechanism_layer",
      "reusable_points_transferability",
      "section_duplication_rate",
      "section_misalignment_rate",
      "provider_difference_convergence"
    ]);
  });

  it("creates a concise rubric card without learning-only criteria and tracks completion", () => {
    const matrixCase = buildAnalyzeExperimentMatrix([analyzeInputAuditFixtures[1]!], "concise")[0]!;
    const rubricCard = createAnalyzeExperimentRubricCard(matrixCase);

    expect(rubricCard.criteria.map((criterion) => criterion.id)).toEqual([
      "core_conclusion_background_pollution",
      "section_duplication_rate",
      "section_misalignment_rate",
      "provider_difference_convergence"
    ]);

    expect(summarizeRubricCompletion([rubricCard])).toEqual([
      {
        sampleId: rubricCard.sampleId,
        mode: "concise",
        matrixCell: rubricCard.matrixCell,
        totalCriteria: 4,
        scoredCriteria: 0
      }
    ]);
  });
});
