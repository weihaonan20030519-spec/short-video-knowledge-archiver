import type {
  TranscriptionErrorCode,
  TranscriptionSourceType,
  TranscriptionStatus
} from "../../types/api";
import type { TranscriptSegment, TranscriptTimestamp } from "../../types/domain";

export const TRANSCRIPTION_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const TRANSCRIPTION_RECOMMENDED_MAX_MINUTES = 15;
export const SUPPORTED_TRANSCRIPTION_ACCEPT = ".mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.webm";

const SUPPORTED_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "mp4", "mov", "webm"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg"]);

export interface ClientTranscriptMeta {
  fileName: string;
  mimeType: string;
  size: number;
  duration?: number;
  language?: string | null;
  segments?: TranscriptSegment[];
  timestamps?: TranscriptTimestamp[];
  provider?: string | null;
  warnings?: string[];
}

export interface ClientTranscriptionResult {
  sourceType: TranscriptionSourceType;
  suggestedTitle: string;
  transcriptText: string;
  transcriptionStatus: TranscriptionStatus;
  transcriptMeta: ClientTranscriptMeta;
  warnings: string[];
}

export interface ClientTranscriptionError {
  code: TranscriptionErrorCode;
  message: string;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() || "" : "";
}

export function inferSourceTypeFromFileName(fileName: string): TranscriptionSourceType | null {
  const extension = getFileExtension(fileName);

  if (AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  if (SUPPORTED_EXTENSIONS.has(extension)) {
    return "video";
  }

  return null;
}

export function isSupportedTranscriptionFile(file: File) {
  return inferSourceTypeFromFileName(file.name) !== null;
}
