/**
 * 2048 游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 棋盘创建 / 克隆
 * - 单行滑动 + 合并（核心算法，4 方向复用）
 * - 4 方向统一移动接口（rotate 矩阵 → slideLineLeft → rotate back）
 * - 胜负判定（hasWon / canMove）
 * - 随机 tile 生成（90% 2 / 10% 4）
 *
 * 不变量：
 * - 纯函数永远返回新 grid，不修改入参（immutability）
 * - 移动无效（grid 无变化）不生成新 tile
 * - 移动有效且产生合并 → score 增加合并值之和
 */

import { BOARD_SIZE, PROBABILITY_OF_FOUR } from "./types";
import type { Grid, Direction, MoveResult, Cell } from "./types";

/* ============================================================================
 * 棋盘工具
 * ========================================================================== */

/** 创建 4×4 全 0 棋盘 */
export function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () =>
    new Array<Cell>(BOARD_SIZE).fill(0),
  );
}

/** 深度克隆 grid（避免共享引用） */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

/** 比较两个 grid 是否相等（用于判定 moved） */
export function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

/** 找出所有空格位置 [row, col] */
export function getEmptyCells(grid: Grid): Array<[number, number]> {
  const empties: Array<[number, number]> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === 0) empties.push([r, c]);
    }
  }
  return empties;
}

/** 是否棋盘已满 */
export function isFull(grid: Grid): boolean {
  return getEmptyCells(grid).length === 0;
}

/* ============================================================================
 * 随机 tile 生成
 * ========================================================================== */

/**
 * 在随机空格放一个新 tile（90% 概率 = 2，10% 概率 = 4）
 * 如果棋盘已满，返回原 grid（不抛错）
 */
export function addRandomTile(grid: Grid, rng: () => number = Math.random): Grid {
  const empties = getEmptyCells(grid);
  if (empties.length === 0) return grid;
  const idx = Math.floor(rng() * empties.length);
  const [r, c] = empties[idx];
  const value = rng() < PROBABILITY_OF_FOUR ? 4 : 2;
  const next = cloneGrid(grid);
  next[r][c] = value;
  return next;
}

/** 生成 2 个初始 tile（开局） */
export function spawnInitialTiles(rng: () => number = Math.random): Grid {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid, rng);
  grid = addRandomTile(grid, rng);
  return grid;
}

/* ============================================================================
 * 核心：单行滑动 + 合并
 * ========================================================================== */

/**
 * 单行（4 元素）向左滑动 + 合并
 * 算法：过滤 0 → 相邻同值合并（合并后空格不参与下次合并）→ 补 0 到尾部
 * 例：
 *   [2, 2, 4, 4]    → [4, 8, 0, 0]   (合并 2+2=4, 4+4=8, score += 4+8=12)
 *   [2, 2, 2, 2]    → [4, 4, 0, 0]   (合并 2+2=4, 2+2=4, score += 4+4=8)
 *   [2, 0, 2, 0]    → [4, 0, 0, 0]   (跳过空格)
 *   [2, 2, 2, 4]    → [4, 2, 4, 0]   (不重复合并：第 1 个 2+2=4 后，第 3 个 2 不与 4 合并)
 *   [4, 4, 8, 16]   → [8, 8, 16, 0]
 *   [0, 0, 0, 0]    → [0, 0, 0, 0]
 */
export function slideLineLeft(line: Cell[]): { line: Cell[]; score: number } {
  // 1. 过滤 0
  const filtered = line.filter((v) => v !== 0);
  // 2. 相邻同值合并（合并后空格不参与下次合并 = 用 splice 而非 skip）
  const merged: Cell[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const sum = filtered[i] * 2;
      merged.push(sum);
      score += sum;
      i += 2; // 跳过后一个
    } else {
      merged.push(filtered[i]);
      i += 1;
    }
  }
  // 3. 补 0 到尾部
  while (merged.length < BOARD_SIZE) merged.push(0);
  return { line: merged, score };
}

/* ============================================================================
 * 矩阵旋转（4 方向复用 slideLineLeft）
 * ========================================================================== */

/** 顺时针 90° 旋转 grid */
export function rotateClockwise(grid: Grid): Grid {
  const next = createEmptyGrid();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      next[c][BOARD_SIZE - 1 - r] = grid[r][c];
    }
  }
  return next;
}

/** 逆时针 90° 旋转 grid */
export function rotateCounterClockwise(grid: Grid): Grid {
  const next = createEmptyGrid();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      next[BOARD_SIZE - 1 - c][r] = grid[r][c];
    }
  }
  return next;
}

/* ============================================================================
 * 4 方向统一移动接口
 * ========================================================================== */

/**
 * 向指定方向移动一格，返回新 grid + moved 标记 + scoreGained
 * 4 方向映射策略：rotate grid → slideLineLeft → rotate back
 *   - left  : 0 次 rotate
 *   - down  : 1 次逆时针（让"下"变成"左"）
 *   - right : 2 次逆时针（让"右"变成"左"）
 *   - up    : 1 次顺时针（让"上"变成"左"）
 */
export function move(grid: Grid, dir: Direction): MoveResult {
  let workGrid: Grid;
  let rotateTimes: number;
  let rotateDir: "cw" | "ccw";

  switch (dir) {
    case "left":
      workGrid = cloneGrid(grid);
      rotateTimes = 0;
      rotateDir = "cw";
      break;
    case "right":
      workGrid = cloneGrid(grid);
      rotateTimes = 2;
      rotateDir = "ccw";
      break;
    case "up":
      // "上" 映射到 "左"：逆时针 90° 让原 row 0 变成 col 0
      workGrid = cloneGrid(grid);
      rotateTimes = 1;
      rotateDir = "ccw";
      break;
    case "down":
      // "下" 映射到 "左"：顺时针 90° 让原 row 3 变成 col 0
      workGrid = cloneGrid(grid);
      rotateTimes = 1;
      rotateDir = "cw";
      break;
  }

  // rotate to "left" orientation
  for (let i = 0; i < rotateTimes; i++) {
    workGrid = rotateDir === "cw" ? rotateClockwise(workGrid) : rotateCounterClockwise(workGrid);
  }

  // slide each row left + accumulate score
  let totalScore = 0;
  const newRows: Cell[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const { line, score } = slideLineLeft(workGrid[r]);
    newRows.push(line);
    totalScore += score;
  }
  workGrid = newRows;

  // rotate back
  for (let i = 0; i < rotateTimes; i++) {
    workGrid = rotateDir === "cw" ? rotateCounterClockwise(workGrid) : rotateClockwise(workGrid);
  }

  const moved = !gridsEqual(grid, workGrid);
  return { grid: workGrid, moved, score: totalScore };
}

/* ============================================================================
 * 胜负判定
 * ========================================================================== */

/** 是否出现 2048（或更大） */
export function hasWon(grid: Grid): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] >= 2048) return true;
    }
  }
  return false;
}

/** 找出最大 tile 值（用于显示成就 + 颜色档位） */
export function getMaxTile(grid: Grid): number {
  let max = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] > max) max = grid[r][c];
    }
  }
  return max;
}

/** 是否能继续移动（有空位 或 任意方向能合并） */
export function canMove(grid: Grid): boolean {
  if (!isFull(grid)) return true;
  // 检查所有相邻（横向 + 纵向）是否有同值
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = grid[r][c];
      // 右邻
      if (c + 1 < BOARD_SIZE && grid[r][c + 1] === v) return true;
      // 下邻
      if (r + 1 < BOARD_SIZE && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

/* ============================================================================
 * 开发态自检（dev only，prod 会被 tree-shake）
 * ========================================================================== */

if (import.meta.env?.DEV) {
  // slideLineLeft 边界
  const t1 = slideLineLeft([2, 2, 4, 4]);
  console.assert(
    t1.line.join(",") === "4,8,0,0" && t1.score === 12,
    `[engine] slideLineLeft [2,2,4,4] → [4,8,0,0] score 12, got [${t1.line.join(",")}] score ${t1.score}`,
  );

  const t2 = slideLineLeft([2, 2, 2, 2]);
  console.assert(
    t2.line.join(",") === "4,4,0,0" && t2.score === 8,
    `[engine] slideLineLeft [2,2,2,2] → [4,4,0,0] score 8, got [${t2.line.join(",")}] score ${t2.score}`,
  );

  const t3 = slideLineLeft([2, 0, 2, 0]);
  console.assert(
    t3.line.join(",") === "4,0,0,0" && t3.score === 4,
    `[engine] slideLineLeft [2,0,2,0] → [4,0,0,0] score 4, got [${t3.line.join(",")}] score ${t3.score}`,
  );

  const t4 = slideLineLeft([2, 2, 2, 4]);
  console.assert(
    t4.line.join(",") === "4,2,4,0" && t4.score === 4,
    `[engine] slideLineLeft [2,2,2,4] → [4,2,4,0] score 4 (no double merge), got [${t4.line.join(",")}] score ${t4.score}`,
  );

  const t5 = slideLineLeft([4, 4, 8, 16]);
  console.assert(
    t5.line.join(",") === "8,8,16,0" && t5.score === 8,
    `[engine] slideLineLeft [4,4,8,16] → [8,8,16,0] score 8, got [${t5.line.join(",")}] score ${t5.score}`,
  );

  // move 4 方向
  const g1: Grid = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const m1 = move(g1, "right");
  console.assert(
    m1.moved && m1.grid[0].join(",") === "0,0,0,2",
    `[engine] move right [2,0,0,0,...] → [0,0,0,2,...], got [${m1.grid[0].join(",")}] moved=${m1.moved}`,
  );

  const g2: Grid = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const m2 = move(g2, "down");
  console.assert(
    m2.moved && m2.grid[3][0] === 0 && m2.grid[2][0] === 0,
    `[engine] move down merges column 0 → 4 at [2,0], got row 2=[${m2.grid[2].join(",")}] row 3=[${m2.grid[3].join(",")}]`,
  );
  // 实际期望: 2 个 2 向下合并 → 第 2 行 (index 3) = 4 + 第 1 行 (index 2) = 0
  // 等等，down 之后 4 在哪？需要仔细验证
  // 初始: [2,0,0,0] [2,0,0,0] [0,0,0,0] [0,0,0,0]
  // down = 2 个 2 落到第 3 行 (index 3) 合并为 4
  console.assert(
    m2.grid[3][0] === 4 && m2.score === 4,
    `[engine] move down → 4 at [3,0] score 4, got [3,0]=${m2.grid[3][0]} score=${m2.score}`,
  );

  // canMove 边界：满 + 无可合并
  const fullNoMerge: Grid = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  console.assert(
    !canMove(fullNoMerge),
    `[engine] canMove full no-merge → false, got true`,
  );

  // canMove 边界：满 + 有可合并
  const fullWithMerge: Grid = [
    [2, 2, 4, 8],
    [4, 8, 2, 4],
    [8, 4, 4, 2],
    [4, 2, 8, 4],
  ];
  console.assert(
    canMove(fullWithMerge),
    `[engine] canMove full with-merge → true, got false`,
  );

  // hasWon
  const won: Grid = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2048, 2],
    [4, 8, 16, 32],
  ];
  console.assert(
    hasWon(won),
    `[engine] hasWon grid with 2048 → true, got false`,
  );

  const notWon: Grid = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 2],
    [4, 8, 16, 32],
  ];
  console.assert(
    !hasWon(notWon),
    `[engine] hasWon grid without 2048 → false, got true`,
  );

  // immutability
  const original: Grid = [
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  move(original, "right");
  console.assert(
    original[0][0] === 2,
    `[engine] move should not mutate input, got [0,0]=${original[0][0]}`,
  );

  // eslint-disable-next-line no-console
  console.log("[engine] 2048 engine self-check passed");
}
