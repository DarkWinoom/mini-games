import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { LocaleCode, LocaleDict, LocaleInfo } from "@/i18n/types";
import { detectBrowserLocale } from "@/i18n/detect";
import { locale as zhCN } from "@/locales/zh-CN";
import { locale as enUS } from "@/locales/en-US";

const STORAGE_KEY_LANG = "ui.lang";
const STORAGE_KEY_CUSTOM = "ui.customLocale";

// 内置 + 自定义都用同一个 Map 存，t() 都从这里查
const registry = new Map<LocaleCode, LocaleDict>([
  ["zh-CN", zhCN],
  ["en-US", enUS],
]);
const builtinSet = new Set<LocaleCode>(["zh-CN", "en-US"]);

export const useI18nStore = defineStore("i18n", () => {
  const currentLocale = ref<LocaleCode>("en-US");

  const locales = computed<LocaleInfo[]>(() => {
    const out: LocaleInfo[] = [];
    registry.forEach((_, code) => {
      out.push({
        code,
        name: code === "zh-CN" ? "中文" : code === "en-US" ? "English" : code,
        isBuiltin: builtinSet.has(code),
      });
    });
    return out;
  });

  function init(): void {
    // 恢复自定义语言包
    const customRaw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (customRaw) {
      try {
        const parsed = JSON.parse(customRaw) as {
          code: string;
          dict: LocaleDict;
        };
        registerLocale(parsed.code, parsed.dict);
      } catch {
        localStorage.removeItem(STORAGE_KEY_CUSTOM);
      }
    }

    // 决定当前语言
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved && registry.has(saved)) {
      currentLocale.value = saved;
    } else {
      currentLocale.value = detectBrowserLocale();
    }
  }

  function t(
    key: keyof LocaleDict,
    params?: Record<string, string | number>,
  ): string {
    const dict = registry.get(currentLocale.value) || registry.get("en-US")!;
    const en = registry.get("en-US")!;
    let value = dict[key] || en[key] || (key as string);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return value;
  }

  function setLang(code: LocaleCode): void {
    if (!registry.has(code)) {
      console.warn(`[i18n] unknown locale: ${code}`);
      return;
    }
    currentLocale.value = code;
    localStorage.setItem(STORAGE_KEY_LANG, code);
  }

  function registerLocale(code: LocaleCode, dict: LocaleDict): void {
    registry.set(code, dict);
  }

  function saveCustomLocale(code: LocaleCode, dict: LocaleDict): void {
    registerLocale(code, dict);
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify({ code, dict }));
    setLang(code);
  }

  function validateDict(dict: Partial<LocaleDict>): {
    ok: boolean;
    missing: string[];
  } {
    const ref = registry.get("en-US")!;
    const required = Object.keys(ref) as (keyof LocaleDict)[];
    const missing = required.filter((k) => !(k in dict));
    return { ok: missing.length === 0, missing };
  }

  return {
    currentLocale,
    locales,
    init,
    t,
    setLang,
    registerLocale,
    saveCustomLocale,
    validateDict,
  };
});
