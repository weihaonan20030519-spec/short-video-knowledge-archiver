import { describe, expect, it } from "vitest";

import { isAllowedCorsOrigin } from "./app.js";

describe("isAllowedCorsOrigin", () => {
  it("allows localhost development origins by default", () => {
    expect(isAllowedCorsOrigin("http://localhost:5173", [])).toBe(true);
    expect(isAllowedCorsOrigin("http://127.0.0.1:4173", [])).toBe(true);
  });

  it("allows configured app origins", () => {
    expect(isAllowedCorsOrigin("https://archiver.example.com", ["https://archiver.example.com"])).toBe(true);
  });

  it("rejects unknown remote origins", () => {
    expect(isAllowedCorsOrigin("https://unknown.example.com", ["https://archiver.example.com"])).toBe(false);
  });
});

