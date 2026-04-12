import { ensureSafeUrl } from "../../utils/safeUrl.js";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const MAX_IMAGE_DOWNLOAD_BYTES = 5_000_000;
const MAX_IMAGE_REDIRECTS = 3;
const SUPPORTED_IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
]);

type Fetcher = typeof fetch;

function parseContentType(contentTypeHeader: string | null) {
  if (!contentTypeHeader) {
    return null;
  }

  return contentTypeHeader.split(";")[0].trim().toLowerCase() || null;
}

function getImageHost(imageUrl: string) {
  try {
    return new URL(imageUrl).hostname;
  } catch {
    return null;
  }
}

function createImageFetchError(
  code: "IMAGE_URL_BLOCKED" | "IMAGE_REDIRECT_WITHOUT_LOCATION" | "IMAGE_TOO_MANY_REDIRECTS" | "IMAGE_FETCH_FAILED" | "IMAGE_UNSUPPORTED_CONTENT_TYPE" | "IMAGE_TOO_LARGE" | "IMAGE_BODY_EMPTY",
  imageUrl: string,
  details: {
    mimeType?: string | null;
    contentLength?: number | null;
  } = {}
) {
  return Object.assign(new Error(code), {
    imageUrl,
    imageHost: getImageHost(imageUrl),
    mimeType: details.mimeType ?? null,
    contentLength: details.contentLength ?? null
  });
}

export async function fetchImageAsBase64(imageUrl: string, fetcher: Fetcher = fetch, timeoutMs = 8000) {
  let currentUrl = imageUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let redirectCount = 0; redirectCount <= MAX_IMAGE_REDIRECTS; redirectCount += 1) {
      const resolvedUrl = new URL(currentUrl);
      if (!ensureSafeUrl(resolvedUrl)) {
        throw createImageFetchError("IMAGE_URL_BLOCKED", currentUrl);
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
          throw createImageFetchError("IMAGE_REDIRECT_WITHOUT_LOCATION", currentUrl);
        }

        if (redirectCount >= MAX_IMAGE_REDIRECTS) {
          throw createImageFetchError("IMAGE_TOO_MANY_REDIRECTS", currentUrl);
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw createImageFetchError("IMAGE_FETCH_FAILED", currentUrl);
      }

      const contentType = parseContentType(response.headers.get("content-type"));
      if (!contentType || !SUPPORTED_IMAGE_CONTENT_TYPES.has(contentType)) {
        throw createImageFetchError("IMAGE_UNSUPPORTED_CONTENT_TYPE", currentUrl, { mimeType: contentType });
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && Number(contentLengthHeader) > MAX_IMAGE_DOWNLOAD_BYTES) {
        throw createImageFetchError("IMAGE_TOO_LARGE", currentUrl, {
          mimeType: contentType,
          contentLength: Number(contentLengthHeader)
        });
      }

      if (!response.body) {
        throw createImageFetchError("IMAGE_BODY_EMPTY", currentUrl, { mimeType: contentType });
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
              throw createImageFetchError("IMAGE_TOO_LARGE", currentUrl, {
                mimeType: contentType,
                contentLength: bytesRead
              });
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

    throw createImageFetchError("IMAGE_TOO_MANY_REDIRECTS", currentUrl);
  } finally {
    clearTimeout(timeout);
  }
}
