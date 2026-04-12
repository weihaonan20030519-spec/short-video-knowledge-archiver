import { describe, expect, it } from "vitest";

import { validateMediaFile } from "./mediaValidation.js";

describe("validateMediaFile", () => {
  it("normalizes m4a uploads to audio/mp4 regardless of browser mime hints", () => {
    expect(validateMediaFile("clip.m4a", "application/octet-stream")).toMatchObject({
      sourceType: "audio",
      extension: "m4a",
      normalizedMimeType: "audio/mp4"
    });
    expect(validateMediaFile("clip.m4a", "audio/x-m4a")).toMatchObject({
      sourceType: "audio",
      extension: "m4a",
      normalizedMimeType: "audio/mp4"
    });
  });

  it("keeps non-m4a recognized audio mime types intact", () => {
    expect(validateMediaFile("clip.mp3", "audio/mpeg")).toMatchObject({
      sourceType: "audio",
      extension: "mp3",
      normalizedMimeType: "audio/mpeg"
    });
  });
});
