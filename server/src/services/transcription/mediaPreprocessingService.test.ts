import { describe, expect, it, vi } from "vitest";

import { preprocessMediaFile } from "./mediaPreprocessingService.js";
import type { AudioExtractionService } from "./audioExtractionService.js";

function createAudioExtractionServiceMock(): AudioExtractionService {
  return {
    extractAudio: vi.fn(async () => ({
      outputPath: "/tmp/extracted-audio.mp3",
      mimeType: "audio/mpeg"
    }))
  };
}

describe("preprocessMediaFile", () => {
  it("returns a stable audio preprocessing result without extraction", async () => {
    const result = await preprocessMediaFile(
      {
        filePath: "/tmp/input.mp3",
        fileName: "input.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        validatedMedia: {
          sourceType: "audio",
          normalizedMimeType: "audio/mpeg",
          extension: "mp3"
        }
      },
      {
        audioExtractionService: createAudioExtractionServiceMock(),
        probeMediaMetadata: vi.fn(async () => ({
          sourceType: "audio" as const,
          duration: 12.5,
          format: "mp3",
          audioCodec: "mp3"
        }))
      }
    );

    expect(result.transcriptionInput.derivedFrom).toBe("original");
    expect(result.transcriptionInput.filePath).toBe("/tmp/input.mp3");
    expect(result.mediaMetadata.duration).toBe(12.5);
    expect(result.cleanupPaths).toEqual([]);
  });

  it("extracts audio for video uploads and returns extracted transcription input", async () => {
    const audioExtractionService = createAudioExtractionServiceMock();

    const result = await preprocessMediaFile(
      {
        filePath: "/tmp/input.mp4",
        fileName: "input.mp4",
        mimeType: "video/mp4",
        size: 2048,
        validatedMedia: {
          sourceType: "video",
          normalizedMimeType: "video/mp4",
          extension: "mp4"
        }
      },
      {
        audioExtractionService,
        probeMediaMetadata: vi.fn(async () => ({
          sourceType: "video" as const,
          duration: 18,
          format: "mp4",
          videoCodec: "h264",
          audioCodec: "aac",
          videoWidth: 1280,
          videoHeight: 720
        }))
      }
    );

    expect(audioExtractionService.extractAudio).toHaveBeenCalledWith({ sourcePath: "/tmp/input.mp4" });
    expect(result.transcriptionInput.derivedFrom).toBe("extracted_audio");
    expect(result.transcriptionInput.filePath).toBe("/tmp/extracted-audio.mp3");
    expect(result.cleanupPaths).toEqual(["/tmp/extracted-audio.mp3"]);
  });
});
