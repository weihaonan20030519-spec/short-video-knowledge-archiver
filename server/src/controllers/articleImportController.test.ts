import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const { importArticleContentMock, loggerErrorMock } = vi.hoisted(() => ({
  importArticleContentMock: vi.fn(),
  loggerErrorMock: vi.fn()
}));

vi.mock("../services/articleImportService.js", () => ({
  importArticleContent: importArticleContentMock
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    error: loggerErrorMock
  }
}));

import { createArticleImportController } from "./articleImportController.js";
import { articleImportRequestSchema } from "../schemas/articleImportSchemas.js";
import type { ArticleOcrProvider } from "../services/articleOcr/articleOcrProvider.js";

function createResponseMock() {
  const json = vi.fn();
  const statusJson = vi.fn();
  const status = vi.fn(() => ({ json: statusJson }));
  return {
    json,
    status,
    statusJson
  };
}

const noopOcrProvider: ArticleOcrProvider = {
  providerAvailable: false,
  extractText: vi.fn()
};

describe("articleImportController", () => {
  it("logs structured context when validation fails", async () => {
    importArticleContentMock.mockRejectedValueOnce(articleImportRequestSchema.safeParse({ url: "not-a-url" }).error);
    const response = createResponseMock();
    const controller = createArticleImportController(noopOcrProvider);

    await controller(
      {
        body: {
          url: "not-a-url"
        }
      } as never,
      response as never
    );

    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Article import request failed",
      expect.objectContaining({
        url: "not-a-url",
        errorName: "ZodError",
        errorMessage: expect.any(String),
        stack: expect.any(String)
      })
    );
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it("logs request url, error name, message, stack, and code for internal failures", async () => {
    const error = new Error("Fetch exploded") as Error & { code?: string };
    error.name = "FetchError";
    error.code = "UND_ERR_CONNECT_TIMEOUT";
    error.stack = "FetchError: Fetch exploded\n    at articleImport";

    importArticleContentMock.mockRejectedValueOnce(error);
    const response = createResponseMock();
    const controller = createArticleImportController(noopOcrProvider);

    await controller(
      {
        body: {
          url: "https://example.com/article"
        }
      } as never,
      response as never
    );

    expect(loggerErrorMock).toHaveBeenCalledWith(
      "Article import request failed",
      {
        url: "https://example.com/article",
        errorName: "FetchError",
        errorMessage: "Fetch exploded",
        errorCode: "UND_ERR_CONNECT_TIMEOUT",
        stack: "FetchError: Fetch exploded\n    at articleImport"
      }
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.statusJson).toHaveBeenCalledWith({
      success: false,
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    });
  });
});
