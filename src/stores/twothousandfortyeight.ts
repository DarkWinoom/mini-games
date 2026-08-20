import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  spawnInitialTiles,
  move as engineMove,
  canMove as engineCanMove,
  hasWon as engineHasWon,
  getMaxTile,
  addRandomTile,
} from "@/games/twothousandfortyeight/engine";
import { playSfx } from "@/composables/useSFX";
import type { Grid, Direction, UndoSnapshot } from "@/games/twothousandfortyeight/types";

/** localStorage key：最高分 */
const BEST_KEY = "mini-games.twenty48.best";

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
  score: number;
  moves: number;
  status: "playing" | "won" | "over";
  /** 上一步快照（仅 1 步） */
  prev: UndoSnapshot | null;
}

function newGameState(): GameState {
  return {
    grid: spawnInitialTiles(),
    score: 0,
    moves: 0,
    status: "playing",
    prev: null,
  };
}

export const useTwenty48Store = defineStore("twenty48", () => {
  const state = ref<GameState>(newGameState());
  const bestScore = ref<number>(readBest());
  /** 本局是否破纪录（won 时计算，newGame 清空） */
  const isNewBest = ref<boolean>(false);

  /* === Computed === */
  const score = computed(() => state.value.score);
  const moves = computed(() => state.value.moves);
  const grid = computed(() => state.value.grid);
  const status = computed(() => state.value.status);
  const isPlaying = computed(() => state.value.status === "playing");
  const isWon = computed(() => state.value.status === "won");
  const isOver = computed(() => state.value.status === "over");
  const canUndo = computed(() => state.value.prev !== null);
  const maxTile = computed(() => getMaxTile(state.value.grid));

  /* === Actions === */

  /** 新游戏（清空所有状态） */
  function newGame(): void {
    state.value = newGameState();
    isNewBest.value = false;
  }

  /**
   * 移动一格
   * - 无效移动（grid 未变）→ 不写 prev，不计分，不计步
   * - 有效移动 → 写 prev，加分，加步，生成新 tile，判定 won / over
   */
  function move(dir: Direction): void {
    if (state.value.status !== "playing") return;

    const { grid: newGrid, moved, score: gained } = engineMove(
      state.value.grid,
      dir,
    );
    if (!moved) return;

    // 写 prev（用于 undo）
    const prev: UndoSnapshot = {
      grid: state.value.grid,
      score: state.value.score,
      moves: state.value.moves,
    };

    let nextScore = state.value.score + gained;
    let nextStatus: GameState["status"] = "playing";

    // 判定 won
    if (engineHasWon(newGrid) && state.value.status === "playing") {
      nextStatus = "won";
      // 破纪录检测
      if (nextScore > bestScore.value) {
        bestScore.value = nextScore;
        writeBest(nextScore);
        isNewBest.value = true;
        playSfx("tspin"); // 破纪录特殊扫频音
      } else {
        isNewBest.value = false;
        playSfx("clear4"); // 普通胜利音
      }
    } else {
      // 普通移动音（不同分用不同音高 = 业界常见"合并越大越爽"）
      if (gained >= 64) playSfx("clear2");
      else if (gained >= 16) playSfx("clear1");
      else playSfx("move");
    }

    // 移动后生成新 tile（v0.6 fix：之前漏了，导致合成后卡住）
    // addRandomTile 棋盘满时返回原 grid，是安全的
    const finalGrid = addRandomTile(newGrid);

    state.value = {
      grid: finalGrid,
      score: nextScore,
      moves: state.value.moves + 1,
      status: nextStatus,
      prev,
    };

    // 移动后判定 over（won 状态不判，让玩家选 continue）
    if (state.value.status === "playing" && !engineCanMove(state.value.grid)) {
      state.value = { ...state.value, status: "over" };
      playSfx("gameover");
    }
  }

  /**
   * 撤销上一步
   * - 只恢复 grid / score / moves
   * - status 强制回 "playing"（避免从 won / over 撤销后还卡死）
   * - 不影响 best / isNewBest
   */
  function undo(): void {
    if (state.value.prev === null) return;
    const { prev } = state.value;
    state.value = {
      grid: prev.grid,
      score: prev.score,
      moves: prev.moves,
      status: "playing",
      prev: null, // 只 1 步，撤销后清空（不能再撤）
    };
    playSfx("hold");
  }

  /**
   * 继续（won 状态后挑战更大数字）
   * - status 变 "playing"，grid 不变
   * - 清空 prev（继续后不能再撤）
   */
  function continueGame(): void {
    if (state.value.status !== "won") return;
    state.value = {
      ...state.value,
      status: "playing",
      prev: null,
    };
  }

  return {
    // state (refs)
    state,
    bestScore,
    isNewBest,
    // computed
    score,
    moves,
    grid,
    status,
    isPlaying,
    isWon,
    isOver,
    canUndo,
    maxTile,
    // actions
    newGame,
    move,
    undo,
    continueGame,
  };
});
