/**
 * 2048 类型定义
 *
 * 实现参考：
 * - Gabriele Cirulli 原版 2048（2014，MIT）
 * - 行业标准 4×4 棋盘，2/4 随机生成，相同值合并翻倍
 * - 目标：合并出 2048（或继续挑战 4096+）
 */

export const BOARD_SIZE = 4;
export const WIN_VALUE = 2048;
/** 新 tile 概率 90% = 2 / 10% = 4（行业标准） */
export const PROBABILITY_OF_FOUR = 0.1;

/** 棋盘单元格：0 = 空，n > 0 = 2^n 对应值 */
export type Cell = number;

/** 4×4 棋盘 [row][col] */
export type Grid = Cell[][];

/** 移动方向 */
export type Direction = "up" | "down" | "left" | "right";

/** 游戏状态机 */
export type Status = "playing" | "won" | "over";

/** 移动一步的结果 */
export interface MoveResult {
  grid: Grid;
  moved: boolean;
  score: number;
}

/** 撤销用的快照（仅 1 步） */
export interface UndoSnapshot {
  grid: Grid;
  score: number;
  moves: number;
}

/** 单个 tile 的渲染数据（绝对定位 + 动画） */
export interface TileRender {
  id: number;
  row: number;
  col: number;
  value: number;
  /** 是否新生成（控制 scale 0→1 动画） */
  isNew: boolean;
  /** 是否本步合并产生（控制 scale 1→1.15→1 动画） */
  isMerged: boolean;
}
