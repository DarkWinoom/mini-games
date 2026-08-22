/**
 * 俄罗斯方块键盘输入 composable（v2 — DAS/ARR 支持）
 *
 * 键盘映射（plan.md § 8.4 + v0.9.5 WASD 扩展）：
 * - ← / A →       移动（DAS 167ms / ARR 33ms）
 * - ↓ / S         软降（DAS 50ms / ARR 33ms，软降节奏更紧凑）
 * - ↑ / W         顺时针旋转
 * - Z             逆时针旋转
 * - Space         硬降
 * - C / Shift     Hold
 * - P             暂停（v0.9.5：暂停或开始时按任意游戏键也可，详见 onKeyDown）
 * - R             重开
 * - Esc           返回主页（不归此 composable 管，组件自己处理）
 *
 * v2：水平移动 / 软降都支持 DAS-ARR 自动重复。
 * v0.9.5：WASD 方向控制；waiting / paused 状态下按任意游戏键会触发 start / resume。
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

/**
 * v0.9.5：单次按下的非方向键 / 非软降 action（不需要 DAS-ARR 重复）
 * - ↑ / W: 顺时针旋转
 * - Z    : 逆时针旋转
 * - Space: 硬降
 * - C/Shift: Hold
 * - P    : 暂停（toggle）
 * - R    : 重开
 */
const KEY_MAP: Record<string, (store: Store) => void> = {
  ArrowUp: (s) => s.cw(),
  w: (s) => s.cw(),
  W: (s) => s.cw(),
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

/** v0.9.5：检测是否是"游戏操作键"（用于 paused/waiting 状态任意键触发） */
function isGameActionKey(key: string): boolean {
  return (
    key in KEY_MAP ||
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowDown" ||
    key === "a" ||
    key === "A" ||
    key === "s" ||
    key === "S"
  );
}

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

    // v0.9.5：paused 状态按任意游戏键 → resume 并继续执行该动作
    // 注：Pinia setup store 的 state 字段会自动 unwrap，store.state 直接是 GameState
    if (store.state.status === "paused" && isGameActionKey(e.key)) {
      e.preventDefault();
      store.resume();
      // 不 return：让原 action 继续执行（resume 后立即生效玩家这次的输入）
    }

    const action = KEY_MAP[e.key];
    if (action) {
      e.preventDefault();
      action(store);
      return;
    }

    // 水平 / 软降：DAS-ARR
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      if (!repeatState.left.held) {
        store.left(); // 立即移动一格
        startRepeat("left", HORIZONTAL_DAS, HORIZONTAL_ARR, (s) => s.left());
      }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      if (!repeatState.right.held) {
        store.right();
        startRepeat("right", HORIZONTAL_DAS, HORIZONTAL_ARR, (s) => s.right());
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      if (!repeatState.down.held) {
        store.soft();
        startRepeat("down", SOFT_DAS, SOFT_ARR, (s) => s.soft());
      }
      return;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    // v0.9.5：WASD 跟方向键等价 → 共享 repeat 状态
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      clearRepeat("left");
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      clearRepeat("right");
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      clearRepeat("down");
    }
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
