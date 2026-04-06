import { GoogleGenAI, FileState, createPartFromText, createPartFromUri } from "@google/genai";

import type { TranscriptionProvider, TranscriptionProviderInput } from "./transcriptionProvider.js";
import { transcriptionProviderOutputSchema } from "../../schemas/transcriptionSchemas.js";
import { ApiError } from "../../utils/errors.js";
import { env, requireGeminiKey } from "../../utils/env.js";

const FILE_READY_POLL_INTERVAL_MS = 750;
const FILE_READY_POLL_ATTEMPTS = 20;

function buildTranscriptionPrompt(languageHint?: string | null) {
  return [
    "You are transcribing a user-uploaded audio or video file into clean readable text.",
    "Return JSON only.",
    'Use this JSON shape: {"transcriptText":"string","language":"string|null","warnings":["string"],"segments":[{"startMs":0,"endMs":0,"text":"string"}],"timestamps":[{"startMs":0,"endMs":0,"label":"string"}]}',
    "Requirements:",
    "- transcriptText must be the full transcript in plain text",
    "- language should be a BCP-47 or ISO-style language code when confidently known, otherwise null",
    "- warnings should be an array of short strings only when something is uncertain",
    "- segments and timestamps are optional; omit them if they are not reliable",
    "- do not summarize, translate, or reorganize the content",
    languageHint ? `Language hint: ${languageHint}` : "Language hint: none"
  ].join("\n");
}

async function waitForUploadedFile(client: GoogleGenAI, fileName: string) {
  for (let attempt = 0; attempt < FILE_READY_POLL_ATTEMPTS; attempt += 1) {
    const uploaded = await client.files.get({ name: fileName });
    if (uploaded.state === FileState.ACTIVE || uploaded.state == null) {
      return uploaded;
    }

    if (uploaded.state === FileState.FAILED) {
      throw new ApiError(
        "TRANSCRIPTION_FAILED",
        uploaded.error?.message || "The uploaded file failed during Gemini processing",
        502
      );
    }

    await new Promise((resolve) => {
      setTimeout(resolve, FILE_READY_POLL_INTERVAL_MS);
    });
  }

  throw new ApiError("TRANSCRIPTION_FAILED", "Timed out waiting for Gemini file processing", 504);
}

function parseTranscriptionPayload(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    throw new ApiError("TRANSCRIPTION_FAILED", "Gemini returned invalid transcription JSON", 502);
  }
}

export class GeminiTranscriptionProvider implements TranscriptionProvider {
  readonly name = "gemini";

  async transcribe(input: TranscriptionProviderInput) {
    const client = new GoogleGenAI({
      apiKey: requireGeminiKey("transcription")
    });

    const uploadedFile = await client.files.upload({
      file: input.filePath,
      config: {
        mimeType: input.mimeType
      }
    });

    try {
      const readyFile = await waitForUploadedFile(client, uploadedFile.name || "");

      if (!readyFile.uri || !readyFile.mimeType) {
        throw new ApiError("TRANSCRIPTION_FAILED", "Gemini did not return a usable media file URI", 502);
      }

      const response = await client.models
        .generateContent({
          model: env.GEMINI_MODEL_TRANSCRIPTION,
          contents: [
            {
              role: "user",
              parts: [
                createPartFromText(buildTranscriptionPrompt(input.languageHint)),
                createPartFromUri(readyFile.uri, readyFile.mimeType)
              ]
            }
          ],
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
        .catch((error) => {
          throw new ApiError(
            "TRANSCRIPTION_FAILED",
            error instanceof Error ? error.message : "Gemini transcription failed",
            502
          );
        });

      const content = response.text;

      if (!content) {
        throw new ApiError("TRANSCRIPTION_FAILED", "Gemini returned an empty transcription response", 502);
      }

      const parsed = transcriptionProviderOutputSchema.safeParse(parseTranscriptionPayload(content));

      if (!parsed.success) {
        throw new ApiError("TRANSCRIPTION_FAILED", "Gemini transcription response was invalid", 502);
      }

      return parsed.data;
    } finally {
      if (uploadedFile.name) {
        await client.files.delete({ name: uploadedFile.name }).catch(() => undefined);
      }
    }
  }
}
