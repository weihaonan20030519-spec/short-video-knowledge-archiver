import type { AppLanguage, SourcePlatform } from "../types/domain";
import { getMessages } from "./i18n";

export function detectPlatform(url?: string | null): SourcePlatform {
  if (!url) {
    return "unknown";
  }

  try {
    const target = new URL(url);
    const host = target.hostname.toLowerCase();

    if (host.includes("tiktok.com")) {
      return "tiktok";
    }

    if (host.includes("bilibili.com") || host.includes("b23.tv")) {
      return "bilibili";
    }

    if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) {
      return "xiaohongshu";
    }

    return "other";
  } catch {
    return "unknown";
  }
}

export function extractLinkTitle(url?: string | null) {
  if (!url) {
    return "";
  }

  try {
    const target = new URL(url);
    const pathParts = decodeURIComponent(target.pathname).split("/").filter(Boolean);
    const trimmedPath = (pathParts[pathParts.length - 1] || "").replace(/[-_]+/g, " ").trim();

    return trimmedPath || target.hostname;
  } catch {
    return "";
  }
}

export function getPlatformLabel(platform: SourcePlatform, language: AppLanguage = "zh-CN") {
  return getMessages(language).platform[platform];
}
