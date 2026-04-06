import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// @ts-expect-error The sideloaded extension keeps runtime JS modules outside the server tsconfig scope.
const extensionMessages = await import("../../../extensions/bilibili-context-import/messages.js");
const { DEFAULT_LOCALE, getMessage } = extensionMessages as {
  DEFAULT_LOCALE: string;
  getMessage: (key: string, locale?: string) => string;
};

describe("browser extension messages", () => {
  it("defaults popup messages to simplified Chinese", () => {
    expect(DEFAULT_LOCALE).toBe("zh-CN");
    expect(getMessage("popupTitle")).toBe("浏览器导入（Beta）");
    expect(getMessage("pageNotSupported")).toContain("B 站视频页");
    expect(getMessage("noSession")).toContain("浏览器导入（Beta）");
    expect(getMessage("submitSuccess")).toContain("请返回应用查看");
  });

  it("marks the popup html as zh-CN", () => {
    const popupHtml = readFileSync(
      new URL("../../../extensions/bilibili-context-import/popup.html", import.meta.url),
      "utf8"
    );

    expect(popupHtml).toContain('<html lang="zh-CN">');
    expect(popupHtml).toContain('type="module" src="popup.js"');
  });
});
