import { describe, expect, it, vi } from "vitest";

import { transcribeUploadedFile } from "./transcriptionService.js";
import type { AudioExtractionService } from "./audioExtractionService.js";
import type { TranscriptionProvider } from "./transcriptionProvider.js";
import { ApiError } from "../../utils/errors.js";

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

describe("transcribeUploadedFile", () => {
  it("returns transcript text for an audio upload", async () => {
    const transcriptionProvider = createTranscriptionProviderMock();

    const result = await transcribeUploadedFile(
      {
        path: "/tmp/mock-input.mp3",
        originalname: "clip.mp3",
        mimetype: "audio/mpeg",
        size: 1024
      },
      {},
      {
        transcriptionProvider,
        audioExtractionService: createAudioExtractionServiceMock()
      }
    );

    expect(result.sourceType).toBe("audio");
    expect(result.transcriptText).toContain("transcribed body");
    expect(transcriptionProvider.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "audio",
        fileName: "clip.mp3"
      })
    );
  });

  it("extracts audio before transcribing a video upload", async () => {
    const transcriptionProvider = createTranscriptionProviderMock();
    const audioExtractionService = createAudioExtractionServiceMock();

    const result = await transcribeUploadedFile(
      {
        path: "/tmp/mock-input.mp4",
        originalname: "demo.mp4",
        mimetype: "video/mp4",
        size: 2048
      },
      {},
      {
        transcriptionProvider,
        audioExtractionService
      }
    );

    expect(result.sourceType).toBe("video");
    expect(audioExtractionService.extractAudio).toHaveBeenCalledTimes(1);
    expect(transcriptionProvider.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "video",
        mimeType: "audio/mpeg"
      })
    );
  });

  it("rejects unsupported file formats with a clear error", async () => {
    await expect(
      transcribeUploadedFile(
        {
          path: "/tmp/mock-input.txt",
          originalname: "notes.txt",
          mimetype: "text/plain",
          size: 32
        },
        {},
        {
          transcriptionProvider: createTranscriptionProviderMock(),
          audioExtractionService: createAudioExtractionServiceMock()
        }
      )
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_FORMAT",
      status: 415
    });
  });

  it("surfaces provider failures as stable transcription errors when provider throws ApiError", async () => {
    const transcriptionProvider: TranscriptionProvider = {
      name: "transcription-mock",
      transcribe: vi.fn(async () => {
        throw new ApiError("TRANSCRIPTION_FAILED", "Provider unavailable", 502);
      })
    };

    await expect(
      transcribeUploadedFile(
        {
          path: "/tmp/mock-input.mp3",
          originalname: "clip.mp3",
          mimetype: "audio/mpeg",
          size: 1024
        },
        {},
        {
          transcriptionProvider,
          audioExtractionService: createAudioExtractionServiceMock()
        }
      )
    ).rejects.toMatchObject({
      code: "TRANSCRIPTION_FAILED",
      status: 502
    });
  });
});
