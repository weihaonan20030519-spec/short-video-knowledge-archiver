import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";

vi.mock("./services/transcription/providerSelection.js", () => ({
  createAnalysisProvider: () => ({
    name: "qwen",
    analyze: vi.fn()
  }),
  createTranscriptionProvider: () => ({
    name: "gemini",
    transcribe: vi.fn()
  })
}));

vi.mock("./services/articleOcr/providerSelection.js", () => ({
  createArticleOcrProvider: () => ({
    name: "noop",
    extractText: vi.fn()
  })
}));

function createOptionsRequest(origin: string) {
  const req = new EventEmitter() as any;
  req.method = "OPTIONS";
  req.url = "/api/transcribe/file";
  req.headers = {
    origin,
    "access-control-request-method": "POST",
    "access-control-request-headers": "content-type"
  };
  return req;
}

function createResponseMock() {
  const res = new EventEmitter() as any;
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = vi.fn((name: string, value: string) => {
    res.headers[name.toLowerCase()] = value;
  });
  res.getHeader = vi.fn((name: string) => res.headers[name.toLowerCase()]);
  res.writeHead = vi.fn((statusCode: number, headers?: Record<string, string>) => {
    res.statusCode = statusCode;
    if (headers) {
      for (const [name, value] of Object.entries(headers)) {
        res.headers[name.toLowerCase()] = value;
      }
    }
    return res;
  });
  res.end = vi.fn(() => {
    res.emit("finish");
    return res;
  });
  return res;
}

describe("app cors", () => {
  it("returns cors headers for localhost preflight requests", async () => {
    const app = createApp();
    const req = createOptionsRequest("http://localhost:5175");
    const res = createResponseMock();

    const finished = new Promise<void>((resolve) => {
      res.once("finish", resolve);
    });

    app(req, res);
    await finished;

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5175");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-headers"]).toContain("content-type");
  });

  it("returns cors headers for the current vercel preview origin", async () => {
    const app = createApp();
    const req = createOptionsRequest("https://short-video-knowledge-archiver-lw7l7wkkv.vercel.app");
    const res = createResponseMock();

    const finished = new Promise<void>((resolve) => {
      res.once("finish", resolve);
    });

    app(req, res);
    await finished;

    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://short-video-knowledge-archiver-lw7l7wkkv.vercel.app"
    );
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-headers"]).toContain("content-type");
  });
});
