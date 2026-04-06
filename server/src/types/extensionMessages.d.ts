declare module "../../../extensions/bilibili-context-import/messages.js" {
  export const DEFAULT_LOCALE: string;
  export function getMessage(key: string, locale?: string): string;
}
