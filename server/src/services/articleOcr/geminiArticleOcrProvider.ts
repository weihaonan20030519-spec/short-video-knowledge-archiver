import { GoogleGenAI } from "@google/genai";

import type { ArticleOcrProvider, ArticleOcrRequest, ArticleOcrResult, ArticleOcrImageResult } from "./articleOcrProvider.js";
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
    const imageResults: ArticleOcrImageResult[] = [];
    const warnings: ArticleImportWarning[] = [];

    for (const image of request.images) {
      const ordinal = imageResults.length + 1;
      try {
        console.log(`[OCR DEBUG] Processing image ${ordinal}: ${image.url}`);
        const imagePayload = await fetchImageAsBase64(image.url);
        console.log(`[OCR DEBUG] Fetched image mimeType: ${imagePayload.mimeType}, base64 length: ${imagePayload.base64.length}`);

        const prompt = [
          "Extract only the visible text from the image below.",
          "Do not summarize, translate, or add commentary.",
          request.originalUrl ? `Source page: ${request.originalUrl}` : "Source page: unknown",
          request.resolvedUrl ? `Resolved URL: ${request.resolvedUrl}` : "Resolved URL: unknown",
          "Return only the extracted text in plain form."
        ].join("\n");

        const contents = [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: imagePayload.mimeType,
                  data: imagePayload.base64
                }
              }
            ]
          }
        ];

        console.log(`[OCR DEBUG] Request payload structure: contents with ${contents.length} items, each with role and parts, model: ${env.ARTICLE_OCR_MODEL}`);

        const result = await client.models.generateContent({
          model: env.ARTICLE_OCR_MODEL,
          contents,
          config: {
            temperature: 0,
            responseMimeType: "text/plain"
          }
        });

        console.log(`[OCR DEBUG] Gemini response object keys: ${Object.keys(result).join(', ')}`);
        if ((result as any).response) {
          console.log(`[OCR DEBUG] Response has text method: ${typeof (result as any).response.text}`);
        }

        const imageText = normalizeWhitespace(result.text);
        console.log(`[OCR DEBUG] Extracted text length: ${imageText?.length ?? 0}`);

        if (imageText) {
          imageResults.push({
            ordinal,
            imageUrl: image.url,
            source: image.source,
            succeeded: true,
            text: imageText
          });
        } else {
          const warningMessage = `Image OCR succeeded for ${image.url} but no text was detected.`;
          imageResults.push({
            ordinal,
            imageUrl: image.url,
            source: image.source,
            succeeded: false,
            text: null,
            warningCode: "OCR_NO_TEXT_DETECTED",
            warningMessage
          });
          warnings.push(createWarning("OCR_NO_TEXT_DETECTED", warningMessage));
        }
      } catch (error: any) {
        console.log(`[OCR DEBUG] Error for image ${image.url}:`, {
          message: error?.message,
          code: error?.code,
          status: error?.status,
          stack: error?.stack?.split('\n')[0]
        });
        let warningMessage = `Image OCR failed for ${image.url}.`;
        if (error.message === "IMAGE_TOO_LARGE") {
          warningMessage += " The image is too large.";
        } else if (error.message === "IMAGE_UNSUPPORTED_CONTENT_TYPE") {
          warningMessage += " The image format is not supported.";
        } else if (error.message === "IMAGE_URL_BLOCKED") {
          warningMessage += " The image URL is blocked for security reasons.";
        } else if (error.message === "IMAGE_FETCH_FAILED") {
          warningMessage += " The image could not be fetched.";
        } else if (error.message === "IMAGE_TOO_MANY_REDIRECTS") {
          warningMessage += " The image URL has too many redirects.";
        } else if (error.message === "IMAGE_REDIRECT_WITHOUT_LOCATION") {
          warningMessage += " The image redirect is invalid.";
        } else if (error.message === "IMAGE_BODY_EMPTY") {
          warningMessage += " The image data is empty.";
        } else {
          warningMessage += ` An unexpected error occurred during OCR: ${error?.message || 'Unknown error'}.`;
        }
        imageResults.push({
          ordinal,
          imageUrl: image.url,
          source: image.source,
          succeeded: false,
          text: null,
          warningCode: "OCR_NO_TEXT_DETECTED",
          warningMessage
        });
        warnings.push(createWarning("OCR_NO_TEXT_DETECTED", warningMessage));
      }
    }

    const successfulImageText = imageResults
      .filter((result) => result.succeeded && result.text)
      .map((result) => `[Image OCR ${result.ordinal}]\n${result.text}`);
    const recognizedText = successfulImageText.length > 0 ? successfulImageText.join("\n\n") : null;
    const recognizedTextLength = recognizedText?.length ?? 0;
    const succeededCount = imageResults.filter((result) => result.succeeded).length;

    return {
      attempted: imageResults.length,
      providerAvailable: true,
      succeededCount,
      recognizedText,
      recognizedTextLength,
      warnings,
      imageResults
    };
  }
}
