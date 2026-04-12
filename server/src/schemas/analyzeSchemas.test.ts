import { describe, expect, it } from "vitest";

import { learningOutputJsonSchema } from "./analyzeSchemas.js";

describe("learningOutputJsonSchema", () => {
  it("does not include unresolved internal refs for Gemini structured output", () => {
    const schemaText = JSON.stringify(learningOutputJsonSchema);

    expect(schemaText).not.toContain("#/definitions/");
    expect(schemaText).toContain("\"claimCore\"");
    expect(schemaText).toContain("\"mechanismChain\"");
    expect(schemaText).not.toContain("\"highlights\"");
  });
});
