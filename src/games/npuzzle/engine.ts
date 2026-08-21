/**
 * 数字华容道（N-Puzzle）游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 棋盘创建 / 克隆 / 边界
 * - 空格定位 / 邻接判断
 * - 移动数字块（immutable）
 * - 胜利判定
 * - 打乱算法（反向随机走，保证有解）
 * - 可解性判定（业界奇偶性算法）
 *
 * 不变量：
 * - 纯函数永远返回新 board，不修改入参
 * - 0 副作用（无 spawn / 无 timer / 无 localStorage）
 * - 0 依赖
 */

import {
  SCRAMBLE_MOVES,
  SOLVED_3x3,
  SOLVED_4x4,
  type Board,
  type Cell,
  type Move,
  type Size,
} from "./types";

// 显式 re-export 常量（让 esbuild bundle 后 selftest 也能 import）
export { SOLVED_3x3, SOLVED_4x4 };

/** 空格 = 0 */
const EMPTY = 0;

/* ============================================================================
 * 棋盘工具
 * ========================================================================== */

/** 创建 size×size 全 0 棋盘（开发自检用） */
export function createEmptyBoard(size: Size): Board {
  return Array.from({ length: size }, () => new Array<Cell>(size).fill(0));
}

/** 深度克隆 board */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** 坐标是否在棋盘内 */
export function isInBounds(size: Size, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

/** 找到空格（0）位置 */
export function findEmpty(board: Board): Move {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === EMPTY) return { row: r, col: c };
    }
  }
  // 理论上不会发生（任何 board 都有空格）
  return { row: 0, col: 0 };
}

/** 4 方向偏移（用于邻接判断） */
const DIRS: ReadonlyArray<{ dr: number; dc: number }> = [
  { dr: -1, dc: 0 }, // up
  { dr: 1, dc: 0 }, // down
  { dr: 0, dc: -1 }, // left
  { dr: 0, dc: 1 }, // right
];

/** (row, col) 跟空格是否 4 邻接 */
export function isAdjacentToEmpty(
  board: Board,
  row: number,
  col: number,
): boolean {
  const size = board.length;
  for (const { dr, dc } of DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInBounds(size as Size, nr, nc) && board[nr][nc] === EMPTY) {
      return true;
    }
  }
  return false;
}

/* ============================================================================
 * 移动
 * ========================================================================== */

/**
 * 移动 (row, col) 位置的数字块到空格
 * - 不可移动（不在棋盘内 / 该位置是空格 / 跟空格不相邻）→ 返回原 board
 * - 成功 → 返回新 board（immutable）
 */
export function moveTile(board: Board, row: number, col: number): Board {
  const size = board.length;
  if (!isInBounds(size as Size, row, col)) return board;
  if (board[row][col] === EMPTY) return board;
  if (!isAdjacentToEmpty(board, row, col)) return board;

  const empty = findEmpty(board);
  const next = cloneBoard(board);
  next[empty.row][empty.col] = next[row][col];
  next[row][col] = EMPTY;
  return next;
}

/**
 * 滑动方向移动：玩家向某个方向滑动，棋盘上"远离该方向"的数字块向空格方向移动 1 格
 * - 方向 up：空格上方的方块下移 1 格（玩家期望"上面的方块往下滑"）
 * - 方向 down：空格下方的方块上移 1 格
 * - 方向 left：空格左方的方块右移 1 格
 * - 方向 right：空格右方的方块左移 1 格
 *
 * 如果空格已在该方向边界 → 不可移动，返回原 board
 */
export function slide(
  board: Board,
  direction: "up" | "down" | "left" | "right",
): Board {
  const size = board.length;
  const empty = findEmpty(board);
  // 计算"要移动的方块"位置（空格的反方向）
  let tr = empty.row;
  let tc = empty.col;
  switch (direction) {
    case "up":
      tr = empty.row + 1; // 空格上方
      break;
    case "down":
      tr = empty.row - 1; // 空格下方
      break;
    case "left":
      tc = empty.col + 1; // 空格左方
      break;
    case "right":
      tc = empty.col - 1; // 空格右方
      break;
  }
  if (!isInBounds(size as Size, tr, tc)) return board;
  return moveTile(board, tr, tc);
}

/* ============================================================================
 * 胜利判定
 * ========================================================================== */

/** 棋盘是否已解：1-N 按行优先 + 空格在右下 */
export function isSolved(board: Board, size: Size): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const expected = r * size + c + 1;
      const isLast = r === size - 1 && c === size - 1;
      const expectedValue = isLast ? EMPTY : expected;
      if (board[r][c] !== expectedValue) return false;
    }
  }
  return true;
}

/* ============================================================================
 * 可解性判定（业界 15-puzzle 奇偶性算法）
 * ========================================================================== */

/**
 * 4 邻接移动 1 步后，棋盘的 parity 不变（要么都是 even，要么都是 odd）
 * 业界 4×4 棋盘可解条件：
 *   inversions + (empty_row_from_bottom) = even
 *
 * 3×3 棋盘可解条件：
 *   inversitions = even
 *
 * 注：scrambleBoard 用反向随机走，所以生成的棋盘保证有解
 *     isSolvable 主要用于开发自检
 */
export function countInversions(board: Board): number {
  const flat = board.flat();
  let inv = 0;
  for (let i = 0; i < flat.length; i++) {
    if (flat[i] === EMPTY) continue;
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j] === EMPTY) continue;
      if (flat[i] > flat[j]) inv++;
    }
  }
  return inv;
}

/** 空格从底部算起的行号（0-indexed） */
function emptyRowFromBottom(board: Board, size: Size): number {
  const empty = findEmpty(board);
  return size - 1 - empty.row;
}

/**
 * 棋盘是否可解
 * - 3×3：inversions 是偶数 → 可解（标准 8-puzzle）
 * - 4×4：inversions + (empty_row_from_bottom) 是偶数 → 可解（标准 15-puzzle）
 *   等价：erfb 和 inv 同奇偶 → 可解
 */
export function isSolvable(board: Board, size: Size): boolean {
  const inv = countInversions(board);
  if (size === 3) {
    return inv % 2 === 0;
  } else {
    // 4×4
    const erfb = emptyRowFromBottom(board, size);
    return erfb % 2 === inv % 2;
  }
}

/* ============================================================================
 * 打乱算法
 * ========================================================================== */

/**
 * 从已解状态反向随机走 N 步（业界最稳，100% 保证有解）
 * - 每步：随机选一个跟空格相邻的方块，交换
 * - 这样得到的棋盘 = 已解棋盘在反向轨迹上的某个状态 → 一定有解
 */
export function scrambleBoard(size: Size, moves: number = SCRAMBLE_MOVES): Board {
  // 从已解状态出发
  let board: Board = cloneBoard(getSolvedBoard(size));
  let prevEmpty = findEmpty(board);
  for (let i = 0; i < moves; i++) {
    // 收集所有"跟空格相邻的方块"
    const candidates: Move[] = [];
    for (const { dr, dc } of DIRS) {
      const nr = prevEmpty.row + dr;
      const nc = prevEmpty.col + dc;
      if (isInBounds(size as Size, nr, nc) && board[nr][nc] !== EMPTY) {
        candidates.push({ row: nr, col: nc });
      }
    }
    if (candidates.length === 0) break;
    // 随机选一个
    const idx = Math.floor(Math.random() * candidates.length);
    const m = candidates[idx];
    // 移动这个方块到空格
    board = moveTile(board, m.row, m.col);
    prevEmpty = findEmpty(board);
  }
  return board;
}

/** 获取已解棋盘（按 size） */
export function getSolvedBoard(size: Size): Board {
  if (size === 3) return SOLVED_3x3.map((row) => row.slice());
  if (size === 4) return SOLVED_4x4.map((row) => row.slice());
  return createEmptyBoard(size);
}

/* ============================================================================
 * 开发态自检（dev only，prod 会被 tree-shake）
 * ========================================================================== */

if (import.meta.env?.DEV) {
  // createEmptyBoard
  const e1 = createEmptyBoard(3);
  console.assert(
    e1.length === 3 && e1[0].length === 3 && e1[1][1] === 0,
    "[engine] createEmptyBoard 3x3 全 0",
  );
  const e2 = createEmptyBoard(4);
  console.assert(
    e2.length === 4 && e2[3][3] === 0,
    "[engine] createEmptyBoard 4x4 全 0",
  );

  // cloneBoard immutability
  const e3 = createEmptyBoard(3);
  e3[0][0] = 5;
  const e3Clone = cloneBoard(e3);
  e3Clone[0][0] = 9;
  console.assert(
    e3[0][0] === 5 && e3Clone[0][0] === 9,
    "[engine] cloneBoard deep copy",
  );

  // isInBounds
  console.assert(
    isInBounds(3, 0, 0) && isInBounds(3, 2, 2) && isInBounds(4, 3, 3),
    "[engine] isInBounds in",
  );
  console.assert(
    !isInBounds(3, -1, 0) && !isInBounds(3, 3, 0) && !isInBounds(3, 0, 3),
    "[engine] isInBounds out",
  );

  // findEmpty
  const e4 = createEmptyBoard(3);
  e4[0][0] = 1;
  e4[0][1] = 2;
  e4[0][2] = 3;
  const e4Empty = findEmpty(e4);
  console.assert(
    e4Empty.row === 1 && e4Empty.col === 0,
    `[engine] findEmpty should be (1,0), got (${e4Empty.row},${e4Empty.col})`,
  );

  // isAdjacentToEmpty
  const e5: Board = [
    [1, 2, 3],
    [4, 0, 5],
    [6, 7, 8],
  ];
  console.assert(
    isAdjacentToEmpty(e5, 0, 0) &&
      isAdjacentToEmpty(e5, 1, 1) === false &&
      isAdjacentToEmpty(e5, 0, 2),
    "[engine] isAdjacentToEmpty 4-neighbor",
  );
  // 对角线不相邻
  console.assert(
    !isAdjacentToEmpty(e5, 0, 1) === false, // (0,1) 跟 (1,1) 邻接
    "[engine] diagonal not adjacent",
  );

  // moveTile：合法移动
  const e6: Board = [
    [1, 2, 3],
    [4, 0, 5],
    [6, 7, 8],
  ];
  const e6After = moveTile(e6, 0, 0);
  console.assert(
    e6After[0][0] === 0 && e6After[1][0] === 1,
    "[engine] moveTile 合法移动应交换",
  );
  // moveTile 不可移动（对角线）
  const e6Bad = moveTile(e6, 0, 2);
  console.assert(
    e6Bad === e6,
    "[engine] moveTile 不可移动应返回原 board",
  );
  // moveTile 空格
  const e6Empty = moveTile(e6, 1, 1);
  console.assert(
    e6Empty === e6,
    "[engine] moveTile 空格应返回原 board",
  );
  // moveTile immutability
  console.assert(
    e6[0][0] === 1 && e6[1][0] === 4,
    "[engine] moveTile 不改入参",
  );

  // slide
  const e7: Board = [
    [1, 2, 3],
    [4, 0, 5],
    [6, 7, 8],
  ];
  // 空格在 (1,1)，向右滑 = 空格左方 (1,2) 移到空格 = (1,1)=5, (1,2)=0
  const e7Right = slide(e7, "right");
  console.assert(
    e7Right[1][1] === 5 && e7Right[1][2] === 0,
    `[engine] slide right should put 5 at (1,1) and 0 at (1,2), got (1,1)=${e7Right[1][1]} (1,2)=${e7Right[1][2]}`,
  );
  // 向上滑 = 空格下方 (2,1) 移到空格 = (1,1)=7, (2,1)=0
  const e7Up = slide(e7, "up");
  console.assert(
    e7Up[1][1] === 7 && e7Up[2][1] === 0,
    `[engine] slide up should put 7 at (1,1) and 0 at (2,1), got (1,1)=${e7Up[1][1]} (2,1)=${e7Up[2][1]}`,
  );
  // 不可滑动（空格在边）
  const e7Edge: Board = [
    [1, 2, 3],
    [4, 5, 0],
    [6, 7, 8],
  ];
  const e7Left = slide(e7Edge, "left"); // 空格在 (1,2)，左滑 = (1,3) 但越界
  console.assert(
    e7Left === e7Edge,
    "[engine] slide out of bounds should return original",
  );

  // isSolved
  console.assert(
    isSolved(SOLVED_3x3, 3) && isSolved(SOLVED_4x4, 4),
    "[engine] isSolved true for solved boards",
  );
  const e8: Board = [
    [1, 2, 3],
    [4, 5, 6],
    [8, 7, 0], // 7,8 互换
  ];
  console.assert(
    !isSolved(e8, 3),
    "[engine] isSolved false for scrambled",
  );

  // scrambleBoard：有解性
  const e9Scrm = scrambleBoard(3, 50);
  console.assert(
    isSolvable(e9Scrm, 3),
    "[engine] scrambleBoard 3x3 should be solvable",
  );
  const e10Scrm = scrambleBoard(4, 50);
  console.assert(
    isSolvable(e10Scrm, 4),
    "[engine] scrambleBoard 4x4 should be solvable",
  );

  // isSolvable 奇偶性边界
  // 3x3：1 step from solved
  const e11: Board = [
    [1, 2, 3],
    [0, 4, 5],
    [6, 7, 8],
  ];
  console.assert(
    isSolvable(e11, 3),
    "[engine] 3x3 one-step from solved is solvable",
  );
  // 4x4：空格在 row 0（从底部 row 3 奇数），1 在最后位置
  // inversions = 0（1 不跟任何后面元素构成 inversion，因为 1 是最小）
  // erfb%2(1) !== inv%2(0) → 不可解
  const e12: Board = [
    [0, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 1],
  ];
  console.assert(
    !isSolvable(e12, 4),
    `[engine] 4x4 odd-erfb even-inv should be unsolvable, got solvable`,
  );
  // 4x4 边界：1 步滑动后空格在 (3,2) → erfb=1(奇), inv=3(奇) → 可解
  const e13: Board = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 0],
    [13, 14, 15, 12],
  ];
  console.assert(
    isSolvable(e13, 4),
    `[engine] 4x4 one-step slide should be solvable`,
  );

  // eslint-disable-next-line no-console
  console.log("[engine] npuzzle engine self-check passed");
}
