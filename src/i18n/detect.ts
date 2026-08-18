import type { LocaleCode } from "./types";

/**
 * 从 navigator.language 检测 Locale
 *
 * 规则：
 * - 匹配 'zh-*' → 'zh-CN'
 * - 其他 → 'en-US'（默认 fallback）
 */
export function detectBrowserLocale(): LocaleCode {
  const lang = navigator.language || "en-US";
  if (lang.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }
  return "en-US";
}
