import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  scrambleBoard as engineScrambleBoard,
  moveTile as engineMoveTile,
  isSolved,
} from "@/games/npuzzle/engine";
import type {
  Board,
  GameState,
  BestRecord,
  Size,
} from "@/games/npuzzle/types";
import { MAX_UNDO } from "@/games/npuzzle/types";
import { playSfx } from "@/composables/useSFX";

/** localStorage key：两个尺寸分别存 */
const BEST_KEY_PREFIX = "mini-games.npuzzle.best";

function bestKey(size: Size): string {
  return `${BEST_KEY_PREFIX}.${size}x${size}`;
}

function readBest(size: Size): BestRecord | null {
  try {
    const raw = localStorage.getItem(bestKey(size));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (
      typeof obj.moves === "number" &&
      typeof obj.time === "number" &&
      typeof obj.date === "string"
    ) {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}

function writeBest(size: Size, record: BestRecord): void {
  try {
    localStorage.setItem(bestKey(size), JSON.stringify(record));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

function newGameState(size: Size): GameState {
  return {
    board: engineScrambleBoard(size),
    size,
    status: "playing",
    movesCount: 0,
    startTime: Date.now(),
    elapsed: 0,
  };
}

export const useNpuzzleStore = defineStore("npuzzle", () => {
  const state = ref<GameState>(newGameState(4));
  const bestRecords = ref<{
    "3x3": BestRecord | null;
    "4x4": BestRecord | null;
  }>({
    "3x3": readBest(3),
    "4x4": readBest(4),
  });
  /** 本局是否破纪录 */
  const isNewBest = ref<boolean>(false);
  /** 撤销栈（保存每步的 board 快照，最多 MAX_UNDO 步） */
  const undoStack = ref<Board[]>([]);

  /* === Computed === */
  const board = computed(() => state.value.board);
  const size = computed(() => state.value.size);
  const status = computed(() => state.value.status);
  const movesCount = computed(() => state.value.movesCount);
  const elapsed = computed(() => state.value.elapsed);
  const isPlaying = computed(() => state.value.status === "playing");
  const isOver = computed(() => state.value.status === "over");
  const isIdle = computed(() => state.value.status === "idle");
  const bestRecord = computed(() => bestRecords.value[`${state.value.size}x${state.value.size}` as "3x3" | "4x4"]);
  const canUndo = computed(() => undoStack.value.length > 0);

  /* === Actions === */

  /** 新游戏（重置状态，保留 best） */
  function newGame(s?: Size): void {
    const newSize = s ?? state.value.size;
    state.value = newGameState(newSize);
    undoStack.value = [];
    isNewBest.value = false;
  }

  /** 玩家落子（点击数字块） */
  function moveTile(row: number, col: number): void {
    if (state.value.status !== "playing") return;
    const next = engineMoveTile(state.value.board, row, col);
    if (next === state.value.board) return; // 不可移动

    // 推撤销栈（限制最大深度）
    undoStack.value.push(state.value.board);
    if (undoStack.value.length > MAX_UNDO) {
      undoStack.value.shift();
    }

    state.value = {
      ...state.value,
      board: next,
      movesCount: state.value.movesCount + 1,
    };

    playSfx("slide");

    // 胜利检测
    if (isSolved(next, state.value.size)) {
      const finalTime = state.value.elapsed;
      const finalMoves = state.value.movesCount + 1;
      state.value = { ...state.value, status: "over" };
      // 写最佳
      const sizeKey = `${state.value.size}x${state.value.size}` as "3x3" | "4x4";
      const oldBest = bestRecords.value[sizeKey];
      const newRecord: BestRecord = {
        moves: finalMoves,
        time: finalTime,
        date: new Date().toISOString(),
      };
      const isNew =
        !oldBest ||
        finalMoves < oldBest.moves ||
        (finalMoves === oldBest.moves && finalTime < oldBest.time);
      if (isNew) {
        bestRecords.value[sizeKey] = newRecord;
        writeBest(state.value.size, newRecord);
        isNewBest.value = true;
        playSfx("tspin");
      } else {
        playSfx("clear4");
      }
    }
  }

  /** 撤销 */
  function undo(): void {
    if (state.value.status !== "playing") return;
    if (undoStack.value.length === 0) return;
    const prevBoard = undoStack.value.pop()!;
    state.value = {
      ...state.value,
      board: prevBoard,
      movesCount: Math.max(0, state.value.movesCount - 1),
    };
    playSfx("rotate");
  }

  /** 计时器 tick（每秒） */
  function tick(): void {
    if (state.value.status !== "playing") return;
    state.value = {
      ...state.value,
      elapsed: Math.floor((Date.now() - state.value.startTime) / 1000),
    };
  }

  /** 切换难度（重开一局） */
  function setSize(s: Size): void {
    if (s === state.value.size) return;
    newGame(s);
  }

  return {
    // state (refs)
    state,
    bestRecords,
    isNewBest,
    undoStack,
    // computed
    board,
    size,
    status,
    movesCount,
    elapsed,
    isPlaying,
    isOver,
    isIdle,
    bestRecord,
    canUndo,
    // actions
    newGame,
    setSize,
    moveTile,
    undo,
    tick,
  };
});
