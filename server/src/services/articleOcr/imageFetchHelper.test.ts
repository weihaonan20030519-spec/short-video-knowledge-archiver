import { describe, expect, it, vi } from "vitest";

import { fetchImageAsBase64 } from "./imageFetchHelper.js";

function createImageResponse(contentType: string, body = "image-binary") {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.length)
    }
  });
}

describe("fetchImageAsBase64", () => {
  it("accepts stable Gemini-friendly image content types", async () => {
    const fetcher = vi.fn(async () => createImageResponse("image/webp"));

    const result = await fetchImageAsBase64("https://example.com/image.webp", fetcher, 200);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.mimeType).toBe("image/webp");
    expect(result.base64).toBe(Buffer.from("image-binary").toString("base64"));
  });

  it("rejects heic inputs before they reach Gemini OCR", async () => {
    const fetcher = vi.fn(async () => createImageResponse("image/heic"));

    await expect(fetchImageAsBase64("https://example.com/image.heic", fetcher, 200)).rejects.toMatchObject({
      message: "IMAGE_UNSUPPORTED_CONTENT_TYPE",
      imageHost: "example.com",
      mimeType: "image/heic"
    });
  });

  it("rejects bmp inputs before they reach Gemini OCR", async () => {
    const fetcher = vi.fn(async () => createImageResponse("image/bmp"));

    await expect(fetchImageAsBase64("https://example.com/image.bmp", fetcher, 200)).rejects.toMatchObject({
      message: "IMAGE_UNSUPPORTED_CONTENT_TYPE",
      imageHost: "example.com",
      mimeType: "image/bmp"
    });
  });

  it("rejects tiff inputs before they reach Gemini OCR", async () => {
    const fetcher = vi.fn(async () => createImageResponse("image/tiff"));

    await expect(fetchImageAsBase64("https://example.com/image.tiff", fetcher, 200)).rejects.toMatchObject({
      message: "IMAGE_UNSUPPORTED_CONTENT_TYPE",
      imageHost: "example.com",
      mimeType: "image/tiff"
    });
  });
});
