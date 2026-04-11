import { describe, expect, it, vi } from "vitest";

import { analyzeInputAuditFixtures } from "./inputAudit.fixtures.js";
import { runAnalyzeExperimentMatrix } from "./experimentRunner.js";

describe("runAnalyzeExperimentMatrix", () => {
  it("runs all four experiment cells against the provider with matching prompt options", async () => {
    const provider = {
      analyzeWithPromptOptions: vi.fn(async (_input, options) => {
        if (options.methodology === "legacy") {
          return {
            coreConclusion: "旧策略结论",
            logicFramework: [],
            keyDetails: [],
            reusablePoints: []
          };
        }

        return {
          coreConclusion: "新策略结论",
          logicFramework: ["机制层"],
          keyDetails: ["细节"],
          reusablePoints: ["迁移点"]
        };
      })
    };

    const results = await runAnalyzeExperimentMatrix(provider, [analyzeInputAuditFixtures[0]!], "learning");

    expect(results).toHaveLength(4);
    expect(provider.analyzeWithPromptOptions).toHaveBeenCalledTimes(4);
    expect(provider.analyzeWithPromptOptions).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ mode: "learning", rawText: analyzeInputAuditFixtures[0]!.rawText }),
      { methodology: "legacy", inputVariant: "raw_text_only" }
    );
    expect(provider.analyzeWithPromptOptions).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ mode: "learning", rawText: analyzeInputAuditFixtures[0]!.rawText }),
      { methodology: "restructured", inputVariant: "audited_layers" }
    );
    expect(results[0]?.output).toEqual({
      coreConclusion: "旧策略结论",
      logicFramework: [],
      keyDetails: [],
      reusablePoints: []
    });
    expect(results[3]?.output).toEqual({
      coreConclusion: "新策略结论",
      logicFramework: ["机制层"],
      keyDetails: ["细节"],
      reusablePoints: ["迁移点"]
    });
  });
});
