/**
 * 俄罗斯方块键盘输入 composable（v2 — DAS/ARR 支持）
 *
 * 键盘映射（plan.md § 8.4）：
 * - ← →       移动（DAS 167ms / ARR 33ms）
 * - ↓         软降（DAS 50ms / ARR 33ms，软降节奏更紧凑）
 * - ↑         顺时针旋转
 * - Z         逆时针旋转
 * - Space     硬降
 * - C / Shift Hold
 * - P         暂停
 * - R         重开
 * - Esc       返回主页（不归此 composable 管，组件自己处理）
 *
 * v2：水平移动 / 软降都支持 DAS-ARR 自动重复。
 */

import { onMounted, onUnmounted } from "vue";
import { useTetrisStore } from "@/stores/tetris";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";

/** Tetris Guideline 标准：水平 DAS 167ms / ARR 33ms */
const HORIZONTAL_DAS = 167;
const HORIZONTAL_ARR = 33;
/** 软降的 DAS 较短（手感更紧凑） */
const SOFT_DAS = 50;
const SOFT_ARR = 33;

type Store = ReturnType<typeof useTetrisStore>;

const KEY_MAP: Record<string, (store: Store) => void> = {
  ArrowUp: (s) => s.cw(),
  z: (s) => s.ccw(),
  Z: (s) => s.ccw(),
  " ": (s) => s.hard(),
  c: (s) => s.doHold(),
  C: (s) => s.doHold(),
  Shift: (s) => s.doHold(),
  p: (s) => s.pause(),
  P: (s) => s.pause(),
  r: (s) => s.reset(),
  R: (s) => s.reset(),
};

export function useTetrisKeys() {
  const store = useTetrisStore();

  /* === 水平 / 软降的 DAS-ARR 状态 === */
  const repeatState = {
    /** 方向：'left' | 'right' | 'down' */
    left: { held: false, timer: null as number | null },
    right: { held: false, timer: null as number | null },
    down: { held: false, timer: null as number | null },
  };

  function clearRepeat(key: "left" | "right" | "down"): void {
    const s = repeatState[key];
    s.held = false;
    if (s.timer !== null) {
      window.clearTimeout(s.timer);
      s.timer = null;
    }
  }

  /**
   * 启动一个方向的 DAS-ARR 重复
   * 1. 立即触发一次（onKeyDown 已经触发，这里只是起 ARR 循环）
   * 2. DAS ms 后开始 ARR 循环
   * 3. 每个 ARR ms 触发一次
   * 4. keyup 时 clearRepeat 取消
   */
  function startRepeat(
    key: "left" | "right" | "down",
    das: number,
    arr: number,
    action: (s: Store) => void,
  ): void {
    const s = repeatState[key];
    if (s.held) return; // 已经在重复中（按住另一键切换时防重叠）
    s.held = true;
    if (s.timer !== null) {
      window.clearTimeout(s.timer);
    }
    // DAS 阶段：等待后开始 ARR 循环
    s.timer = window.setTimeout(() => {
      if (!s.held) return;
      const arrLoop = (): void => {
        if (!s.held) return;
        action(store);
        s.timer = window.setTimeout(arrLoop, arr);
      };
      s.timer = window.setTimeout(arrLoop, arr);
    }, das);
  }

  function onKeyDown(e: KeyboardEvent) {
    // 先做 audio unlock（首次任意按键触发）
    unlockAudioOnFirstInteraction();

    const action = KEY_MAP[e.key];
    if (action) {
      e.preventDefault();
      action(store);
      return;
    }

    // 水平 / 软降：DAS-ARR
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (!repeatState.left.held) {
        store.left(); // 立即移动一格
        startRepeat("left", HORIZONTAL_DAS, HORIZONTAL_ARR, (s) => s.left());
      }
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!repeatState.right.held) {
        store.right();
        startRepeat("right", HORIZONTAL_DAS, HORIZONTAL_ARR, (s) => s.right());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!repeatState.down.held) {
        store.soft();
        startRepeat("down", SOFT_DAS, SOFT_ARR, (s) => s.soft());
      }
      return;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") clearRepeat("left");
    else if (e.key === "ArrowRight") clearRepeat("right");
    else if (e.key === "ArrowDown") clearRepeat("down");
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  });
  onUnmounted(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    // 清理所有重复计时器
    clearRepeat("left");
    clearRepeat("right");
    clearRepeat("down");
  });
}
