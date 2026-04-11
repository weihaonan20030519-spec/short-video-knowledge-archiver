import { describe, expect, it } from "vitest";

import { resolveReviewDecision } from "./reviewPolicy.js";

const keyConfig = {
  provider: "gemini",
  model: "gemini-test",
  policyVersion: "policy-v1",
  decisionVersion: "decision-v1",
  promptVersion: "prompt-v1",
  presentationVersion: "presentation-v1"
};

describe("resolveReviewDecision", () => {
  it("returns review for insufficient learning content", () => {
    const decision = resolveReviewDecision(
      {
        mode: "learning",
        appLanguage: "zh-CN",
        title: "",
        sourcePlatform: "unknown",
        originalUrl: null,
        rawText: "短内容"
      },
      {
        sufficiency: "insufficient",
        ambiguity: "medium",
        localityFit: "not_applicable"
      },
      keyConfig
    );

    expect(decision).toEqual(
      expect.objectContaining({
        routeAction: "return_review",
        reasonCode: "source_text_needs_review",
        review: {
          reasonCode: "source_text_needs_review",
          recommendedAction: "edit_source_text"
        },
        policyVersion: "policy-v1",
        decisionVersion: "decision-v1"
      })
    );
  });

  it("returns review for borderline high-ambiguity learning content", () => {
    const decision = resolveReviewDecision(
      {
        mode: "learning",
        appLanguage: "zh-CN",
        title: "",
        sourcePlatform: "unknown",
        originalUrl: null,
        rawText: "边界内容"
      },
      {
        sufficiency: "borderline",
        ambiguity: "high",
        localityFit: "not_applicable"
      },
      keyConfig
    );

    expect(decision?.routeAction).toBe("return_review");
  });

  it("does not review ordinary concise content", () => {
    const decision = resolveReviewDecision(
      {
        mode: "concise",
        appLanguage: "zh-CN",
        title: "标题",
        sourcePlatform: "unknown",
        originalUrl: null,
        rawText: "这是一段普通正文，虽然不长，但已经足够整理出摘要。"
      },
      {
        sufficiency: "borderline",
        ambiguity: "low",
        localityFit: "strong"
      },
      keyConfig
    );

    expect(decision).toBeNull();
  });
});
