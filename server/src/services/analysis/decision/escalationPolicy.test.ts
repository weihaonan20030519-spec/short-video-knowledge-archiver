import { describe, expect, it } from "vitest";

import { resolveEscalationDecision } from "./escalationPolicy.js";

describe("resolveEscalationDecision", () => {
  it("always returns call_model in phase 2", () => {
    const decision = resolveEscalationDecision(
      {
        sufficiency: "sufficient",
        ambiguity: "low",
        localityFit: "strong"
      },
      {
        provider: "gemini",
        model: "gemini-test",
        policyVersion: "policy-v1",
        decisionVersion: "decision-v1",
        promptVersion: "prompt-v1",
        presentationVersion: "presentation-v1"
      }
    );

    expect(decision.routeAction).toBe("call_model");
    expect(decision.reasonCode).toBe("model_required");
    expect(decision.review).toBeNull();
  });
});
