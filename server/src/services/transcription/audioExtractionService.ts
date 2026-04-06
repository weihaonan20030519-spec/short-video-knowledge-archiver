import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import ffmpegPath from "ffmpeg-static";

import { ApiError } from "../../utils/errors.js";

const execFileAsync = promisify(execFile);
const resolvedFfmpegPath = ffmpegPath as unknown as string | null;

export interface AudioExtractionInput {
  sourcePath: string;
}

export interface AudioExtractionResult {
  outputPath: string;
  mimeType: string;
}

export interface AudioExtractionService {
  extractAudio(input: AudioExtractionInput): Promise<AudioExtractionResult>;
}

export class FfmpegAudioExtractionService implements AudioExtractionService {
  async extractAudio({ sourcePath }: AudioExtractionInput): Promise<AudioExtractionResult> {
    if (!resolvedFfmpegPath) {
      throw new ApiError("AUDIO_EXTRACTION_FAILED", "ffmpeg is not available for audio extraction", 500);
    }

    const outputPath = path.join(tmpdir(), `svka-audio-${crypto.randomUUID()}.mp3`);

    try {
      await execFileAsync(resolvedFfmpegPath, [
        "-y",
        "-i",
        sourcePath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ar",
        "16000",
        "-ac",
        "1",
        outputPath
      ]);
    } catch (error) {
      throw new ApiError(
        "AUDIO_EXTRACTION_FAILED",
        error instanceof Error ? error.message : "Failed to extract audio from video",
        422
      );
    }

    return {
      outputPath,
      mimeType: "audio/mpeg"
    };
  }
}
