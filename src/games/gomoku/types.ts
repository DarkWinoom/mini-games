/**
 * 五子棋（Gomoku）类型定义
 *
 * 棋盘：15×15（标准 Gomoku）
 * 玩家：1 = 黑（人类），2 = 白（AI）
 * 胜利：横/竖/斜任一方向 5 子连珠
 */

/** 单元格：0 = 空，1 = 黑，2 = 白 */
export type Cell = 0 | 1 | 2;

/** 棋盘 = 15×15 二维数组 */
export type Board = Cell[][];

/** 棋盘尺寸 */
export const BOARD_SIZE = 15;

/** 玩家：1 = 黑（人类玩家，先手），2 = 白（AI，后手） */
export type Player = 1 | 2;

/** 游戏状态：playing 进行中，over 已结束 */
export type GameStatus = "playing" | "over";

/** 难度档位 */
export type Difficulty = "easy" | "medium" | "hard";

/** 胜方：0 = 未分胜负 / 平局，1 = 黑胜，2 = 白胜 */
export type Winner = 0 | Player;

/** 一步棋 = (row, col) 坐标 */
export interface Move {
  row: number;
  col: number;
}

/** 完整游戏状态（store 持有） */
export interface GameState {
  board: Board;
  currentPlayer: Player;
  moves: Move[];
  status: GameStatus;
  winner: Winner;
  lastMove: Move | null;
  difficulty: Difficulty;
}

/** 4 个检测方向（横/竖/斜左/斜右） */
export type Direction = "h" | "v" | "d1" | "d2";

/** 4 个方向向量 */
export const DIRECTIONS: ReadonlyArray<{ dir: Direction; dr: number; dc: number }> = [
  { dir: "h", dr: 0, dc: 1 },
  { dir: "v", dr: 1, dc: 0 },
  { dir: "d1", dr: 1, dc: 1 },
  { dir: "d2", dr: 1, dc: -1 },
];

/** 棋型分类（用于评估打分） */
export type PatternType =
  | "FIVE" // 五连
  | "OPEN_FOUR" // 活四 _XXXX_
  | "FOUR" // 冲四（X_XXX / XX_XX / XXX_X）
  | "OPEN_THREE" // 活三 _XXX_
  | "THREE" // 眠三（X_XX_ / _XX_X / XX_X）
  | "OPEN_TWO" // 活二 __XX__
  | "TWO" // 眠二
  | "ONE" // 单子
  | "NONE"; // 无

/** 棋型对应分值（业界标准 Gomoku AI 评分表） */
export const PATTERN_SCORES: Readonly<Record<PatternType, number>> = {
  FIVE: 10_000_000,
  OPEN_FOUR: 1_000_000,
  FOUR: 100_000,
  OPEN_THREE: 10_000,
  THREE: 1_000,
  OPEN_TWO: 100,
  TWO: 10,
  ONE: 1,
  NONE: 0,
};
