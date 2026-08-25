import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  createInitialState,
  createShootingBubble,
  resolve as engineResolve,
  shootStep,
  pickColor as enginePickColor,
  clampAngle,
  mulberry32,
  DEFAULT_SEED,
} from "@/games/bubble/engine";
import type { GameState, ShootingBubble } from "@/games/bubble/types";
import { ANGLE_STEP } from "@/games/bubble/types";
import { playSfx } from "@/composables/useSFX";

/** localStorage key：最高分 */
const BEST_KEY = "mini-games.bubble.best";

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export const useBubbleStore = defineStore("bubble", () => {
  const state = ref<GameState>(createInitialState(DEFAULT_SEED));
  const bestScore = ref<number>(readBest());
  /** 本局是否破纪录（用于触发 tspin SFX + 模态文案） */
  const isNewBest = ref<boolean>(false);
  /** 暂停状态（v0.9.8 一致性：aiming 状态可暂停） */
  const isPaused = ref<boolean>(false);

  /* === Computed === */
  const board = computed(() => state.value.board);
  const status = computed(() => state.value.status);
  const isAiming = computed(() => state.value.status === "aiming");
  const isShooting = computed(() => state.value.status === "shooting");
  const isResolving = computed(() => state.value.status === "resolving");
  const isWon = computed(() => state.value.status === "won");
  const isLost = computed(() => state.value.status === "lost");
  const isOver = computed(() => isWon.value || isLost.value);
  const currentColor = computed(() => state.value.currentColor);
  const nextColor = computed(() => state.value.nextColor);
  const angle = computed(() => state.value.angle);
  const score = computed(() => state.value.score);
  const shootingBubble = computed(() => state.value.shootingBubble);
  const best = computed(() => bestScore.value);

  /* === Actions === */

  /** 新游戏（重置状态，保留 best） */
  function newGame(): void {
    state.value = createInitialState(DEFAULT_SEED);
    isNewBest.value = false;
    isPaused.value = false;
  }

  /** 角度左转 3° */
  function aimLeft(): void {
    if (!isAiming.value || isPaused.value) return;
    state.value = {
      ...state.value,
      angle: clampAngle(state.value.angle - ANGLE_STEP),
    };
  }

  /** 角度右转 3° */
  function aimRight(): void {
    if (!isAiming.value || isPaused.value) return;
    state.value = {
      ...state.value,
      angle: clampAngle(state.value.angle + ANGLE_STEP),
    };
  }

  /** 设置角度（鼠标移动） */
  function setAngle(deg: number): void {
    if (!isAiming.value || isPaused.value) return;
    state.value = {
      ...state.value,
      angle: clampAngle(deg),
    };
  }

  /** 发射：从发射器位置创建飞行泡泡，状态切换到 shooting */
  function shoot(): void {
    if (!isAiming.value || isPaused.value) return;
    if (state.value.shootingBubble) return; // 防止重复发射
    const bubble: ShootingBubble = createShootingBubble(
      state.value.currentColor,
      state.value.angle,
    );
    state.value = { ...state.value, shootingBubble: bubble, status: "shooting" };
    playSfx("bubble-shoot");
  }

  /** 飞行泡泡单步 tick：调用 engine.shootStep，hit 时切换到 resolving 并 resolve */
  function tickShooting(): void {
    if (state.value.status !== "shooting" || isPaused.value) return;
    const bubble = state.value.shootingBubble;
    if (!bubble) return;
    // 记录上一帧位置，sweep test 防"擦边穿过" cell（v1.0.2 fix）
    const lastX = bubble.x;
    const lastY = bubble.y;
    const result = shootStep(state.value.board, bubble, lastX, lastY);
    if (result.hit) {
      // 碰撞 → resolve
      const [hitRow, hitCol] = result.hit;
      const resolveResult = engineResolve(state.value.board, hitRow, hitCol, bubble.color);
      // 推进 current → next, 选新 next
      const rng = mulberry32(Date.now());
      const newCurrent = state.value.nextColor;
      const newNext = enginePickColor(rng);
      // 计算 score 累加
      const newScore = state.value.score + resolveResult.score;
      // 胜利奖励
      const finalScore = resolveResult.won ? newScore + 1000 : newScore;
      // 状态
      let newStatus: GameState["status"];
      if (resolveResult.won) newStatus = "won";
      else if (resolveResult.lost) newStatus = "lost";
      else newStatus = "aiming";
      // 短暂 resolving 状态让玩家看到消除动画（先不切）
      state.value = {
        ...state.value,
        board: resolveResult.board,
        shootingBubble: result.bubble, // 飞行泡泡停在 hit 位置
        score: finalScore,
      };
      // SFX：消除 / 掉落
      if (resolveResult.poppedCount >= 3) playSfx("bubble-pop");
      if (resolveResult.fallenCount > 0) playSfx("bubble-fall");
      // 切到 won / lost / aiming，并推进 current/next
      if (newStatus === "won" || newStatus === "lost") {
        // 终局：更新 best + SFX
        if (finalScore > bestScore.value) {
          bestScore.value = finalScore;
          writeBest(finalScore);
          isNewBest.value = true;
          playSfx("tspin");
        } else {
          if (newStatus === "lost") playSfx("gameover");
        }
        state.value = {
          ...state.value,
          currentColor: state.value.currentColor,
          nextColor: state.value.nextColor,
          status: newStatus,
        };
      } else {
        // 普通推进
        state.value = {
          ...state.value,
          currentColor: newCurrent,
          nextColor: newNext === newCurrent ? enginePickColor(rng) : newNext,
          shootingBubble: null,
          status: newStatus,
        };
      }
    } else {
      // 飞行中：更新位置
      state.value = {
        ...state.value,
        shootingBubble: result.bubble,
      };
    }
  }

  /** 切换暂停（仅 aiming 状态可暂停） */
  function togglePause(): void {
    if (!isAiming.value) return;
    isPaused.value = !isPaused.value;
    if (isPaused.value) playSfx("pause");
  }

  /**
   * v0.9.8: 弹模态前同步暂停（不走特殊倒计时，直接 paused）
   * 与 togglePause 的区别：togglePause 在 aiming 状态可用，这里只是单纯 setPaused(true)
   */
  function pauseOnly(): void {
    if (state.value.status !== "aiming" && state.value.status !== "shooting") return;
    isPaused.value = true;
  }

  /**
   * v0.9.8: 取消模态后自动恢复（不走倒计时，直接 playing）
   */
  function resumeOnly(): void {
    if (!isPaused.value) return;
    isPaused.value = false;
  }

  /** 失焦自动暂停（仅 aiming 状态） */
  function onVisibilityChange(visible: boolean): void {
    if (visible) return;
    if (isAiming.value) {
      isPaused.value = true;
    }
  }

  return {
    // state (refs)
    state,
    bestScore,
    isNewBest,
    isPaused,
    // computed
    board,
    status,
    isAiming,
    isShooting,
    isResolving,
    isWon,
    isLost,
    isOver,
    currentColor,
    nextColor,
    angle,
    score,
    shootingBubble,
    best,
    // actions
    newGame,
    aimLeft,
    aimRight,
    setAngle,
    shoot,
    tickShooting,
    togglePause,
    pauseOnly,
    resumeOnly,
    onVisibilityChange,
  };
});
