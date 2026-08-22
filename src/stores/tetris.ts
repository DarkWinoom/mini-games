import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  newGame,
  tick as engineTick,
  moveLeft,
  moveRight,
  rotateCW,
  rotateCCW,
  softDrop,
  hardDrop,
  hold,
  togglePause,
  gravityIntervalMs,
  renderGrid,
  renderGhostCells,
  clearLastEvent,
} from "@/games/tetris/engine";
import { playSfx } from "@/composables/useSFX";
import type { GameState, ClearType, TSpinType } from "@/games/tetris/types";

/** 把 (lines, tSpin, combo) 映射到 SFX（B2B 已通过 Tetris/T-Spin 主音表达） */
function sfxForClear(
  lines: number,
  tSpin: TSpinType,
  _b2b: boolean,
  combo: number,
): void {
  if (tSpin === "tspin") {
    playSfx("tspin");
    return;
  }
  if (tSpin === "tspin-mini") {
    playSfx("tspin-mini");
    return;
  }
  // 普通行消除
  if (lines === 1) playSfx("clear1");
  else if (lines === 2) playSfx("clear2");
  else if (lines === 3) playSfx("clear3");
  else if (lines === 4) playSfx("clear4");
  // combo 额外音（叠加）
  if (combo >= 2) playSfx("combo");
}

/** localStorage key：最高分（独立于当前游戏） */
const BEST_KEY = "mini-games.tetris.best";

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBest(v: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export const useTetrisStore = defineStore("tetris", () => {
  const state = ref<GameState>(newGame());
  /** 历史最高分（持久化） */
  const bestScore = ref<number>(readBest());
  let tickHandle: number | null = null;

  /** 是否本次游戏破了纪录（gameover 时计算，reset 时清空） */
  const isNewBest = ref<boolean>(false);

  /** 渲染网格（合并 board + current piece） */
  const grid = computed(() => renderGrid(state.value));
  /** Ghost cells 集合（"x,y" 形式） */
  const ghostCells = computed(() => renderGhostCells(state.value));
  const intervalMs = computed(() => gravityIntervalMs(state.value));

  /** lastEvent 清除定时器（确保多次触发不会重叠） */
  let lastEventTimer: number | null = null;
  function scheduleLastEventClear(): void {
    if (lastEventTimer !== null) {
      window.clearTimeout(lastEventTimer);
    }
    lastEventTimer = window.setTimeout(() => {
      state.value = clearLastEvent(state.value);
      lastEventTimer = null;
    }, 300);
  }

  /** 触发 SFX + lastEvent 调度的共用逻辑 */
  function handleLastEvent(next: GameState): void {
    if (next.lastEvent) {
      if (next.lastEvent.kind === "clear") {
        const ev = next.lastEvent;
        sfxForClear(
          ev.clearType === "" ? 0 : clearToLines(ev.clearType),
          ev.tSpin,
          ev.b2b,
          ev.combo,
        );
      } else if (next.lastEvent.kind === "tspin") {
        if (next.lastEvent.tSpin === "tspin") playSfx("tspin");
        else playSfx("tspin-mini");
      }
      scheduleLastEventClear();
    }
  }

  function clearToLines(t: ClearType): number {
    return t === "single" ? 1 : t === "double" ? 2 : t === "triple" ? 3 : t === "tetris" ? 4 : 0;
  }

  /** 检测 gameover 转换并更新 best score */
  function maybeUpdateBest(prev: GameState, next: GameState): void {
    if (prev.status !== "gameover" && next.status === "gameover") {
      if (next.score > bestScore.value) {
        bestScore.value = next.score;
        writeBest(next.score);
        isNewBest.value = true;
        playSfx("combo"); // 破纪录额外反馈音
      }
    }
  }

  /** 包装函数：调用 engine + 触发 SFX + 维护 lastEvent */
  function applyAction(
    fn: (s: GameState) => GameState,
    sfxName: Parameters<typeof playSfx>[0] | null,
  ): void {
    const prev = state.value;
    const next = fn(prev);
    if (next === prev) return; // 操作无效果（如撞墙）
    state.value = next;
    if (sfxName) playSfx(sfxName);
    handleLastEvent(next);
    maybeUpdateBest(prev, next);
  }

  function startLoop(): void {
    stopLoop();
    const loop = () => {
      if (state.value.status === "playing") {
        const prev = state.value;
        const next = engineTick(prev);
        if (next !== prev) {
          state.value = next;
          handleLastEvent(next);
          maybeUpdateBest(prev, next);
        }
      }
      tickHandle = window.setTimeout(loop, intervalMs.value);
    };
    tickHandle = window.setTimeout(loop, intervalMs.value);
  }

  function stopLoop(): void {
    if (tickHandle !== null) {
      window.clearTimeout(tickHandle);
      tickHandle = null;
    }
    if (lastEventTimer !== null) {
      window.clearTimeout(lastEventTimer);
      lastEventTimer = null;
    }
  }

  function reset(): void {
    state.value = newGame();
    isNewBest.value = false;
    if (lastEventTimer !== null) {
      window.clearTimeout(lastEventTimer);
      lastEventTimer = null;
    }
  }

  /**
   * v0.9.4：waiting → playing + 启 tick loop
   * 玩家按方向键 / 旋转 / 硬降时由各 action 内部调用
   * 跟 Snake v0.7.2 的 start() 一致
   */
  function start(): void {
    if (state.value.status !== "waiting") return;
    state.value = { ...state.value, status: "playing" };
    startLoop();
  }

  /** v0.9.4：waiting 状态下先 start 再执行 action（贪吃蛇 v0.7.2 同模式） */
  function ensureStarted(): void {
    if (state.value.status === "waiting") start();
  }

  function left(): void {
    ensureStarted();
    applyAction(moveLeft, "move");
  }
  function right(): void {
    ensureStarted();
    applyAction(moveRight, "move");
  }
  function cw(): void {
    ensureStarted();
    applyAction(rotateCW, "rotate");
  }
  function ccw(): void {
    ensureStarted();
    applyAction(rotateCCW, "rotate");
  }
  function soft(): void {
    ensureStarted();
    applyAction(softDrop, null);
  }
  function hard(): void {
    ensureStarted();
    applyAction(hardDrop, null);
  }
  function doHold(): void {
    ensureStarted();
    applyAction(hold, "hold");
  }
  function pause(): void {
    // v0.9.4：waiting 状态下按 P 也能直接暂停（不开始游戏）
    const prev = state.value;
    const next = togglePause(prev);
    if (next !== prev) {
      state.value = next;
      playSfx("pause");
    }
  }

  return {
    state,
    grid,
    ghostCells,
    intervalMs,
    bestScore,
    isNewBest,
    startLoop,
    stopLoop,
    reset,
    start,
    left,
    right,
    cw,
    ccw,
    soft,
    hard,
    doHold,
    pause,
  };
});
