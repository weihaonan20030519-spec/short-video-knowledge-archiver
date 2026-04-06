import { describe, expect, it, vi } from "vitest";

import { healthController } from "./healthController.js";

describe("healthController", () => {
  it("returns success payload", () => {
    const json = vi.fn();
    const response = { json } as unknown as Parameters<typeof healthController>[1];

    healthController({} as Parameters<typeof healthController>[0], response);

    expect(json).toHaveBeenCalledWith({ success: true });
  });
});
