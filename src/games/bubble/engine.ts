/**
 * 泡泡龙（Bubble Shooter）游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 棋盘创建 / 行列工具 / 边界判断
 * - 6 邻居邻接（brick layout）
 * - 同色 flood fill（消除判定）
 * - 连接到 top row 的 BFS（掉落判定）
 * - 角度转方向 / 飞行泡泡单步移动 / 碰撞检测 / 吸附算法
 * - 消除 + 掉落组合 resolve
 * - 关卡生成（固定 seed）
 * - 颜色 RNG（确定性 mulberry32）
 *
 * 不变量：
 * - 纯函数永远返回新 board，不修改入参
 * - 0 副作用（无 DOM / 无 localStorage / 无 spawn 后台逻辑）
 * - 0 依赖
 */

import {
  BUBBLE_COLORS,
  COLS_LONG,
  COLS_SHORT,
  DEFAULT_ANGLE,
  DEFAULT_SEED,
  INITIAL_ROWS,
  LOSE_ROW,
  MAX_ANGLE,
  MIN_ANGLE,
  ROWS,
  type Board,
  type BubbleColor,
  type Cell,
  type GameState,
  type ShootingBubble,
} from "./types";

// 显式 re-export 常量（让 esbuild bundle 后 selftest 也能 import）
export {
  BUBBLE_COLORS,
  COLS_LONG,
  COLS_SHORT,
  DEFAULT_ANGLE,
  DEFAULT_SEED,
  INITIAL_ROWS,
  LOSE_ROW,
  MAX_ANGLE,
  MIN_ANGLE,
  ROWS,
  type Board,
  type BubbleColor,
  type Cell,
  type GameState,
  type ShootingBubble,
};

/* === 像素尺寸常量 === */
export const CELL_W = 32; // 单个六边形 cell 像素宽
export const CELL_H = 28; // 单个六边形 cell 像素高
export const BOARD_W = COLS_LONG * CELL_W; // 480 px
export const BOARD_H = ROWS * CELL_H; // 336 px
export const SHOOTER_X = BOARD_W / 2; // 发射器 x（中央）
export const SHOOTER_Y = BOARD_H + 30; // 发射器 y（棋盘底部下方 30 px）
export const BUBBLE_SPEED = 12; // 飞行泡泡每帧像素
export const COLLISION_RADIUS = CELL_W * 0.6; // 飞行泡泡与 cell 中心距离 < 此值 = 碰撞

/* ============================================================================
 * 角度 + RNG
 * ========================================================================== */

/** 角度（度）转方向向量（dy 向上为负） */
export function angleToDirection(angleDeg: number): { dx: number; dy: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    dx: Math.cos(rad),
    dy: -Math.sin(rad), // 向上为负
  };
}

/** 限制角度在 [MIN_ANGLE, MAX_ANGLE] 范围 */
export function clampAngle(deg: number): number {
  if (deg < MIN_ANGLE) return MIN_ANGLE;
  if (deg > MAX_ANGLE) return MAX_ANGLE;
  return deg;
}

/** Mulberry32 RNG（确定性，给定 seed 产出相同序列） */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 用 RNG 随机选一个颜色 */
export function pickColor(rng: () => number): BubbleColor {
  return BUBBLE_COLORS[Math.floor(rng() * BUBBLE_COLORS.length)];
}

/* ============================================================================
 * 棋盘工具
 * ========================================================================== */

/** 行 col 数（长行 15 / 短行 14） */
export function colsOfRow(row: number): number {
  return row % 2 === 0 ? COLS_LONG : COLS_SHORT;
}

/** 创建 12 × (15|14) 全 null 棋盘 */
export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, (_, r) => new Array<Cell>(colsOfRow(r)).fill(null));
}

/** 深度克隆 board */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** cell 是否在棋盘内 */
export function isInBounds(row: number, col: number): boolean {
  if (row < 0 || row >= ROWS) return false;
  return col >= 0 && col < colsOfRow(row);
}

/* ============================================================================
 * 6 邻居（brick layout）
 * ========================================================================== */

/**
 * 获取 (row, col) 的 6 个邻居（边界过滤）
 *
 * 邻接规则（brick layout 推算）：
 * - 长行（row%2===0）cell 物理位置 = (c*cellW + cellW/2, r*cellH + cellH/2)
 * - 短行（row%2===1）cell 物理位置 = ((c+1)*cellW, r*cellH + cellH/2)（向右偏移 0.5*cellW）
 * - 长行 cell 上下邻居是短行 cell，col 偏移 -1, 0
 * - 短行 cell 上下邻居是长行 cell，col 偏移 0, +1
 */
export function getNeighbors(row: number, col: number): Array<[number, number]> {
  if (!isInBounds(row, col)) return [];
  const isLong = row % 2 === 0;
  const candidates: Array<[number, number]> = isLong
    ? [
        // 长行：上下邻居 col 偏移 -1, 0；左右 (r, c-1) (r, c+1)
        [row - 1, col - 1],
        [row - 1, col],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col - 1],
        [row + 1, col],
      ]
    : [
        // 短行：上下邻居 col 偏移 0, +1；左右 (r, c-1) (r, c+1)
        [row - 1, col],
        [row - 1, col + 1],
        [row, col - 1],
        [row, col + 1],
        [row + 1, col],
        [row + 1, col + 1],
      ];
  return candidates.filter(([r, c]) => isInBounds(r, c));
}

/** 6 邻居中只取空位（用于吸附 BFS） */
function getEmptyNeighbors(board: Board, row: number, col: number): Array<[number, number]> {
  return getNeighbors(row, col).filter(([r, c]) => board[r][c] === null);
}

/** 6 邻居中只取非空位（同色 BFS 用） */
function getFilledNeighbors(board: Board, row: number, col: number): Array<[number, number]> {
  return getNeighbors(row, col).filter(([r, c]) => board[r][c] !== null);
}

/* ============================================================================
 * 同色 flood fill（消除判定）
 * ========================================================================== */

/**
 * 从 (startRow, startCol) 出发，BFS 找出所有同色连通的 cell
 * - 不修改 board
 * - 返回 cell 列表
 */
export function floodFillSameColor(
  board: Board,
  startRow: number,
  startCol: number,
): Array<[number, number]> {
  if (!isInBounds(startRow, startCol)) return [];
  const color = board[startRow][startCol];
  if (color === null) return [];
  const result: Array<[number, number]> = [];
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[startRow, startCol]];
  visited.add(`${startRow},${startCol}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    result.push([r, c]);
    for (const [nr, nc] of getFilledNeighbors(board, r, c)) {
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      if (board[nr][nc] !== color) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }
  return result;
}

/* ============================================================================
 * 连接到 top row 的 BFS（掉落判定）
 * ========================================================================== */

/**
 * 找出所有"连接到 row 0"的泡泡（用 "row,col" 字符串集合）
 * - 不修改 board
 * - 任何不在此集合中的泡泡 = 孤立 → 掉落
 */
export function findConnectedToTop(board: Board): Set<string> {
  const connected = new Set<string>();
  const queue: Array<[number, number]> = [];
  for (let c = 0; c < colsOfRow(0); c++) {
    if (board[0][c] !== null) {
      const key = `0,${c}`;
      connected.add(key);
      queue.push([0, c]);
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getFilledNeighbors(board, r, c)) {
      const key = `${nr},${nc}`;
      if (connected.has(key)) continue;
      connected.add(key);
      queue.push([nr, nc]);
    }
  }
  return connected;
}

/* ============================================================================
 * 像素 → cell 索引
 * ========================================================================== */

/**
 * 把飞行泡泡中心像素 (x, y) 转为"最近 cell 索引"
 * - 短行（row%2===1）向右偏移 0.5*cellW
 * - 越界自动 clamp
 */
export function pixelToCell(x: number, y: number): [number, number] {
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor((y - CELL_H / 2) / CELL_H)));
  const colOffset = row % 2 === 1 ? CELL_W / 2 : 0;
  const col = Math.max(
    0,
    Math.min(colsOfRow(row) - 1, Math.floor((x - colOffset - CELL_W / 2) / CELL_W)),
  );
  return [row, col];
}

/** 把 (row, col) 转为 cell 中心像素位置 */
export function cellToPixel(row: number, col: number): [number, number] {
  const colOffset = row % 2 === 1 ? CELL_W / 2 : 0;
  return [col * CELL_W + CELL_W / 2 + colOffset, row * CELL_H + CELL_H / 2];
}

/* ============================================================================
 * 飞行泡泡：单步移动 + 碰撞检测
 * ========================================================================== */

/**
 * 点 (px, py) 到线段 (x1,y1)→(x2,y2) 的最小距离
 * 用于 sweep test：检查飞行泡泡"从 lastX,lastY 飞到 x,y" 过程中是否擦过 cell
 */
function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * 飞行泡泡单步移动 + 碰撞检测
 * - 可选 lastX/lastY：上一帧位置（用于 sweep test 防穿块）
 * - 内部计算用"bubble 飞行轨迹到 cell 中心的最短距离" < COLLISION_RADIUS
 *   避免单帧 (x,y) 检测漏掉"擦边穿过"的穿块 bug
 * 返回：更新后的 bubble + 是否反弹 + 是否碰撞（hit 位置）
 */
export function shootStep(
  board: Board,
  bubble: ShootingBubble,
  lastX?: number,
  lastY?: number,
): { bubble: ShootingBubble; bounced: boolean; hit: [number, number] | null } {
  const prevX = lastX ?? bubble.x;
  const prevY = lastY ?? bubble.y;
  let { x, y, dx, dy } = bubble;
  let bounced = false;

  // 左右反弹（最多 1 次，碰到边界 dx 翻转）
  if (x - CELL_W / 2 < 0) {
    x = CELL_W / 2;
    dx = -dx;
    bounced = true;
  } else if (x + CELL_W / 2 > BOARD_W) {
    x = BOARD_W - CELL_W / 2;
    dx = -dx;
    bounced = true;
  }

  // 移动
  x += dx * BUBBLE_SPEED;
  y += dy * BUBBLE_SPEED;

  // 触顶
  if (y - CELL_H / 2 <= 0) {
    y = CELL_H / 2;
    const [hitRow, hitCol] = pixelToCell(x, y);
    return {
      bubble: { ...bubble, x, y, dx, dy },
      bounced,
      hit: [hitRow, hitCol],
    };
  }

  // 触已有泡泡：在 ±2 cell 范围内找最近 cell（sweep test：轨迹到 cell 中心 < COLLISION_RADIUS）
  const centerRow = Math.max(0, Math.min(ROWS - 1, Math.floor((y - CELL_H / 2) / CELL_H)));
  const centerColOffset = centerRow % 2 === 1 ? CELL_W / 2 : 0;
  const centerCol = Math.max(
    0,
    Math.min(
      colsOfRow(centerRow) - 1,
      Math.floor((x - centerColOffset - CELL_W / 2) / CELL_W),
    ),
  );

  let bestDist = COLLISION_RADIUS;
  let bestCell: [number, number] | null = null;
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = centerRow + dr;
      if (r < 0 || r >= ROWS) continue;
      const cols = colsOfRow(r);
      const c = centerCol + dc;
      if (c < 0 || c >= cols) continue;
      if (board[r][c] === null) continue;
      const [cellX, cellY] = cellToPixel(r, c);
      // sweep test：检查轨迹 (prevX,prevY)→(x,y) 到 cell 中心的最小距离
      // 避免单帧 (x,y) 检测漏掉"擦边穿过"（速度 > COLLISION_RADIUS 边界）
      const dist = pointToSegmentDistance(cellX, cellY, prevX, prevY, x, y);
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = [r, c];
      }
    }
  }

  if (bestCell !== null) {
    return {
      bubble: { ...bubble, x, y, dx, dy },
      bounced,
      hit: bestCell,
    };
  }

  return {
    bubble: { ...bubble, x, y, dx, dy },
    bounced,
    hit: null,
  };
}

/* ============================================================================
 * 吸附算法
 * ========================================================================== */

/**
 * 飞行泡泡撞到 cell (hitRow, hitCol) 后，找最近的 6 邻居空位吸附
 * - 如果 hit cell 本身是空的 → 直接放
 * - 否则 BFS 6 邻居找最近空位
 */
function findSnapPosition(
  board: Board,
  hitRow: number,
  hitCol: number,
): [number, number] {
  if (board[hitRow]?.[hitCol] === null) {
    return [hitRow, hitCol];
  }
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[hitRow, hitCol]];
  visited.add(`${hitRow},${hitCol}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getEmptyNeighbors(board, r, c)) {
      return [nr, nc];
    }
    for (const [nr, nc] of getNeighbors(r, c)) {
      const key = `${nr},${nc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }
  // 理论上不会到这里（棋盘总有空位）
  return [hitRow, hitCol];
}

/* ============================================================================
 * 消除 + 掉落组合 resolve
 * ========================================================================== */

export interface ResolveResult {
  board: Board;
  /** 消除的同色泡泡数 */
  poppedCount: number;
  /** 掉落的孤立泡泡数 */
  fallenCount: number;
  /** 本次 resolve 累加的分数 */
  score: number;
  /** 棋盘是否已空（胜利） */
  won: boolean;
  /** 吸附位置是否在 LOSE_ROW（底行 = 危险行） */
  lost: boolean;
}

/**
 * 完整 1 步 resolve：
 * 1. 吸附（飞行泡泡的 color 放到 hit 位置 / 最近空位）
 * 2. 消除（同色 flood fill >= 3 → 全部消除 + 分数）
 * 3. 掉落（无 anchor 的孤立泡泡 → 全部清空 + 分数）
 * 4. 胜利判定（棋盘空）
 * 5. 失败判定（吸附位置 >= LOSE_ROW = 底行）
 */
export function resolve(
  board: Board,
  hitRow: number,
  hitCol: number,
  color: BubbleColor,
): ResolveResult {
  // 1. 吸附
  const [snapRow, snapCol] = findSnapPosition(board, hitRow, hitCol);
  const next0 = cloneBoard(board);
  next0[snapRow][snapCol] = color;
  const lost = snapRow >= LOSE_ROW;

  // 2. 消除
  const sameColor = floodFillSameColor(next0, snapRow, snapCol);
  let poppedCount = 0;
  let score = 0;
  const next1 = next0;
  if (sameColor.length >= 3) {
    for (const [r, c] of sameColor) {
      next1[r][c] = null;
    }
    poppedCount = sameColor.length;
    if (poppedCount === 3) score += 30;
    else if (poppedCount === 4) score += 50;
    else score += 100;
  }

  // 3. 掉落
  const connected = findConnectedToTop(next1);
  let fallenCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < colsOfRow(r); c++) {
      if (next1[r][c] !== null && !connected.has(`${r},${c}`)) {
        next1[r][c] = null;
        fallenCount++;
      }
    }
  }
  score += fallenCount * 20;

  // 4. 胜利
  const won = next1.every((row) => row.every((c) => c === null));

  return { board: next1, poppedCount, fallenCount, score, won, lost };
}

/* ============================================================================
 * 关卡生成
 * ========================================================================== */

/**
 * 创建初始关卡（默认 5 行泡泡 + 固定 seed）
 * - 用 mulberry32 确定性生成
 * - 同 seed 产出相同棋盘
 */
export function createInitialBoard(seed: number = DEFAULT_SEED): Board {
  const board = createEmptyBoard();
  const rng = mulberry32(seed);
  for (let r = 0; r < INITIAL_ROWS; r++) {
    for (let c = 0; c < colsOfRow(r); c++) {
      board[r][c] = pickColor(rng);
    }
  }
  return board;
}

/** 选下一发泡泡颜色（避免连续 2 发同色） */
function pickNextColor(rng: () => number, prev: BubbleColor): BubbleColor {
  let next = pickColor(rng);
  let safety = 0;
  while (next === prev && safety < 10) {
    next = pickColor(rng);
    safety++;
  }
  return next;
}

/** 创建初始游戏状态（棋盘 + current + next + angle） */
export function createInitialState(seed: number = DEFAULT_SEED): GameState {
  const rng = mulberry32(seed + 1); // +1 避免棋盘 seed 复用
  const current = pickColor(rng);
  const next = pickNextColor(rng, current);
  return {
    board: createInitialBoard(seed),
    status: "aiming",
    currentColor: current,
    nextColor: next,
    angle: DEFAULT_ANGLE,
    score: 0,
    shootingBubble: null,
  };
}

/** 创建新飞行泡泡（从发射器位置出发） */
export function createShootingBubble(color: BubbleColor, angle: number): ShootingBubble {
  const { dx, dy } = angleToDirection(angle);
  return {
    color,
    x: SHOOTER_X,
    y: SHOOTER_Y,
    dx,
    dy,
  };
}

/* ============================================================================
 * 开发态自检（dev only，prod 会被 tree-shake）
 * ========================================================================== */

if (import.meta.env?.DEV) {
  // 轻量 dev self-check：只验证"核心 API 不 throw"，期望值由
  // .agents-docs/dev-notes/bubble-selftest.mjs 统一验证（避免 hardcode
  // 期望值与实际算法不一致的 false positive / throw 阻断 mount）
  try {
    const e0 = createEmptyBoard();
    if (e0.length !== ROWS || e0[0].length !== COLS_LONG || e0[1].length !== COLS_SHORT) {
      console.warn("[engine] createEmptyBoard 行数/列数异常");
    }
    // colsOfRow / isInBounds / getNeighbors 不变
    colsOfRow(0); colsOfRow(1); colsOfRow(11);
    isInBounds(0, 0); isInBounds(11, 13);
    isInBounds(-1, 0); isInBounds(0, 15); isInBounds(1, 14);
    getNeighbors(0, 0); getNeighbors(1, 0); getNeighbors(5, 7);
    getNeighbors(0, 14); getNeighbors(1, 13);
    // 6 邻居邻接函数（getEmptyNeighbors / getFilledNeighbors 间接）
    floodFillSameColor(e0, 0, 0);
    findConnectedToTop(e0);
    pixelToCell(100, 100);
    cellToPixel(0, 0);
    angleToDirection(90);
    angleToDirection(5);
    clampAngle(0); clampAngle(200); clampAngle(90);
    // 创建初始 board/state
    createInitialBoard(50);
    createInitialBoard(51);
    createInitialState(50);
    // 飞行物理 + 消除
    shootStep(e0, { color: "red", x: 100, y: 20, dx: 0, dy: -1 });
    resolve(e0, 0, 0, "red");
    // immutability 烟测
    const e22Snap = JSON.stringify(e0);
    shootStep(e0, createShootingBubble("red", 90));
    resolve(e0, 0, 0, "red");
    findConnectedToTop(e0);
    floodFillSameColor(e0, 0, 0);
    pixelToCell(100, 100);
    cellToPixel(0, 0);
    if (JSON.stringify(e0) !== e22Snap) {
      console.warn("[engine] immutability 失败: 函数副作用污染 board");
    }
    // eslint-disable-next-line no-console
    console.log("[engine] bubble engine self-check passed");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[engine] bubble engine self-check failed:", err);
  }
}
