import { describe, expect, it } from "vitest";

import { assessContentCompleteness, createManualImportResult } from "./manualImportService";

describe("manualImportService", () => {
  it("preserves internal spaces and line breaks in manual import content", () => {
    const content = "第一行  保留空格\n第二行\t继续保留";

    const result = createManualImportResult(content, "zh-CN");

    expect(result.source).toBe("manual_text");
    expect(result.detectedContent).toBe(content);
    expect(result.contentCompleteness).toBe(assessContentCompleteness(content));
  });

  it("keeps whitespace-only manual input empty", () => {
    const result = createManualImportResult("   \n\t  ", "zh-CN");

    expect(result.source).toBe("manual_empty");
    expect(result.detectedContent).toBeNull();
    expect(result.contentCompleteness).toBe("empty");
  });
});
