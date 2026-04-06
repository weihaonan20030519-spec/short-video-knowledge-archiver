export const DEFAULT_LOCALE = "zh-CN";

export const messages = {
  "zh-CN": {
    popupTitle: "浏览器导入（Beta）",
    popupSubtitle: "从当前 B 站视频页采集标题、字幕与页面上下文。",
    submitButton: "提交到音视频知识归档器",
    checkingPage: "正在检查当前页面…",
    pageNotSupported: "当前页面不是可导入的 B 站视频页。",
    pageReady: "当前页已就绪，可尝试导入。",
    noSession: "未检测到可用 session，请先在归档器中点击“浏览器导入（Beta）”。",
    sessionReady: "已连接到归档器，点击下方按钮提交当前页面内容。",
    collecting: "已连接到归档器，正在采集并提交页面内容…",
    submitSuccess: "已成功提交到归档器，请返回应用查看。",
    submitSuccessNeedsManual: "当前页面未提取到足够正文，建议返回应用后手动补充。",
    localServerUnavailable: "本地归档服务不可用，请确认应用与本地服务已启动。",
    submitFailed: "导入未完成，但你仍可继续创建记录并手动补录内容。",
    unknownError: "当前操作未完成，请稍后重试。"
  },
  en: {
    popupTitle: "Browser Import (Beta)",
    popupSubtitle: "Collect title, subtitles, and page context from the current Bilibili video page.",
    submitButton: "Send to Audio & Video Knowledge Archiver",
    checkingPage: "Checking the current page…",
    pageNotSupported: "The current tab is not an importable Bilibili video page.",
    pageReady: "The current page is ready for import.",
    noSession: "No pending session was found. Start Browser Import (Beta) in the app first.",
    sessionReady: "Connected to the archiver. Click below to submit the current page.",
    collecting: "Connected to the archiver. Collecting and submitting the page context…",
    submitSuccess: "Submitted to the archiver. Return to the app to continue.",
    submitSuccessNeedsManual:
      "Not enough body text was extracted from the page. Return to the app and complete it manually.",
    localServerUnavailable: "The local archiver service is unavailable. Make sure the app and local server are running.",
    submitFailed: "The import did not finish, but you can still create the record and complete it manually.",
    unknownError: "The action did not finish. Please try again."
  }
};

export function getMessage(key, locale = DEFAULT_LOCALE) {
  const target = messages[locale] || messages[DEFAULT_LOCALE];
  return target[key] || messages[DEFAULT_LOCALE][key] || key;
}
