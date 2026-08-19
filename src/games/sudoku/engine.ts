/**
 * 数独游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 题目生成（包装 sudoku-gen，避免直接依赖第三方 API）
 * - 棋盘解析（81 字符串 ↔ 9x9 grid）
 * - 冲突检测（同 row/col/box 重复）
 * - 完成检测
 * - 给定 cell 判断（puzzle 中已给的数字不能改）
 * - 笔注操作
 *
 * 题目随机性策略：
 * - sudoku-gen 内部用 1 个 seed puzzle + 6 种 transform 组合（rotate / shuffle / swap）
 * - 每次调用 getSudoku() 随机选 transform，单 seed 给出 2.4 万亿变体
 * - 连续两局出现完全相同题目的概率 ~ 1/2.4T，实际不可能
 * - 不需要额外的"最近题目去重"机制
 */

import { getSudoku } from "sudoku-gen";
import { BOARD_SIZE, BOX_SIZE } from "./types";
import type {
  Cell,
  Difficulty,
  Grid,
  CellPosition,
} from "./types";

/* ============================================================================
 * 题目生成
 * ========================================================================== */

/**
 * 拉一道新题。封装 sudoku-gen，向上层暴露统一形状。
 * 注意：每次调用都生成不同 transform 的题目（用户不会连续玩到同一题）。
 */
export function generatePuzzle(difficulty: Difficulty = "medium"): {
  puzzle: string;
  solution: string;
  difficulty: Difficulty;
} {
  const result = getSudoku(difficulty);
  return {
    puzzle: result.puzzle,
    solution: result.solution,
    difficulty: result.difficulty as Difficulty,
  };
}

/* ============================================================================
 * 棋盘转换
 * ========================================================================== */

/** 创建空白 9x9 grid */
export function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () =>
    new Array<Cell>(BOARD_SIZE).fill(null),
  );
}

/** 创建空白 notes（9x9 of empty Set） */
export function createEmptyNotes(): Set<number>[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => new Set<number>()),
  );
}

/** 81 字符串 → 9x9 grid（'-' 或 '0' → null） */
export function parseBoard(s: string): Grid {
  const grid = createEmptyGrid();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ch = s[r * BOARD_SIZE + c];
      grid[r][c] = ch === "-" || ch === "0" ? null : parseInt(ch, 10);
    }
  }
  return grid;
}

/** 9x9 grid → 81 字符串 */
export function serializeBoard(grid: Grid): string {
  let s = "";
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      s += grid[r][c] === null ? "-" : String(grid[r][c]);
    }
  }
  return s;
}

/** 给定位置是否是题目初始给出的数字（puzzle 字符串中非 '-'） */
export function isGivenCell(puzzle: string, row: number, col: number): boolean {
  return puzzle[row * BOARD_SIZE + col] !== "-";
}

/* ============================================================================
 * 冲突 / 验证
 * ========================================================================== */

/**
 * 检查在 (row, col) 填 value 是否与当前位置以外的同 row/col/box 冲突
 * 注：用于"高亮冲突 cell"，所以排除自身
 */
export function isValidPlacement(
  grid: Grid,
  row: number,
  col: number,
  value: number,
): boolean {
  // row
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (c !== col && grid[row][c] === value) return false;
  }
  // col
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r !== row && grid[r][col] === value) return false;
  }
  // 3x3 box
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (r === row && c === col) continue;
      if (grid[r][c] === value) return false;
    }
  }
  return true;
}

/**
 * 找出所有冲突的 cells（"row,col" 形式）
 * 用于高亮显示：用户填错时格子变红
 */
export function findConflicts(grid: Grid): Set<string> {
  const conflicts = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = grid[r][c];
      if (v === null) continue;
      if (!isValidPlacement(grid, r, c, v)) {
        conflicts.add(`${r},${c}`);
      }
    }
  }
  return conflicts;
}

/* ============================================================================
 * 完成 / 胜负
 * ========================================================================== */

/** 是否所有 cell 都已填，且无冲突 */
export function isBoardComplete(grid: Grid): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === null) return false;
    }
  }
  return findConflicts(grid).size === 0;
}

/* ============================================================================
 * 笔注操作
 * ========================================================================== */

/** 切换 cell 的某候选数字（已存在则删，否则加） */
export function toggleNote(
  notes: Set<number>[][],
  row: number,
  col: number,
  value: number,
): Set<number>[][] {
  const next = notes.map((r) => r.map((s) => new Set(s)));
  if (next[row][col].has(value)) {
    next[row][col].delete(value);
  } else {
    next[row][col].add(value);
  }
  return next;
}

/** 用户填了确定值后，清掉该 cell 已有 notes */
export function clearNotesForCell(
  notes: Set<number>[][],
  row: number,
  col: number,
  _value: number,
): Set<number>[][] {
  if (notes[row][col].size === 0) return notes;
  const next = notes.map((r) => r.map((s) => new Set(s)));
  next[row][col].clear();
  return next;
}

/** 擦除 cell 的值和 notes */
export function clearCell(
  grid: Grid,
  notes: Set<number>[][],
  row: number,
  col: number,
): { grid: Grid; notes: Set<number>[][] } {
  const newGrid = grid.map((r) => r.slice());
  newGrid[row][col] = null;
  const newNotes = notes.map((r) => r.map((s) => new Set(s)));
  newNotes[row][col].clear();
  return { grid: newGrid, notes: newNotes };
}

/* ============================================================================
 * 棋盘 state 操作（高阶）
 * ========================================================================== */

/**
 * 在 (row, col) 填 value，返回新 board。
 * 注：调用方需先确认 isGivenCell == false。
 */
export function placeNumber(
  grid: Grid,
  row: number,
  col: number,
  value: number,
): Grid {
  const next = grid.map((r) => r.slice());
  next[row][col] = value;
  return next;
}

/* ============================================================================
 * 格式化（用于 display）
 * ========================================================================== */

/** 秒数 → "MM:SS" 格式 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** cell 位置 ↔ "row,col" 字符串（用于 Set 查找） */
export function cellKey(pos: CellPosition): string {
  return `${pos.row},${pos.col}`;
}
