/**
 * 泡泡龙（Bubble Shooter）类型定义
 *
 * 棋盘：12 行，错位六边形（brick layout）
 *  - row 0, 2, 4, 6, 8, 10 = 15 cells (col 0-14, 长行)
 *  - row 1, 3, 5, 7, 9, 11 = 14 cells (col 0-13, 短行)
 *
 * 6 邻居邻接（brick layout）：
 *  - 长行（row%2===0）cell 邻居 col 偏移 0 / +1
 *  - 短行（row%2===1）cell 邻居 col 偏移 -1 / 0
 *
 * 胜利：棋盘空（所有 cell = null）
 * 失败：飞行泡泡吸附到 row >= LOSE_ROW（棋盘最底行 = 危险行）
 */

/** 6 种泡泡颜色 */
export type BubbleColor = "red" | "blue" | "green" | "yellow" | "purple" | "orange";

/** 颜色数组（用于 pickColor 随机选取） */
export const BUBBLE_COLORS: BubbleColor[] = ["red", "blue", "green", "yellow", "purple", "orange"];

/** 棋盘单元：null = 空，否则 = 颜色 */
export type Cell = BubbleColor | null;

/** 棋盘 = 12 行 × 14/15 列的二维数组（行索引 = 0..11） */
export type Board = Cell[][];

/** 游戏状态机 */
export type GameStatus = "aiming" | "shooting" | "resolving" | "won" | "lost";

/** 飞行中的泡泡（aiming 状态时 store 持有 null） */
export interface ShootingBubble {
  color: BubbleColor;
  /** 飞行泡泡中心 x 像素位置 */
  x: number;
  /** 飞行泡泡中心 y 像素位置 */
  y: number;
  /** 飞行方向 x 分量（cos，已乘速度） */
  dx: number;
  /** 飞行方向 y 分量（-sin，向上为负，已乘速度） */
  dy: number;
}

/** 完整游戏状态（store 持有） */
export interface GameState {
  board: Board;
  status: GameStatus;
  /** 当前发射泡泡颜色 */
  currentColor: BubbleColor;
  /** 下一发泡泡颜色 */
  nextColor: BubbleColor;
  /** 瞄准角度（度，5-175，90 = 正上方） */
  angle: number;
  /** 当前局得分 */
  score: number;
  /** 飞行中的泡泡（aiming 状态时为 null） */
  shootingBubble: ShootingBubble | null;
}

/* === 棋盘常量 === */
export const ROWS = 12;
export const COLS_LONG = 15; // row 0, 2, 4, 6, 8, 10
export const COLS_SHORT = 14; // row 1, 3, 5, 7, 9, 11
export const LOSE_ROW = ROWS - 1; // 底行 = 危险行（贴到这一行 = 输）

/* === 角度常量 === */
export const MIN_ANGLE = 5;
export const MAX_ANGLE = 175;
export const DEFAULT_ANGLE = 90; // 正上方
export const ANGLE_STEP = 3; // 每次方向键调整 3°

/* === 关卡常量 === */
export const INITIAL_ROWS = 5; // 开局 5 行泡泡
export const DEFAULT_SEED = 50; // 默认固定 seed（同开局）
