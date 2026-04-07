import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

import ffmpegPath from "ffmpeg-static";

import type { AudioExtractionService } from "./audioExtractionService.js";
import type { ValidatedMediaFile } from "./mediaValidation.js";
import type { TranscriptionSourceType } from "../../schemas/transcriptionSchemas.js";
import { logger } from "../../utils/logger.js";

const execFileAsync = promisify(execFile);
const resolvedFfmpegPath = ffmpegPath as unknown as string | null;

export interface MediaMetadata {
  duration?: number;
  format?: string;
  bitrate?: number;
  sourceType: TranscriptionSourceType;
  audioCodec?: string;
  videoCodec?: string;
  videoWidth?: number;
  videoHeight?: number;
}

export interface MediaPreprocessingResult {
  sourceType: TranscriptionSourceType;
  originalFile: {
    path: string;
    mimeType: string;
    size: number;
  };
  mediaMetadata: MediaMetadata;
  transcriptionInput: {
    filePath: string;
    mimeType: string;
    derivedFrom: "original" | "extracted_audio";
  };
  cleanupPaths: string[];
}

export interface MediaMetadataProbeInput {
  filePath: string;
  mimeType: string;
  size: number;
  sourceType: TranscriptionSourceType;
}

export type MediaMetadataProbe = (
  input: MediaMetadataProbeInput
) => Promise<MediaMetadata>;

export interface MediaPreprocessingDependencies {
  audioExtractionService: AudioExtractionService;
  probeMediaMetadata?: MediaMetadataProbe;
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  bit_rate?: string;
}

interface FfprobeFormat {
  duration?: string;
  bit_rate?: string;
  format_name?: string;
}

interface FfprobePayload {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

function parseNumericValue(value: string | number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
}

async function resolveFfprobePath() {
  if (resolvedFfmpegPath) {
    const directory = path.dirname(resolvedFfmpegPath);
    const extension = path.extname(resolvedFfmpegPath);
    const candidate = path.join(directory, `ffprobe${extension}`);

    try {
      await access(candidate);
      return candidate;
    } catch {
      // Fall through to PATH lookup below.
    }
  }

  return "ffprobe";
}

export const probeMediaMetadata: MediaMetadataProbe = async ({
  filePath,
  mimeType,
  sourceType
}) => {
  const ffprobeBinary = await resolveFfprobePath();
  const { stdout } = await execFileAsync(ffprobeBinary, [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    filePath
  ]);
  const payload = JSON.parse(stdout) as FfprobePayload;
  const streams = payload.streams || [];
  const format = payload.format;
  const audioStream = streams.find((stream) => stream.codec_type === "audio");
  const videoStream = streams.find((stream) => stream.codec_type === "video");

  return {
    duration:
      parseNumericValue(format?.duration) ||
      parseNumericValue(audioStream?.duration) ||
      parseNumericValue(videoStream?.duration),
    format: format?.format_name || mimeType,
    bitrate:
      parseNumericValue(format?.bit_rate) ||
      parseNumericValue(audioStream?.bit_rate) ||
      parseNumericValue(videoStream?.bit_rate),
    sourceType,
    audioCodec: audioStream?.codec_name,
    videoCodec: videoStream?.codec_name,
    videoWidth: typeof videoStream?.width === "number" ? videoStream.width : undefined,
    videoHeight: typeof videoStream?.height === "number" ? videoStream.height : undefined
  };
};

export async function preprocessMediaFile(
  input: {
    filePath: string;
    fileName: string;
    mimeType: string;
    size: number;
    validatedMedia: ValidatedMediaFile;
  },
  dependencies: MediaPreprocessingDependencies
): Promise<MediaPreprocessingResult> {
  const cleanupPaths: string[] = [];
  const sourceType = input.validatedMedia.sourceType;

  let mediaMetadata: MediaMetadata = {
    sourceType,
    format: input.mimeType
  };

  try {
    const probe = dependencies.probeMediaMetadata || probeMediaMetadata;
    mediaMetadata = await probe({
      filePath: input.filePath,
      mimeType: input.mimeType,
      size: input.size,
      sourceType
    });
  } catch (error) {
    logger.error("Failed to probe media metadata before transcription", {
      fileName: input.fileName,
      filePath: input.filePath,
      error
    });
  }

  let transcriptionInput: MediaPreprocessingResult["transcriptionInput"] = {
    filePath: input.filePath,
    mimeType: input.validatedMedia.normalizedMimeType,
    derivedFrom: "original"
  };

  if (sourceType === "video") {
    const extractedAudio = await dependencies.audioExtractionService.extractAudio({
      sourcePath: input.filePath
    });
    cleanupPaths.push(extractedAudio.outputPath);
    transcriptionInput = {
      filePath: extractedAudio.outputPath,
      mimeType: extractedAudio.mimeType,
      derivedFrom: "extracted_audio"
    };
  }

  return {
    sourceType,
    originalFile: {
      path: input.filePath,
      mimeType: input.mimeType,
      size: input.size
    },
    mediaMetadata,
    transcriptionInput,
    cleanupPaths
  };
}
