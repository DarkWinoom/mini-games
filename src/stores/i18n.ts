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
  function validateDict(value: unknown): { ok: boolean; missing: string[] } {
    const ok =
      !!value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length > 0 &&
      Object.values(value).every((item) => typeof item === "string");
    return {
      ok,
      missing: ok
        ? Object.keys(en).filter((key) => !(key in (value as object)))
        : [],
    };
  }
  function registerLocale(code: string, dict: Partial<LocaleDict>) {
    if (code !== "zh-CN" && code !== "en-US" && validateDict(dict).ok)
      registry.set(code, dict);
  }
  function saveCustomLocale(code: string, dict: Partial<LocaleDict>) {
    registerLocale(code, dict);
    writeStorage("ui.customLocale", JSON.stringify({ code, dict }));
    setLang(code);
  }
  function init() {
    try {
      const custom = JSON.parse(readStorage("ui.customLocale") || "null");
      if (custom && typeof custom.code === "string")
        registerLocale(custom.code, custom.dict);
    } catch {
      /* Ignore invalid imported JSON. */
    }
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
    saveCustomLocale,
    validateDict,
  };
});
