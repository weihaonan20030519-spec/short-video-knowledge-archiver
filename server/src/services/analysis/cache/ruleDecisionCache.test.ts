import { describe, expect, it } from "vitest";

import {
  buildRuleDecisionCacheKey,
  ruleDecisionCache
} from "./ruleDecisionCache.js";

describe("ruleDecisionCache", () => {
  it("stores and retrieves entries with version metadata", () => {
    ruleDecisionCache.clear();
    const key = buildRuleDecisionCacheKey("content-1", "decision-1");
    ruleDecisionCache.set(key, {
      routeAction: "return_review",
      reasonCode: "source_text_needs_review",
      review: {
        reasonCode: "source_text_needs_review",
        recommendedAction: "edit_source_text"
      },
      policyVersion: "policy-v1",
      decisionVersion: "decision-v1"
    });

    expect(ruleDecisionCache.get(key)).toEqual(
      expect.objectContaining({
        policyVersion: "policy-v1",
        decisionVersion: "decision-v1"
      })
    );
  });
});
