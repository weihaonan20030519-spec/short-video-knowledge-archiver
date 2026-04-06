import type {
  TranscriptionProviderOutput,
  TranscriptionSourceType
} from "../../schemas/transcriptionSchemas.js";

export interface TranscriptionProviderInput {
  filePath: string;
  mimeType: string;
  fileName: string;
  sourceType: TranscriptionSourceType;
  languageHint?: string | null;
}

export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: TranscriptionProviderInput): Promise<TranscriptionProviderOutput>;
}
