import { defineStore } from "pinia";
import { computed, reactive, shallowRef } from "vue";
import type { LocaleCode, LocaleDict } from "@/i18n/types";
import { locale as en } from "@/locales/en-US";
import { locale as zh } from "@/locales/zh-CN";
import { readStorage, writeStorage } from "@/utils/storage";

export const useI18nStore = defineStore("i18n", () => {
  const registry = reactive(
    new Map<string, Partial<LocaleDict>>([
      ["zh-CN", zh],
      ["en-US", en],
    ]),
  );
  const currentLocale = shallowRef<LocaleCode>("en-US");
  const locales = computed(() =>
    [...registry.keys()].map((code) => ({
      code,
      name: code === "zh-CN" ? "简体中文" : code === "en-US" ? "English" : code,
      isBuiltin: code === "zh-CN" || code === "en-US",
    })),
  );
  function t(
    key: keyof LocaleDict,
    params?: Record<string, string | number>,
  ): string {
    let value = registry.get(currentLocale.value)?.[key] || en[key] || key;
    for (const [name, replacement] of Object.entries(params ?? {}))
      value = value.split(`{${name}}`).join(String(replacement));
    return value;
  }
  function setLang(code: string) {
    if (!registry.has(code)) return;
    currentLocale.value = code;
    writeStorage("ui.lang", code);
    document.documentElement.lang = code;
  }
  function registerLocale(code: string, dict: Partial<LocaleDict>) {
    if (code !== "zh-CN" && code !== "en-US") registry.set(code, dict);
  }
  function init() {
    const saved = readStorage("ui.lang");
    if (saved && registry.has(saved)) {
      setLang(saved);
      return;
    }
    for (const browserLocale of navigator.languages || [navigator.language]) {
      const found =
        [...registry.keys()].find(
          (code) => code.toLowerCase() === browserLocale.toLowerCase(),
        ) ||
        [...registry.keys()].find(
          (code) => code.split("-")[0] === browserLocale.split("-")[0],
        );
      if (found) {
        setLang(found);
        return;
      }
    }
    setLang("en-US");
  }
  return {
    currentLocale,
    locales,
    t,
    init,
    setLang,
    registerLocale,
  };
});
