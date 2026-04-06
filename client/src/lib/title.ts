interface BuildTitleOptions {
  userTitle?: string;
  linkTitle?: string;
  content?: string;
  createdAt?: string;
}

export function buildRecordTitle(options: BuildTitleOptions) {
  const userTitle = options.userTitle?.trim();

  if (userTitle) {
    return userTitle;
  }

  const linkTitle = options.linkTitle?.trim();

  if (linkTitle) {
    return linkTitle;
  }

  const contentTitle = options.content?.replace(/\s+/g, " ").trim().slice(0, 28);

  if (contentTitle) {
    return contentTitle;
  }

  const stamp = new Date(options.createdAt || new Date().toISOString()).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  return `未命名记录 ${stamp}`;
}
