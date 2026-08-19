import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  generatePuzzle,
  parseBoard,
  createEmptyNotes,
  isBoardComplete,
  isGivenCell,
  placeNumber,
  toggleNote,
  clearNotesForCell,
  clearCell,
  findConflicts,
} from "@/games/sudoku/engine";
import { playSfx } from "@/composables/useSFX";
import type {
  GameState,
  Difficulty,
  CellPosition,
  BestTimes,
} from "@/games/sudoku/types";
import { EMPTY_BEST_TIMES, DIFFICULTIES, MAX_ERRORS } from "@/games/sudoku/types";

/** localStorage key */
const BEST_KEY = "mini-games.sudoku.best";
const LAST_DIFF_KEY = "mini-games.sudoku.lastDifficulty";

function readBest(): BestTimes {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { ...EMPTY_BEST_TIMES };
    const parsed = JSON.parse(raw);
    return {
      easy: typeof parsed.easy === "number" ? parsed.easy : null,
      medium: typeof parsed.medium === "number" ? parsed.medium : null,
      hard: typeof parsed.hard === "number" ? parsed.hard : null,
      expert: typeof parsed.expert === "number" ? parsed.expert : null,
    };
  } catch {
    return { ...EMPTY_BEST_TIMES };
  }
}

function writeBest(v: BestTimes): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(v));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

/** 读取上次选过的难度；首次进入默认 easy */
function readLastDifficulty(): Difficulty {
  try {
    const raw = localStorage.getItem(LAST_DIFF_KEY);
    if (raw === "easy" || raw === "medium" || raw === "hard" || raw === "expert") {
      return raw;
    }
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return "easy";
}

function writeLastDifficulty(d: Difficulty): void {
  try {
    localStorage.setItem(LAST_DIFF_KEY, d);
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export const useSudokuStore = defineStore("sudoku", () => {
  /** 初始难度从 localStorage 读取；首次进入默认 easy（用户偏好） */
  const state = ref<GameState>(newGameState(readLastDifficulty()));
  const bestTimes = ref<BestTimes>(readBest());

  let tickHandle: number | null = null;

  /** 冲突 cell 集合（"row,col" 形式） */
  const conflicts = computed(() => findConflicts(state.value.board));

  /** 选中 cell 的值（null = 空） */
  const selectedValue = computed(() => {
    const sel = state.value.selectedCell;
    if (!sel) return null;
    return state.value.board[sel.row][sel.col];
  });

  /** 错误次数：当前 board 中与 solution 不一致的 user cell 数 */
  const errorCount = computed(() => {
    let n = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = state.value.board[r][c];
        if (v === null) continue;
        if (isGivenCell(state.value.puzzle, r, c)) continue;
        const sol = state.value.solution[r * 9 + c];
        if (String(v) !== sol) n++;
      }
    }
    return n;
  });

  /* === Timer === */
  function startTimer(): void {
    stopTimer();
    const tick = (): void => {
      if (state.value.status === "playing") {
        state.value = { ...state.value, time: state.value.time + 1 };
      }
      tickHandle = window.setTimeout(tick, 1000);
    };
    tickHandle = window.setTimeout(tick, 1000);
  }

  function stopTimer(): void {
    if (tickHandle !== null) {
      window.clearTimeout(tickHandle);
      tickHandle = null;
    }
  }

  /* === Actions === */
  function newGameState(difficulty: Difficulty): GameState {
    const { puzzle, solution } = generatePuzzle(difficulty);
    return {
      puzzle,
      solution,
      board: parseBoard(puzzle),
      notes: createEmptyNotes(),
      selectedCell: null,
      notesMode: false,
      difficulty,
      errors: 0,
      time: 0,
      status: "playing",
      isNewBest: false,
    };
  }

  function newGame(): void {
    state.value = newGameState(state.value.difficulty);
    // v0.5.6 fix: 之前没重启 timer,won/failed 后的新局 time 一直 0,通关 best=0
    startTimer();
  }

  function setDifficulty(d: Difficulty): void {
    if (state.value.difficulty === d) return;
    state.value = newGameState(d);
    writeLastDifficulty(d); // 持久化选择
    // v0.5.6 fix: 同上,won/failed 后切难度也要重启 timer
    startTimer();
  }

  function selectCell(pos: CellPosition): void {
    state.value = { ...state.value, selectedCell: pos };
  }

  function toggleNotesMode(): void {
    state.value = { ...state.value, notesMode: !state.value.notesMode };
  }

  function place(n: number): void {
    const { selectedCell, board, notes, notesMode, puzzle, errors } =
      state.value;
    if (!selectedCell || state.value.status !== "playing") return;
    const { row, col } = selectedCell;
    if (isGivenCell(puzzle, row, col)) return;

    if (notesMode) {
      // 笔注模式：切换候选数字（不影响 board）
      const newNotes = toggleNote(notes, row, col, n);
      state.value = { ...state.value, notes: newNotes };
      playSfx("rotate"); // 用 rotate 音轻量反馈
      return;
    }

    // 填值模式：写入 board + 清 notes + 判定 win
    const newBoard = placeNumber(board, row, col, n);
    const newNotes = clearNotesForCell(notes, row, col, n);
    const sol = state.value.solution[row * 9 + col];
    const correct = String(n) === sol;
    const newErrors = correct ? errors : errors + 1;

    let next: GameState = {
      ...state.value,
      board: newBoard,
      notes: newNotes,
      errors: newErrors,
    };

    if (isBoardComplete(newBoard)) {
      // 胜利：暂停 timer + 检查 best time
      stopTimer();
      const finalTime = next.time;
      const prevBest = bestTimes.value[next.difficulty];
      const isNewBest = prevBest === null || finalTime < prevBest;
      if (isNewBest) {
        bestTimes.value = { ...bestTimes.value, [next.difficulty]: finalTime };
        writeBest(bestTimes.value);
        playSfx("tspin"); // 破纪录
      } else {
        playSfx("clear4"); // 普通胜利
      }
      next = {
        ...next,
        status: "won",
        isNewBest,
      };
    } else if (!correct && newErrors >= MAX_ERRORS) {
      // 错误次数达上限（3 次）→ 失败
      stopTimer();
      playSfx("gameover");
      next = {
        ...next,
        status: "failed",
      };
    } else {
      // 普通填值反馈音（正确用 lock，错误用 gameover 短的变体）
      playSfx(correct ? "lock" : "gameover");
    }

    state.value = next;
  }

  function erase(): void {
    const { selectedCell, board, notes, puzzle } = state.value;
    if (!selectedCell || state.value.status !== "playing") return;
    const { row, col } = selectedCell;
    if (isGivenCell(puzzle, row, col)) return;
    if (board[row][col] === null && notes[row][col].size === 0) return;

    const cleared = clearCell(board, notes, row, col);
    state.value = {
      ...state.value,
      board: cleared.grid,
      notes: cleared.notes,
    };
    playSfx("move");
  }

  function pause(): void {
    if (state.value.status === "playing") {
      state.value = { ...state.value, status: "paused" };
      playSfx("pause");
    } else if (state.value.status === "paused") {
      state.value = { ...state.value, status: "playing" };
      playSfx("pause");
    }
  }

  /** 暴露难度列表（用于 sidebar 选项） */
  const difficulties = DIFFICULTIES;

  return {
    state,
    bestTimes,
    conflicts,
    selectedValue,
    errorCount,
    difficulties,
    newGame,
    setDifficulty,
    selectCell,
    toggleNotesMode,
    place,
    erase,
    pause,
    startTimer,
    stopTimer,
  };
});
