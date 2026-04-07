import { GoogleGenAI } from "@google/genai";

import type { ArticleOcrProvider, ArticleOcrRequest, ArticleOcrResult } from "./articleOcrProvider.js";
import type { ArticleImportWarning, ArticleImportWarningCode } from "../../schemas/articleImportSchemas.js";
import { env, requireGeminiKey } from "../../utils/env.js";
import { fetchImageAsBase64 } from "./imageFetchHelper.js";

function normalizeWhitespace(input?: string | null) {
  return input?.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
}

function createWarning(code: ArticleImportWarningCode, message: string): ArticleImportWarning {
  return { code, message };
}

export class GeminiArticleOcrProvider implements ArticleOcrProvider {
  readonly providerAvailable = true;

  async extractText(request: ArticleOcrRequest): Promise<ArticleOcrResult> {
    const client = new GoogleGenAI({ apiKey: requireGeminiKey("transcription") });
    const imageTexts: string[] = [];
    const warnings: ArticleImportWarning[] = [];
    let succeededCount = 0;

    for (const image of request.images) {
      try {
        const imagePayload = await fetchImageAsBase64(image.url);
        const prompt = [
          "Extract only the visible text from the image below.",
          "Do not summarize, translate, or add commentary.",
          request.originalUrl ? `Source page: ${request.originalUrl}` : "Source page: unknown",
          request.resolvedUrl ? `Resolved URL: ${request.resolvedUrl}` : "Resolved URL: unknown",
          "Return only the extracted text in plain form."
        ].join("\n");

        const contents: any = [
          { text: prompt, type: "text" },
          {
            type: "image",
            data: imagePayload.base64,
            mime_type: imagePayload.mimeType
          }
        ];

        const result = await client.models.generateContent({
          model: env.GEMINI_MODEL_TRANSCRIPTION,
          contents,
          config: {
            temperature: 0,
            responseMimeType: "text/plain"
          }
        });

        const imageText = normalizeWhitespace(result.text ?? result.data ?? "");
        if (imageText) {
          imageTexts.push(imageText);
          succeededCount += 1;
        }
      } catch (error) {
        warnings.push(
          createWarning(
            "OCR_NO_TEXT_DETECTED",
            `Image OCR failed for ${image.url}. The image may be unsupported or unavailable.`
          )
        );
      }
    }

    const recognizedText = normalizeWhitespace(imageTexts.join("\n\n"));
    const recognizedTextLength = recognizedText?.length ?? 0;

    return {
      attempted: request.images.length,
      providerAvailable: true,
      succeededCount,
      recognizedText,
      recognizedTextLength,
      warnings
    };
  }
}
