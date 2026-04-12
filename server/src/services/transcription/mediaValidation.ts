import path from "node:path";

import type { TranscriptionSourceType } from "../../schemas/transcriptionSchemas.js";

export const SUPPORTED_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "aac", "ogg"] as const;
export const SUPPORTED_VIDEO_EXTENSIONS = ["mp4", "mov", "webm"] as const;
export const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg"
] as const;
export const SUPPORTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm"
] as const;

export interface ValidatedMediaFile {
  sourceType: TranscriptionSourceType;
  normalizedMimeType: string;
  extension: string;
}

function normalizeExtension(fileName: string) {
  return path.extname(fileName).replace(".", "").toLowerCase();
}

function isAudioMimeType(mimeType: string) {
  return SUPPORTED_AUDIO_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_AUDIO_MIME_TYPES)[number]);
}

function isVideoMimeType(mimeType: string) {
  return SUPPORTED_VIDEO_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_VIDEO_MIME_TYPES)[number]);
}

function resolveAudioMimeType(extension: string, mimeType: string) {
  if (extension === "m4a") {
    return "audio/mp4";
  }

  if (isAudioMimeType(mimeType)) {
    return mimeType;
  }

  return "audio/mpeg";
}

export function validateMediaFile(fileName: string, mimeType: string): ValidatedMediaFile | null {
  const extension = normalizeExtension(fileName);
  const normalizedMimeType = mimeType.toLowerCase();

  if (
    SUPPORTED_AUDIO_EXTENSIONS.includes(extension as (typeof SUPPORTED_AUDIO_EXTENSIONS)[number]) ||
    isAudioMimeType(normalizedMimeType)
  ) {
    return {
      sourceType: "audio",
      normalizedMimeType: resolveAudioMimeType(extension, normalizedMimeType),
      extension
    };
  }

  if (
    SUPPORTED_VIDEO_EXTENSIONS.includes(extension as (typeof SUPPORTED_VIDEO_EXTENSIONS)[number]) ||
    isVideoMimeType(normalizedMimeType)
  ) {
    return {
      sourceType: "video",
      normalizedMimeType: isVideoMimeType(normalizedMimeType) ? normalizedMimeType : "video/mp4",
      extension
    };
  }

  return null;
}
