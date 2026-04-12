import { describe, expect, it, vi } from "vitest";

import { createTranscriptionController } from "./transcriptionController.js";
import type { AudioExtractionService } from "../services/transcription/audioExtractionService.js";
import type { TranscriptionProvider } from "../services/transcription/transcriptionProvider.js";

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    json,
    status
  };
}

function createTranscriptionProviderMock(): TranscriptionProvider {
  return {
    name: "transcription-mock",
    transcribe: vi.fn(async () => ({
      transcriptText: "This is a transcribed body of text.",
      language: "en",
      warnings: []
    }))
  };
}

function createAudioExtractionServiceMock(): AudioExtractionService {
  return {
    extractAudio: vi.fn(async () => ({
      outputPath: "/tmp/mock-audio.mp3",
      mimeType: "audio/mpeg"
    }))
  };
}

describe("transcriptionController", () => {
  it("returns a success payload for a valid audio upload", async () => {
    const response = createResponseMock();
    const controller = createTranscriptionController({
      transcriptionProvider: createTranscriptionProviderMock(),
      audioExtractionService: createAudioExtractionServiceMock()
    });

    await controller(
      {
        file: {
          path: "/tmp/mock-input.mp3",
          originalname: "clip.mp3",
          mimetype: "audio/mpeg",
          size: 1024
        },
        body: {}
      } as never,
      response as never
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          phase: "transcript_ready",
          sourceType: "audio",
          transcriptionStatus: "transcript_needs_review"
        })
      })
    );
  });
});
