/**
 * 俄罗斯方块类型定义
 *
 * 实现参考：
 * - SRS（Super Rotation System）— 现代俄罗斯方块事实标准
 * - Guideline Tetris — 计分 / 7-bag 随机
 * - Tetris Friends / Tetris Online Japan — 锁点 / Hold 规则
 * - T-Spin 检测 — Tetris Friends 3-corner rule
 * - Back-to-Back / Combo — Tetris Guideline 官方计分
 */

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2; // 顶部隐藏行（piece spawn 区上方）
export const PREVIEW_SIZE = 3; // Next 预览数量

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Rotation = 0 | 1 | 2 | 3; // 0=spawn, 1=R(90°), 2=180°, 3=L(270°)
export type Cell = 0 | PieceType; // 0 = empty
export type Status = "waiting" | "playing" | "paused" | "gameover";

/** T-Spin 类型（v2） */
export type TSpinType = "" | "tspin" | "tspin-mini";

/** 行消除类型（v2，用于 B2B + 计分） */
export type ClearType = "" | "single" | "double" | "triple" | "tetris";

/** 上一次触发的事件（用于 view 闪动提示，300ms 后自动清空） */
export type LastEvent =
  | { kind: "clear"; clearType: ClearType; tSpin: TSpinType; b2b: boolean; combo: number }
  | { kind: "tspin"; tSpin: TSpinType }
  | null;

export interface Piece {
  type: PieceType;
  rotation: Rotation;
  /** 左上角 x 坐标（列号，0-based） */
  x: number;
  /** 顶部 y 坐标（行号，0-based，含隐藏行） */
  y: number;
}

export interface GameState {
  board: Cell[][]; // [y][x]，长度 ROWS + HIDDEN_ROWS
  current: Piece | null;
  hold: PieceType | null;
  canHold: boolean; // 本回合是否还能 hold（每回合一次）
  next: PieceType[]; // 预览队列（长度 ≥ PREVIEW_SIZE）
  score: number;
  level: number;
  lines: number;
  status: Status;

  /* === v2 新增字段 === */
  /** T-Spin 标记：lock 时判定，本回合有效，下一次 spawn / move 失效 */
  tSpin: TSpinType;
  /** Back-to-Back 状态：true = 当前处于 B2B 链中 */
  b2b: boolean;
  /** Combo 计数：-1 = 未开始；0 = 上一次未消除行；≥1 = 连续消除次数 */
  combo: number;
  /** 最近一次消除行数（用于 view 显示） */
  lastClearLines: number;
  /** 最近一次操作的事件（用于 view 闪动，300ms 失效） */
  lastEvent: LastEvent;
}

/** SRS 官方 kick table（JLSTZ 块） */
export const SRS_KICKS_JLSTZ: Record<string, Array<[number, number]>> = {
  "0->1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1->0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1->2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2->1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2->3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3->2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3->0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0->3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

/** SRS I 块 kick table（与 JLSTZ 不同） */
export const SRS_KICKS_I: Record<string, Array<[number, number]>> = {
  "0->1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1->0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1->2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2->1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2->3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3->2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3->0": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "0->3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

/** 等级速度表（每级下落间隔 ms） */
export const LEVEL_GRAVITY_MS: number[] = [
  800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
  80, 80, 80, 70, 70, 70, 60, 60, 60, 50,
];

/** 给定等级 → 下落间隔（ms），超出 20 一律 50ms */
export function gravityMs(level: number): number {
  if (level <= 0) return LEVEL_GRAVITY_MS[0];
  if (level > LEVEL_GRAVITY_MS.length) return LEVEL_GRAVITY_MS[LEVEL_GRAVITY_MS.length - 1];
  return LEVEL_GRAVITY_MS[level - 1];
}

/* ============================================================================
 * v2 计分常量（Tetris Guideline 官方标准）
 * ========================================================================== */

/** 普通消除分数表（base score） */
export const LINE_SCORES: Record<ClearType, number> = {
  "": 0,
  "single": 100,
  "double": 300,
  "triple": 500,
  "tetris": 800,
};

/** T-Spin 分数表（不含行消除） */
export const TSPIN_NO_LINE_SCORES: Record<TSpinType, number> = {
  "": 0,
  "tspin": 400,
  "tspin-mini": 100,
};

/** T-Spin + 行消除分数表（仅列有效组合，缺失项查表时用 0 兜底） */
export const TSPIN_LINE_SCORES: Partial<Record<`${TSpinType}-${0|1|2|3}`, number>> = {
  "tspin-1": 800,
  "tspin-2": 1200,
  "tspin-3": 1600,
  "tspin-mini-1": 200,
  "tspin-mini-2": 400,
  // 注：tspin-mini-3 不存在（mini 不会有 3 行消除）
};

/** Combo 加成：每多 1 combo 加 50 * level（combo ≥ 1） */
export const COMBO_PER_LEVEL = 50;

/** Back-to-Back 难度加成：1.5x */
export const B2B_MULTIPLIER = 1.5;
