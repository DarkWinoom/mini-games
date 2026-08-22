import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  createInitialState,
  step as engineStep,
  isOpposite,
} from "@/games/snake/engine";
import { playSfx } from "@/composables/useSFX";
import type { Grid, Point, Direction, Status, Snake } from "@/games/snake/types";
import { TICK_MS } from "@/games/snake/types";

/** localStorage key：最高分 */
const BEST_KEY = "mini-games.snake.best";

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

export interface GameState {
  grid: Grid;
  snake: Snake;
  food: Point | null;
  direction: Direction;
  /** 待生效方向（玩家按方向键后，下个 tick 才真正走） */
  pendingDirection: Direction;
  score: number;
  status: Status;
}

function newGameState(): GameState {
  const init = createInitialState();
  return {
    grid: init.grid,
    snake: init.snake,
    food: init.food,
    direction: init.direction,
    pendingDirection: init.direction,
    score: 0,
    // v0.7.2 fix：新回合默认 waiting，等玩家按方向键才开始（不自动 tick）
    status: "waiting",
  };
}

export const useSnakeStore = defineStore("snake", () => {
  const state = ref<GameState>(newGameState());
  const bestScore = ref<number>(readBest());
  const isNewBest = ref<boolean>(false);

  /**
   * v0.9.5: 恢复倒计时（秒）。>0 = 倒计时中，status=playing 但 tick 暂停；0 = 不在倒计时
   * 显示在 board 蒙版中央（3, 2, 1, 0 后自动 resume）
   */
  const resumeCountdown = ref<number>(0);

  let tickHandle: number | null = null;
  let countdownHandle: number | null = null;

  /* === Computed === */
  const score = computed(() => state.value.score);
  const snakeLength = computed(() => state.value.snake.length);
  const grid = computed(() => state.value.grid);
  const status = computed(() => state.value.status);
  const isPlaying = computed(() => state.value.status === "playing");
  const isPaused = computed(() => state.value.status === "paused");
  const isOver = computed(() => state.value.status === "over");
  const isWaiting = computed(() => state.value.status === "waiting");
  const direction = computed(() => state.value.direction);

  /* === Actions === */

  /**
   * 新游戏（清空所有状态，不自动 tick）
   * v0.7.2 fix：玩家必须按方向键才开始（status=waiting）
   * v0.9.5: 同时清掉恢复倒计时
   */
  function newGame(): void {
    stopTick();
    stopResumeCountdown();
    state.value = newGameState();
    isNewBest.value = false;
    // 注意：startTick() 移到玩家按方向键时由 setDirection 触发
  }

  /**
   * 开始（waiting → playing + 启 tick loop）
   * v0.7.2 新增：玩家按方向键时由 setDirection 内部调用
   */
  function start(): void {
    if (state.value.status !== "waiting") return;
    state.value = { ...state.value, status: "playing" };
    startTick();
  }

  /**
   * 玩家按方向键：
   * - waiting 状态：先 start()（v0.7.2）再设方向
   * - playing 状态：仅更新 pendingDirection，下个 tick 才生效
   * - 180 反向忽略（防自杀）
   * - 转向音：v0.7.1 反馈（"每动一下就播放音效很吵"）— 只在 3 种关键事件播音（转向/吃/撞），普通 tick 静默
   * - waiting 状态下也播"rotate"作为开始提示
   */
  function setDirection(dir: Direction): void {
    if (state.value.status === "over") return;
    if (isOpposite(state.value.pendingDirection, dir)) return;
    if (state.value.status === "waiting") {
      // v0.7.2：玩家按方向键触发游戏开始
      start();
    }
    state.value = { ...state.value, pendingDirection: dir };
    playSfx("rotate");
  }

  /**
   * 暂停/恢复（v0.9.5: 带 3 秒恢复倒计时）
   * - playing → paused (stopTick)
   * - paused → 倒计时 3 → 2 → 1 → 0 → playing (startTick)
   * - over / waiting 不响应
   */
  function togglePause(): void {
    if (state.value.status === "playing") {
      state.value = { ...state.value, status: "paused" };
      stopTick();
    } else if (state.value.status === "paused") {
      // v0.9.5: 启动恢复倒计时（3, 2, 1, 0）
      startResumeCountdown();
    }
  }

  /**
   * v0.9.5: 启动恢复倒计时（3 → 0）
   * 倒计时期间状态保持 paused（tick 已停），蒙版显示数字
   */
  function startResumeCountdown(): void {
    stopResumeCountdown();
    resumeCountdown.value = 3;
    const tick = (): void => {
      if (resumeCountdown.value <= 0) {
        stopResumeCountdown();
        // 倒计时归零 → 真正恢复
        if (state.value.status === "paused") {
          state.value = { ...state.value, status: "playing" };
          startTick();
        }
        return;
      }
      resumeCountdown.value -= 1;
      countdownHandle = window.setTimeout(tick, 1000);
    };
    countdownHandle = window.setTimeout(tick, 1000);
  }

  function stopResumeCountdown(): void {
    if (countdownHandle !== null) {
      window.clearTimeout(countdownHandle);
      countdownHandle = null;
    }
    resumeCountdown.value = 0;
  }

  /**
   * 单步走（tick 触发）
   * - 调 engineStep 计算新状态
   * - 死亡 → status=over + SFX
   * - 吃食物 → score += 1，破纪录检测 + SFX
   */
  function tick(): void {
    if (state.value.status !== "playing") return;

    const dir = state.value.pendingDirection;
    const result = engineStep(state.value.snake, state.value.food, dir);

    let nextStatus: Status = state.value.status;
    let nextScore = state.value.score;

    if (result.died) {
      nextStatus = "over";
      playSfx("gameover");
    } else {
      nextScore = state.value.score + result.score;
      if (result.ate) {
        // 破纪录检测
        if (nextScore > bestScore.value) {
          bestScore.value = nextScore;
          writeBest(nextScore);
          isNewBest.value = true;
          playSfx("tspin"); // 破纪录特殊扫频音
        } else {
          isNewBest.value = false;
          playSfx("clear1"); // 普通吃食物音
        }
      }
      // 普通 tick 移动：v0.7.1 反馈"每动一下就播很吵"→ 静默
      // 只有"转向/吃/撞"3 种关键事件才播音
    }

    state.value = {
      grid: result.grid,
      snake: result.snake,
      food: result.food,
      direction: dir,
      pendingDirection: dir,
      score: nextScore,
      status: nextStatus,
    };

    // 死亡时停 tick
    if (nextStatus === "over") {
      stopTick();
    }
  }

  /* === Tick loop === */
  function startTick(): void {
    stopTick();
    const loop = (): void => {
      tick();
      // tick() 可能改 status，over 状态 stopTick 已经处理
      if (state.value.status === "playing") {
        tickHandle = window.setTimeout(loop, TICK_MS);
      }
    };
    tickHandle = window.setTimeout(loop, TICK_MS);
  }

  function stopTick(): void {
    if (tickHandle !== null) {
      window.clearTimeout(tickHandle);
      tickHandle = null;
    }
  }

  return {
    // state (refs)
    state,
    bestScore,
    isNewBest,
    resumeCountdown,  // v0.9.5: 恢复倒计时
    // computed
    score,
    snakeLength,
    grid,
    status,
    isPlaying,
    isPaused,
    isOver,
    isWaiting,
    direction,
    // actions
    newGame,
    setDirection,
    togglePause,
    tick,
    startTick,
    stopTick,
    start,
  };
});
