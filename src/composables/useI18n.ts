import { storeToRefs } from "pinia";
import { useI18nStore } from "@/stores/i18n";

/**
 * i18n composable（薄包装）
 *
 * 关键：用 storeToRefs 把 state / getters 转成 refs，
 * 保持响应性。直接 `store.x` 在 Pinia setup store 中
 * 会自动 unwrap 成普通 string 副本，丢了响应性。
 */
export function useI18n() {
  const store = useI18nStore();
  const { currentLocale, locales } = storeToRefs(store);
  return {
    t: store.t,
    locale: currentLocale, // ref<string>，template auto-unwrap
    locales, // ref<LocaleInfo[]>，template auto-unwrap
    setLang: store.setLang,
    saveCustomLocale: store.saveCustomLocale,
    validateDict: store.validateDict,
  };
}
