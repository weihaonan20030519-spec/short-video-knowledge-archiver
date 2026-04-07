import { ensureSafeUrl } from "../../utils/safeUrl.js";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const MAX_IMAGE_DOWNLOAD_BYTES = 5_000_000;
const MAX_IMAGE_REDIRECTS = 3;
const SUPPORTED_IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/bmp",
  "image/tiff"
]);

type Fetcher = typeof fetch;

function parseContentType(contentTypeHeader: string | null) {
  if (!contentTypeHeader) {
    return null;
  }

  return contentTypeHeader.split(";")[0].trim().toLowerCase() || null;
}

export async function fetchImageAsBase64(imageUrl: string, fetcher: Fetcher = fetch, timeoutMs = 8000) {
  let currentUrl = imageUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let redirectCount = 0; redirectCount <= MAX_IMAGE_REDIRECTS; redirectCount += 1) {
      const resolvedUrl = new URL(currentUrl);
      if (!ensureSafeUrl(resolvedUrl)) {
        throw new Error("IMAGE_URL_BLOCKED");
      }

      const response = await fetcher(currentUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "image/*"
        },
        redirect: "manual"
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("IMAGE_REDIRECT_WITHOUT_LOCATION");
        }

        if (redirectCount >= MAX_IMAGE_REDIRECTS) {
          throw new Error("IMAGE_TOO_MANY_REDIRECTS");
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error("IMAGE_FETCH_FAILED");
      }

      const contentType = parseContentType(response.headers.get("content-type"));
      if (!contentType || !SUPPORTED_IMAGE_CONTENT_TYPES.has(contentType)) {
        throw new Error("IMAGE_UNSUPPORTED_CONTENT_TYPE");
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && Number(contentLengthHeader) > MAX_IMAGE_DOWNLOAD_BYTES) {
        throw new Error("IMAGE_TOO_LARGE");
      }

      if (!response.body) {
        throw new Error("IMAGE_BODY_EMPTY");
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytesRead = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (value) {
            bytesRead += value.byteLength;
            if (bytesRead > MAX_IMAGE_DOWNLOAD_BYTES) {
              throw new Error("IMAGE_TOO_LARGE");
            }
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }

      const buffer = Buffer.concat(chunks);
      return {
        base64: buffer.toString("base64"),
        mimeType: contentType
      };
    }

    throw new Error("IMAGE_TOO_MANY_REDIRECTS");
  } finally {
    clearTimeout(timeout);
  }
}
