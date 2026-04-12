import { describe, expect, it } from "vitest";

import {
  buildDefaultMediaAsset,
  buildMediaAssetFromTranscriptionResult,
  getSafeMediaAsset
} from "./mediaAssetMapper";
import { createRecord } from "../../test/factories";

describe("mediaAssetMapper", () => {
  it("provides a safe default media asset for legacy records", () => {
    const mediaAsset = getSafeMediaAsset({ mediaAsset: null });

    expect(mediaAsset.storageMode).toBe("none");
    expect(mediaAsset.availability).toBe("not_archived");
    expect(mediaAsset.fileName).toBeNull();
  });

  it("builds an initial media asset from a transcription result", () => {
    const mediaAsset = buildMediaAssetFromTranscriptionResult({
      phase: "transcript_ready",
      sourceType: "audio",
      suggestedTitle: "Clip",
      transcriptText: "Transcript",
      transcriptionStatus: "transcript_needs_review",
      transcriptMeta: {
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        duration: 12
      },
      warnings: []
    });

    expect(mediaAsset).toEqual(
      expect.objectContaining({
        storageMode: "none",
        availability: "not_archived",
        fileName: "clip.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        duration: 12,
        sourceType: "audio"
      })
    );
  });

  it("normalizes partial media asset objects on existing records", () => {
    const record = createRecord({
      mediaAsset: buildDefaultMediaAsset({
        fileName: "demo.mp4"
      })
    });

    const mediaAsset = getSafeMediaAsset(record);
    expect(mediaAsset.fileName).toBe("demo.mp4");
    expect(mediaAsset.availability).toBe("not_archived");
  });
});
