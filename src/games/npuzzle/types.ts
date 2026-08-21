/**
 * 数字华容道（N-Puzzle）类型定义
 *
 * 棋盘：3×3（8-puzzle）或 4×4（15-puzzle）
 * Cell = 0 = 空格，1-N = 数字块（N = size*size - 1）
 * 胜利：1-N 按行优先顺序排列 + 空格在右下角
 */

/** 单元格：0 = 空格，1-N = 数字块 */
export type Cell = number;

/** 棋盘 = size × size 二维数组 */
export type Board = Cell[][];

/** 棋盘尺寸：3 = 8-puzzle，4 = 15-puzzle */
export type Size = 3 | 4;

/** 游戏状态 */
export type GameStatus = "idle" | "playing" | "over";

/** 一步棋 = (row, col) */
export interface Move {
  row: number;
  col: number;
}

/** 完整游戏状态（store 持有） */
export interface GameState {
  board: Board;
  size: Size;
  status: GameStatus;
  /** 已下步数 */
  movesCount: number;
  /** 起始时间戳（ms） */
  startTime: number;
  /** 已用秒数（实时更新） */
  elapsed: number;
}

/** 最佳记录（每个尺寸独立） */
export interface BestRecord {
  moves: number;
  time: number;
  date: string; // ISO 字符串
}

/** 已解棋盘模板（3×3 / 4×4） */
export const SOLVED_3x3: Board = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 0],
];

export const SOLVED_4x4: Board = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 0],
];

/** 打乱步数（默认 200 步反向随机走，保证有解） */
export const SCRAMBLE_MOVES = 200;

/** 最大撤销栈深度 */
export const MAX_UNDO = 50;
