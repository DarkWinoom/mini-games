/**
 * 数独类型定义
 *
 * 实现参考：
 * - sudoku-gen (Erez Makavy) — 题目生成（单 seed + transform，2.4T 变体）
 * - 数独标准规则：9×9 网格，每行/列/3×3 宫 1-9 不重复
 * - 笔注（Notes / Pencil Marks）：候选数字标注
 */

export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;

/** 错误次数上限（达到后 game over） */
export const MAX_ERRORS = 3;

export type Cell = number | null; // 1-9 或 null（空格）
export type Grid = Cell[][]; // [row][col]，9x9

export type Difficulty = "easy" | "medium" | "hard" | "expert";

/** 支持的难度（i18n 已配 easy/medium/hard，expert 暂留扩展） */
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export type Status = "playing" | "paused" | "won" | "failed";

export interface CellPosition {
  row: number;
  col: number;
}

export interface GameState {
  /** 初始题目 81 字符（'-' 表示空格） */
  puzzle: string;
  /** 答案 81 字符 */
  solution: string;
  /** 当前棋盘状态 9x9 */
  board: Grid;
  /** 笔注：9x9 集合（每个 cell 记录候选数字 1-9） */
  notes: Set<number>[][];
  /** 选中 cell（null = 无） */
  selectedCell: CellPosition | null;
  /** 笔注模式开关 */
  notesMode: boolean;
  /** 当前难度 */
  difficulty: Difficulty;
  /** 错误次数（与 solution 不一致的 cell 计数） */
  errors: number;
  /** 已用秒数 */
  time: number;
  /** 状态 */
  status: Status;
  /** 是否新纪录（won 时计算，reset 清空） */
  isNewBest: boolean;
}

/** Best time 持久化结构（按难度分开记录） */
export interface BestTimes {
  easy: number | null;
  medium: number | null;
  hard: number | null;
  expert: number | null;
}

/** 空 BestTimes 初始值 */
export const EMPTY_BEST_TIMES: BestTimes = {
  easy: null,
  medium: null,
  hard: null,
  expert: null,
};
