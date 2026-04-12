import { describe, expect, it } from "vitest";

import {
  buildContentHash,
  buildDecisionContextHash,
  buildPresentationHash
} from "./cacheKeys.js";

describe("cacheKeys", () => {
  it("builds the same contentHash from equivalent normalized raw text", () => {
    const first = buildContentHash("  one   two\nthree  ");
    const second = buildContentHash("one two three");

    expect(first).toBe(second);
  });

  it("does not include appLanguage in the decisionContextHash", () => {
    const first = buildDecisionContextHash({
      mode: "concise",
      sourcePlatform: "unknown",
      policyVersion: "policy-v1",
      decisionVersion: "v1"
    });
    const second = buildDecisionContextHash({
      mode: "concise",
      sourcePlatform: "unknown",
      policyVersion: "policy-v1",
      decisionVersion: "v1"
    });

    expect(first).toBe(second);
  });

  it("changes presentationHash without changing the decisionContextHash", () => {
    const decisionHash = buildDecisionContextHash({
      mode: "concise",
      sourcePlatform: "unknown",
      policyVersion: "policy-v1",
      decisionVersion: "v1"
    });
    const presentationHashZh = buildPresentationHash({
      mode: "concise",
      appLanguage: "zh-CN",
      presentationVersion: "presentation-v1"
    });
    const presentationHashEn = buildPresentationHash({
      mode: "concise",
      appLanguage: "en",
      presentationVersion: "presentation-v1"
    });

    expect(decisionHash).toBe(
      buildDecisionContextHash({
        mode: "concise",
        sourcePlatform: "unknown",
        policyVersion: "policy-v1",
        decisionVersion: "v1"
      })
    );
    expect(presentationHashZh).not.toBe(presentationHashEn);
  });

  it("changes decisionContextHash when policyVersion changes", () => {
    const first = buildDecisionContextHash({
      mode: "concise",
      sourcePlatform: "unknown",
      policyVersion: "policy-v1",
      decisionVersion: "v1"
    });
    const second = buildDecisionContextHash({
      mode: "concise",
      sourcePlatform: "unknown",
      policyVersion: "policy-v2",
      decisionVersion: "v1"
    });

    expect(first).not.toBe(second);
  });
});
