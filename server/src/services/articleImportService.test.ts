import { describe, expect, it, vi } from "vitest";

import { importArticleContent } from "./articleImportService.js";

describe("articleImportService", () => {
  it("returns readability content when the page body is extractable", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <head>
              <title>Example Article</title>
              <meta name="description" content="Short summary" />
            </head>
            <body>
              <article>
                <h1>Example Article</h1>
                <p>This is the first paragraph of a readable article body.</p>
                <p>This is the second paragraph with enough text to count as reusable source content for the archiver.</p>
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/article"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.fetchSucceeded).toBe(true);
    expect(result.extractionMethod).toBe("readability");
    expect(result.title).toBe("Example Article");
    expect(result.contentText).toContain("first paragraph");
    expect(result.warnings).toEqual([]);
    expect(result.extractionReport.coverageLevel).toBe("full");
    expect(result.extractionReport.ocrStatus).toBe("not_applicable");
  });

  it("falls back to meta description when no readable body is available", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <head>
              <title>Note Card</title>
              <meta property="og:description" content="Only a small visible summary is available." />
            </head>
            <body><div id="app"></div></body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://www.xiaohongshu.com/explore/abc123"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.fetchSucceeded).toBe(true);
    expect(result.extractionMethod).toBe("meta_fallback");
    expect(result.platform).toBe("xiaohongshu");
    expect(result.contentText).toBe("Only a small visible summary is available.");
    expect(result.warnings.map((warning) => warning.code)).toEqual(["META_ONLY", "MANUAL_COMPLETION_REQUIRED"]);
    expect(result.extractionReport.coverageLevel).toBe("minimal");
  });

  it("blocks unsafe local targets before issuing a fetch", async () => {
    const fetcher = vi.fn();

    const result = await importArticleContent(
      {
        url: "http://127.0.0.1:3000/private"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.fetchSucceeded).toBe(false);
    expect(result.warnings[0]?.code).toBe("SECURITY_BLOCKED");
  });

  it("stops following redirects after the configured limit", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return new Response(null, {
        status: 302,
        headers: {
          location: `${url}/next`
        }
      });
    });

    const result = await importArticleContent(
      {
        url: "https://example.com/start"
      },
      {
        fetcher,
        timeoutMs: 200,
        maxRedirects: 1
      }
    );

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.fetchSucceeded).toBe(false);
    expect(result.warnings[0]?.code).toBe("TOO_MANY_REDIRECTS");
  });

  it("rejects unsupported content types without sending them to readability", async () => {
    const fetcher = vi.fn(async () =>
      new Response("%PDF-1.7", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf"
        }
      })
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/file.pdf"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.fetchSucceeded).toBe(true);
    expect(result.extractionMethod).toBe("none");
    expect(result.warnings[0]?.code).toBe("UNSUPPORTED_CONTENT_TYPE");
  });

  it("stops reading oversized responses", async () => {
    const fetcher = vi.fn(async () =>
      new Response("<html><body>too large</body></html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Content-Length": "999999"
        }
      })
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/heavy"
      },
      {
        fetcher,
        timeoutMs: 200,
        maxResponseBytes: 1000
      }
    );

    expect(result.fetchSucceeded).toBe(true);
    expect(result.contentText).toBeNull();
    expect(result.warnings[0]?.code).toBe("CONTENT_TOO_LARGE");
  });

  it("keeps coverage conservative when full html text is present but body images were not OCRed", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <body>
              <article>
                <p>这是足够长的网页正文内容，用来覆盖完整长度阈值，并验证即使网页文本本身足够，检测到可能承载正文的图片后也不能轻易标记为 full。这里继续补充更多句子、步骤说明和案例背景，让正文长度稳定超过完整阈值。再补充一段复盘、结论和适用情境，确保正文提取本身已经明显完整。</p>
                <img src="https://cdn.example.com/note-1.jpg" width="1080" height="1440" alt="图文正文长图" />
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://www.xiaohongshu.com/explore/abc123"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionMethod).toBe("readability");
    expect(result.extractionReport.imageSignalsFound).toBe(1);
    expect(result.extractionReport.candidateImagesSelected).toBe(1);
    expect(result.extractionReport.coverageLevel).toBe("partial");
    expect(result.extractionReport.ocrStatus).toBe("provider_unavailable");
    expect(result.warnings.map((warning) => warning.code)).toContain("OCR_PROVIDER_UNAVAILABLE");
  });

  it("detects image-reliant pages outside xiaohongshu and avoids reporting them as full", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <body>
              <article>
                <p>只有一小段说明文本。</p>
                <img src="https://cdn.example.com/page-1.jpg" width="900" height="1200" alt="步骤图一" />
                <img src="https://cdn.example.com/page-2.jpg" width="900" height="1200" alt="步骤图二" />
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/guide"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionReport.imageSignalsFound).toBe(2);
    expect(result.extractionReport.candidateImagesSelected).toBe(2);
    expect(result.extractionReport.coverageLevel).toBe("limited");
    expect(result.extractionReport.ocrStatus).toBe("provider_unavailable");
  });

  it("returns OCR_NOT_ATTEMPTED when the page includes a likely body image but html already appears sufficient", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <body>
              <article>
                <p>This article already contains enough body text to be considered complete for the current import flow, even though it also includes one large illustrative image. The image should still be reported, but OCR should not be treated as required in this specific case. Additional body text keeps the extracted content comfortably above the full threshold, with extra detail about workflow, caveats, and implementation steps to make the text length unambiguously sufficient.</p>
                <img src="https://cdn.example.com/illustration.jpg" width="1024" height="768" alt="Long illustration" />
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/post"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionReport.imageSignalsFound).toBe(1);
    expect(result.extractionReport.candidateImagesSelected).toBe(1);
    expect(result.extractionReport.ocrStatus).toBe("not_attempted");
    expect(result.extractionReport.imageOcrFailed).toBe(0);
    expect(result.extractionReport.coverageLevel).toBe("partial");
    expect(result.warnings.map((warning) => warning.code)).toContain("OCR_NOT_ATTEMPTED");
  });

  it("keeps full html partial when selected body images are OCRed successfully", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <body>
              <article>
                <p>This article body contains enough full text to meet the coverage threshold for the import flow, while also including multiple large body images that should still count as a candidate image gap.</p>
                <img src="https://cdn.example.com/illustration-1.jpg" width="900" height="1200" alt="步骤图一" />
                <img src="https://cdn.example.com/illustration-2.jpg" width="900" height="1200" alt="步骤图二" />
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/guide"
      },
      {
        fetcher,
        timeoutMs: 200,
        ocrProvider: {
          providerAvailable: true,
          extractText: vi.fn(async () => ({
            attempted: 1,
            providerAvailable: true,
            succeededCount: 1,
            recognizedText: "这是图像文字",
            recognizedTextLength: 6,
            warnings: []
          }))
        }
      }
    );

    expect(result.extractionMethod).toBe("readability");
    expect(result.extractionReport.ocrStatus).toBe("successful");
    expect(result.extractionReport.imageOcrFailed).toBe(0);
    expect(result.extractionReport.coverageLevel).toBe("partial");
  });

  it("retains full coverage when only coarse image signals exist and no body candidate images are selected", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <head>
              <meta property="og:image" content="https://cdn.example.com/cover-1.jpg" />
              <meta property="og:image" content="https://cdn.example.com/cover-2.jpg" />
            </head>
            <body>
              <article>
                <p>This article body contains enough full text to meet the coverage threshold, while the only image signals are coarse page-level metadata images.</p>
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://example.com/full-with-meta-images"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionMethod).toBe("readability");
    expect(result.extractionReport.imageSignalsFound).toBe(2);
    expect(result.extractionReport.candidateImagesSelected).toBe(2);
    expect(result.extractionReport.coverageLevel).toBe("full");
    expect(result.extractionReport.candidateSelectionReasons).toContain("partial_page_signals_only");
  });

  it("falls back to og:image candidates when readability content has no body images", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <head>
              <title>XHS Shared Note</title>
              <meta property="og:image" content="https://cdn.example.com/xhs-1.jpg" />
              <meta property="og:image" content="https://cdn.example.com/xhs-2.jpg" />
            </head>
            <body>
              <article>
                <p>这是一段已经提取到的网页正文，但它还不足以说明图文中的全部内容，因此应该继续把页面图片视为候选正文图片。</p>
                <p>如果当前没有 OCR provider，这类页面也不应被判断为 full，而应该明确保留图片文字缺口。</p>
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://www.xiaohongshu.com/explore/meta-fallback-images"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionMethod).toBe("readability");
    expect(result.extractionReport.imageSignalsFound).toBe(2);
    expect(result.extractionReport.candidateImagesSelected).toBe(2);
    expect(result.extractionReport.ocrStatus).toBe("provider_unavailable");
    expect(result.extractionReport.coverageLevel).toBe("full");
    expect(result.extractionReport.candidateSelectionReasons).toContain("partial_page_signals_only");
    expect(result.warnings.map((warning) => warning.code)).toContain("OCR_PROVIDER_UNAVAILABLE");
  });

  it("reports found image signals separately from selected candidate images when capped", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        `
          <html>
            <head>
              <title>XHS Shared Note</title>
              <meta property="og:image" content="https://cdn.example.com/xhs-1.jpg" />
              <meta property="og:image" content="https://cdn.example.com/xhs-2.jpg" />
              <meta property="og:image" content="https://cdn.example.com/xhs-3.jpg" />
              <meta property="og:image" content="https://cdn.example.com/xhs-4.jpg" />
              <meta property="og:image" content="https://cdn.example.com/xhs-5.jpg" />
            </head>
            <body>
              <article>
                <p>这是一段网页正文，但页面仍明显依赖图片承载更多信息，因此统计需要区分发现的图片信号数和实际选中的候选正文图数量。</p>
              </article>
            </body>
          </html>
        `,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html"
          }
        }
      )
    );

    const result = await importArticleContent(
      {
        url: "https://www.xiaohongshu.com/explore/meta-cap-images"
      },
      {
        fetcher,
        timeoutMs: 200
      }
    );

    expect(result.extractionReport.imageSignalsFound).toBe(5);
    expect(result.extractionReport.candidateImagesSelected).toBe(3);
    expect(result.extractionReport.ocrAttemptLimit).toBe(3);
    expect(result.extractionReport.candidateSelectionReasons).toEqual(
      expect.arrayContaining(["partial_page_signals_only", "limited_by_cap"])
    );
  });
});
