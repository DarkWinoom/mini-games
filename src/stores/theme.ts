import { defineStore } from "pinia";
import { ref, computed } from "vue";

const STORAGE_KEY_THEME = "ui.theme";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

export const useThemeStore = defineStore("theme", () => {
  const userTheme = ref<Theme>("system");
  const resolved = ref<Resolved>("light");
  let mq: MediaQueryList | null = null;
  let mqListener: ((e: MediaQueryListEvent) => void) | null = null;

  function applyTheme(theme: Theme): void {
    userTheme.value = theme;

    // 清理旧的 system 监听
    if (mq && mqListener) {
      mq.removeEventListener("change", mqListener);
    }
    mq = null;
    mqListener = null;

    if (theme === "system") {
      mq = window.matchMedia("(prefers-color-scheme: dark)");
      const sync = () => {
        resolved.value = mq!.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", resolved.value);
      };
      mq.addEventListener("change", (mqListener = sync));
      sync();
    } else {
      resolved.value = theme;
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function init(): void {
    const saved =
      (localStorage.getItem(STORAGE_KEY_THEME) as Theme | null) || "system";
    applyTheme(saved);
  }

  function setTheme(theme: Theme): void {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }

  function cycleTheme(): void {
    const order: Theme[] = ["light", "dark", "system"];
    const idx = order.indexOf(userTheme.value);
    setTheme(order[(idx + 1) % order.length]);
  }

  const icon = computed(() => {
    const t = userTheme.value;
    return t === "light" ? "☀️" : t === "dark" ? "🌙" : "🌗";
  });

  return {
    userTheme,
    resolved,
    icon,
    init,
    setTheme,
    cycleTheme,
  };
});
