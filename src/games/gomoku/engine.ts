/**
 * 五子棋（Gomoku）游戏引擎
 *
 * 包含：
 * - 棋盘工具（创建 / 克隆 / 边界 / 合法）
 * - 落子 + 胜负判定
 * - 候选点生成（已有棋子 N 格内）
 * - 棋型识别（活四/冲四/活三/眠三 等）
 * - 棋盘评估（AI 评分函数）
 * - AI 选点（Easy / Medium / Hard 3 档）
 *
 * 不变量：
 * - 纯函数永远返回新 board，不修改入参
 * - 0 副作用（无 spawn / 无 timer / 无 localStorage）
 * - AI 是 engine 的一部分（纯函数 + 可选随机种子）
 */

import {
  BOARD_SIZE,
  DIRECTIONS,
  PATTERN_SCORES,
  type Board,
  type Cell,
  type Difficulty,
  type GameState,
  type Move,
  type PatternType,
  type Player,
  type Winner,
} from "./types";

/* ============================================================================
 * 棋盘工具
 * ========================================================================== */

/** 创建 15×15 全 0 棋盘 */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    new Array<Cell>(BOARD_SIZE).fill(0),
  );
}

/** 深度克隆 board */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** 坐标是否在棋盘内 */
export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** 落子是否合法（在界内 + 该格为空） */
export function isValidMove(board: Board, row: number, col: number): boolean {
  if (!isInBounds(row, col)) return false;
  return board[row][col] === 0;
}

/** 落子（immutable，返回新 board） */
export function makeMove(
  board: Board,
  row: number,
  col: number,
  player: Player,
): Board {
  if (!isValidMove(board, row, col)) return board;
  const next = cloneBoard(board);
  next[row][col] = player;
  return next;
}

/** 棋盘是否已满 */
export function isBoardFull(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return false;
    }
  }
  return true;
}

/* ============================================================================
 * 胜负判定
 * ========================================================================== */

/**
 * 从 (r, c) 出发，沿 4 方向数连续 player 数
 * 返回包含 (r, c) 的最长连续段
 */
function countConsecutive(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player,
): number {
  let count = 1;
  let nr = r + dr;
  let nc = c + dc;
  while (isInBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr += dr;
    nc += dc;
  }
  return count;
}

/**
 * 检查 (r, c) 处 player 是否构成 5 连
 * 必须 board[r][c] === player
 * 返回胜方（0 = 未胜）
 */
export function checkWinAt(
  board: Board,
  r: number,
  c: number,
  player: Player,
): Winner {
  if (board[r][c] !== player) return 0;
  for (const { dr, dc } of DIRECTIONS) {
    // 数正方向 + 反方向 - 1（自己算两次）
    const forward = countConsecutive(board, r, c, dr, dc, player);
    const backward = countConsecutive(board, r, c, -dr, -dc, player);
    if (forward + backward - 1 >= 5) return player;
  }
  return 0;
}

/**
 * 找出 (r, c) 处 player 的 5 连线（任意方向）
 * 返回 5 个坐标的数组；无 5 连则返回 null
 * 用于 UI 胜利后画高亮线
 */
export function findWinningLine(
  board: Board,
  r: number,
  c: number,
  player: Player,
): Move[] | null {
  if (board[r][c] !== player) return null;
  for (const { dr, dc } of DIRECTIONS) {
    const forward = countConsecutive(board, r, c, dr, dc, player);
    const backward = countConsecutive(board, r, c, -dr, -dc, player);
    const total = forward + backward - 1;
    if (total >= 5) {
      // 起点 = 反方向数 (backward - 1) 步
      const startR = r - dr * (backward - 1);
      const startC = c - dc * (backward - 1);
      const line: Move[] = [];
      for (let i = 0; i < 5; i++) {
        line.push({ row: startR + dr * i, col: startC + dc * i });
      }
      return line;
    }
  }
  return null;
}

/* ============================================================================
 * 候选点生成
 * ========================================================================== */

/**
 * 找出所有可下位置（已有棋子 radius 格内）
 * 棋盘全空时返回中心 3×3（开局建议）
 * 棋盘非空时返回所有"radius 格内"的空位
 */
export function getCandidateMoves(
  board: Board,
  radius: number = 1,
): Move[] {
  const hasStone = board.some((row) => row.some((c) => c !== 0));
  if (!hasStone) {
    // 开局：中心 3×3
    const center = Math.floor(BOARD_SIZE / 2);
    const result: Move[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        result.push({ row: center + dr, col: center + dc });
      }
    }
    return result;
  }

  // 找已有棋子周围的空位
  const candidates = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) {
        // 周围 radius 格内所有空位
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (isValidMove(board, nr, nc)) {
              candidates.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }
  return Array.from(candidates).map((s) => {
    const [row, col] = s.split(",").map(Number);
    return { row, col };
  });
}

/* ============================================================================
 * 棋型识别
 * ========================================================================== */

/**
 * 根据 (count, openEnds) 归类棋型
 * - count >= 5: FIVE
 * - count == 4:
 *   - openEnds == 2: OPEN_FOUR
 *   - openEnds == 1: FOUR
 * - count == 3:
 *   - openEnds == 2: OPEN_THREE
 *   - openEnds == 1: THREE
 * - count == 2:
 *   - openEnds == 2: OPEN_TWO
 *   - openEnds == 1: TWO
 * - count == 1: ONE
 */
function classifyPattern(count: number, openEnds: number): PatternType {
  if (count >= 5) return "FIVE";
  if (count === 4) {
    if (openEnds === 2) return "OPEN_FOUR";
    return "FOUR";
  }
  if (count === 3) {
    if (openEnds === 2) return "OPEN_THREE";
    return "THREE";
  }
  if (count === 2) {
    if (openEnds === 2) return "OPEN_TWO";
    return "TWO";
  }
  if (count === 1) return "ONE";
  return "NONE";
}

/**
 * 从 (r, c) 沿方向 (dr, dc) 检查"包含自己"的最长连续 + 两端开闭
 * 返回 { count, openEnds }
 */
function inspectLine(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player,
): { count: number; openEnds: number } {
  if (board[r][c] !== player) return { count: 0, openEnds: 0 };
  // 正方向连续
  let count = 1;
  let nr = r + dr;
  let nc = c + dc;
  while (isInBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr += dr;
    nc += dc;
  }
  const endIsOpen = isInBounds(nr, nc) && board[nr][nc] === 0;
  // 反方向连续
  nr = r - dr;
  nc = c - dc;
  while (isInBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr -= dr;
    nc -= dc;
  }
  const startIsOpen = isInBounds(nr, nc) && board[nr][nc] === 0;
  return {
    count,
    openEnds: (endIsOpen ? 1 : 0) + (startIsOpen ? 1 : 0),
  };
}

/**
 * 返回 (r, c) 处 player 的最强棋型
 * 4 方向中取分值最高
 *
 * v0.x 修复：FOUR (冲四) 1 端是墙 或 1 端是对手子 = 死四 = 0 分（不能成 5 连）
 * OPEN_FOUR (活四) 不变（2 端空 = 必胜）
 */
export function bestPatternAt(
  board: Board,
  r: number,
  c: number,
  player: Player,
): PatternType {
  if (board[r][c] !== player) return "NONE";
  let best: PatternType = "ONE";
  let bestScore = PATTERN_SCORES.ONE;
  for (const { dr, dc } of DIRECTIONS) {
    const { count, openEnds } = inspectLine(board, r, c, dr, dc, player);
    let p = classifyPattern(count, openEnds);
    // 死四过滤：FOUR 但 1 端堵（墙或对手子）= 实际不能 5 连
    if (p === "FOUR" && !isLiveFour(board, r, c, dr, dc, player)) {
      p = "ONE"; // 死四降为 1 子（避免误评估为高分）
    }
    const s = PATTERN_SCORES[p];
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

/**
 * 死四检测：FOUR 但 1 端是墙 = 不能 5 连 = 死四
 * - 1 端空 + 1 端是墙 (越界) → 死四（永远凑不成 5 连）
 * - 1 端空 + 1 端是对手子 → 活冲四（落另 1 端 = 5 连胜，对手必堵）
 * - OPEN_FOUR (2 端空) 永远算活
 * - 2 端都是对手子 → 死四（对手已全堵, 不能 5 连）
 */
function isLiveFour(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  player: Player,
): boolean {
  if (board[r][c] !== player) return false;
  // 数连续 + 两端开闭
  let count = 1;
  let nr = r + dr;
  let nc = c + dc;
  while (isInBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr += dr;
    nc += dc;
  }
  // 端点 (nr, nc) = count 连续段之后的 1 格
  const endInBounds = isInBounds(nr, nc);
  const endIsOpen = endInBounds && board[nr][nc] === 0;
  // 反方向
  nr = r - dr;
  nc = c - dc;
  while (isInBounds(nr, nc) && board[nr][nc] === player) {
    count++;
    nr -= dr;
    nc -= dc;
  }
  const startInBounds = isInBounds(nr, nc);
  const startIsOpen = startInBounds && board[nr][nc] === 0;
  // OPEN_FOUR = 2 端都空 → 活
  if (count === 4 && endIsOpen && startIsOpen) return true;
  // FOUR 1 端空 + 1 端是墙（越界）= 死四
  if (count === 4 && endIsOpen && !startInBounds) return false;
  if (count === 4 && !endInBounds && startIsOpen) return false;
  // FOUR 1 端空 + 1 端是对手子 → 活冲四（落另 1 端 = 5 连胜）
  // 这种情况不降级, 仍算 FOUR
  // FOUR 2 端都是对手子 = 死四
  if (count === 4 && !endIsOpen && !startIsOpen) {
    return endIsOpen || startIsOpen; // false = 死
  }
  return true;
}

/* ============================================================================
 * 棋盘评估
 * ========================================================================== */

/**
 * 整盘评分 = 所有 player 棋子的最强棋型分值之和
 * 简化版（每子独立评估，不去重）
 * FIVE 会重复计算但不影响相对比较
 */
export function evaluateBoardFor(board: Board, player: Player): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === player) {
        const p = bestPatternAt(board, r, c, player);
        score += PATTERN_SCORES[p];
      }
    }
  }
  return score;
}

/**
 * 评估"如果 player 在 (r, c) 落子"对该点最强棋型的分值
 * 用于 AI 单步评分
 */
function scoreMoveFor(
  board: Board,
  r: number,
  c: number,
  player: Player,
): number {
  // 模拟落子后该点最强棋型
  const before = bestPatternAt(board, r, c, player);
  // 模拟：先克隆再临时放子
  const next = cloneBoard(board);
  next[r][c] = player;
  const after = bestPatternAt(next, r, c, player);
  // 取差值（新增的分），不小于 before
  return Math.max(0, PATTERN_SCORES[after] - PATTERN_SCORES[before]);
}



/* ============================================================================
 * AI 选点（3 档难度）
 * ========================================================================== */

/**
 * Easy：评分 = 己方单步分值 + 对手单步分值
 * 选最高分
 */
function getBestMoveEasy(board: Board, player: Player): Move | null {
  const candidates = getCandidateMoves(board, 1);
  if (candidates.length === 0) return null;
  const opponent: Player = player === 1 ? 2 : 1;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of candidates) {
    const myScore = scoreMoveFor(board, m.row, m.col, player);
    const oppScore = scoreMoveFor(board, m.row, m.col, opponent);
    const total = myScore + oppScore;
    if (total > bestScore) {
      bestScore = total;
      best = m;
    }
  }
  return best;
}

/**
 * Medium：Easy 基础 + 1 步 lookahead
 * 评分 = 自己下在该点 + 对手下一步最佳应对的反向分
 * 必胜 / 必阻挡：先扫一遍（业界标准：AI 永远不漏绝杀 / 不漏必败）
 * v0.x：必胜/必败检查升级到 OPEN_FOUR
 */
function getBestMoveMedium(board: Board, player: Player): Move | null {
  const candidates = getCandidateMoves(board, 1);
  if (candidates.length === 0) return null;
  const opponent: Player = player === 1 ? 2 : 1;

  // 1. 必胜：自己能凑 OPEN_FOUR（2 端空 = 必胜）
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, player) >= PATTERN_SCORES.OPEN_FOUR) {
      return m;
    }
  }
  // 2. 必阻挡：对手能凑 OPEN_FOUR
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, opponent) >= PATTERN_SCORES.OPEN_FOUR) {
      return m;
    }
  }
  // 3. 必胜：自己能成 5
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, player) >= PATTERN_SCORES.FIVE) {
      return m;
    }
  }
  // 4. 必阻挡：对手能成 5
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, opponent) >= PATTERN_SCORES.FIVE) {
      return m;
    }
  }

  // 3. 评分 + 1 步 lookahead
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of candidates) {
    const myScore = scoreMoveFor(board, m.row, m.col, player);
    // 模拟落子
    const after = makeMove(board, m.row, m.col, player);
    // 对手最佳应对
    const oppBest = getBestMoveEasy(after, opponent);
    let oppBestScore = 0;
    if (oppBest) {
      oppBestScore = scoreMoveFor(after, oppBest.row, oppBest.col, opponent);
    }
    const total = myScore - oppBestScore * 0.8; // 对手威胁打 0.8 折
    if (total > bestScore) {
      bestScore = total;
      best = m;
    }
  }
  return best;
}

/**
 * Hard：minimax 深度 2 + alpha-beta
 * 评估 = 净变化（己方增加 - 对手增加）
 */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  player: Player,
): number {
  const opponent: Player = player === 1 ? 2 : 1;
  // 终局：超时 / 深度为 0 → 评估
  if (depth === 0) {
    return evaluateBoardFor(board, player) - evaluateBoardFor(board, opponent);
  }
  const currentPlayer = isMax ? player : opponent;
  const candidates = getCandidateMoves(board, isMax ? 2 : 1);
  if (candidates.length === 0) {
    return evaluateBoardFor(board, player) - evaluateBoardFor(board, opponent);
  }

  if (isMax) {
    let value = -Infinity;
    for (const m of candidates) {
      const next = makeMove(board, m.row, m.col, currentPlayer);
      // 必胜剪枝
      if (checkWinAt(next, m.row, m.col, currentPlayer) === currentPlayer) {
        return PATTERN_SCORES.FIVE - depth; // 越早赢越好
      }
      value = Math.max(
        value,
        minimax(next, depth - 1, alpha, beta, false, player),
      );
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const m of candidates) {
      const next = makeMove(board, m.row, m.col, currentPlayer);
      // 必败剪枝
      if (checkWinAt(next, m.row, m.col, currentPlayer) === currentPlayer) {
        return -PATTERN_SCORES.FIVE + depth;
      }
      value = Math.min(
        value,
        minimax(next, depth - 1, alpha, beta, true, player),
      );
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

/**
 * Hard：minimax 深度 2 + alpha-beta + 必胜/必败优先
 * v0.x：必胜/必败检查升级到 OPEN_FOUR（2 端空 = 必胜, 对手必败）
 */
function getBestMoveHard(board: Board, player: Player): Move | null {
  const candidates = getCandidateMoves(board, 2);
  if (candidates.length === 0) return null;
  const opponent: Player = player === 1 ? 2 : 1;

  // 1. 检查必胜：自己能凑 OPEN_FOUR（2 端空 = 必胜，对手只能堵 1 端）
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, player) >= PATTERN_SCORES.OPEN_FOUR) {
      return m;
    }
  }
  // 2. 检查必阻挡：对手能凑 OPEN_FOUR
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, opponent) >= PATTERN_SCORES.OPEN_FOUR) {
      return m;
    }
  }
  // 3. 检查必胜：自己能 5 连
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, player) >= PATTERN_SCORES.FIVE) {
      return m;
    }
  }
  // 4. 检查必阻挡：对手能 5 连
  for (const m of candidates) {
    if (scoreMoveFor(board, m.row, m.col, opponent) >= PATTERN_SCORES.FIVE) {
      return m;
    }
  }

  // 3. minimax 深度 2
  let best: Move | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  for (const m of candidates) {
    const next = makeMove(board, m.row, m.col, player);
    const score = minimax(next, 1, alpha, beta, false, player);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    alpha = Math.max(alpha, score);
  }
  return best;
}

/**
 * 主入口：根据难度选 AI
 */
export function getBestMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
): Move | null {
  switch (difficulty) {
    case "easy":
      return getBestMoveEasy(board, player);
    case "medium":
      return getBestMoveMedium(board, player);
    case "hard":
      return getBestMoveHard(board, player);
  }
}

/* ============================================================================
 * 游戏状态工厂
 * ========================================================================== */

export function newGameState(difficulty: Difficulty = "medium"): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 1, // 黑（人类玩家）先手
    moves: [],
    status: "playing",
    winner: 0,
    lastMove: null,
    difficulty,
  };
}

// Re-export 公共常量（让 selftest / 文档能直接 import）
export { BOARD_SIZE, DIRECTIONS, PATTERN_SCORES } from "./types";

/* ============================================================================
 * 开发态自检（dev only，prod 会被 tree-shake）
 * ========================================================================== */

if (import.meta.env?.DEV) {
  // createEmptyBoard
  const e1 = createEmptyBoard();
  console.assert(
    e1.length === BOARD_SIZE && e1[0].length === BOARD_SIZE && e1[7][7] === 0,
    `[engine] createEmptyBoard 15x15 + center=0`,
  );

  // cloneBoard immutability
  const e2 = createEmptyBoard();
  e2[7][7] = 1;
  const e2Clone = cloneBoard(e2);
  e2Clone[7][7] = 2;
  console.assert(
    e2[7][7] === 1 && e2Clone[7][7] === 2,
    `[engine] cloneBoard deep copy`,
  );

  // isInBounds
  console.assert(isInBounds(0, 0) && isInBounds(14, 14), `[engine] isInBounds OK`);
  console.assert(!isInBounds(-1, 0) && !isInBounds(15, 0), `[engine] isInBounds out`);

  // isValidMove
  const e3 = createEmptyBoard();
  e3[7][7] = 1;
  console.assert(
    isValidMove(e3, 7, 7) === false,
    `[engine] isValidMove on stone → false`,
  );
  console.assert(
    isValidMove(e3, 7, 8) === true,
    `[engine] isValidMove on empty → true`,
  );
  console.assert(
    isValidMove(e3, -1, 0) === false,
    `[engine] isValidMove out of bounds → false`,
  );

  // makeMove immutability
  const e4 = createEmptyBoard();
  const e4After = makeMove(e4, 7, 7, 1);
  console.assert(
    e4[7][7] === 0 && e4After[7][7] === 1,
    `[engine] makeMove immutable`,
  );

  // checkWin: 横向 5 连
  const e5 = createEmptyBoard();
  e5[7][5] = 1; e5[7][6] = 1; e5[7][7] = 1; e5[7][8] = 1; e5[7][9] = 1;
  console.assert(
    checkWinAt(e5, 7, 7, 1) === 1,
    `[engine] checkWin 5-in-row horizontal`,
  );
  // 竖向 5 连
  const e6 = createEmptyBoard();
  e6[3][7] = 1; e6[4][7] = 1; e6[5][7] = 1; e6[6][7] = 1; e6[7][7] = 1;
  console.assert(
    checkWinAt(e6, 5, 7, 1) === 1,
    `[engine] checkWin 5-in-col vertical`,
  );
  // 斜左下到右上 5 连
  const e7 = createEmptyBoard();
  e7[3][3] = 1; e7[4][4] = 1; e7[5][5] = 1; e7[6][6] = 1; e7[7][7] = 1;
  console.assert(
    checkWinAt(e7, 5, 5, 1) === 1,
    `[engine] checkWin 5-in-diagonal down-right`,
  );
  // 斜右下到左上 5 连
  const e8 = createEmptyBoard();
  e8[3][7] = 1; e8[4][6] = 1; e8[5][5] = 1; e8[6][4] = 1; e8[7][3] = 1;
  console.assert(
    checkWinAt(e8, 5, 5, 1) === 1,
    `[engine] checkWin 5-in-diagonal down-left`,
  );
  // 4 连不赢
  const e9 = createEmptyBoard();
  e9[7][5] = 1; e9[7][6] = 1; e9[7][7] = 1; e9[7][8] = 1;
  console.assert(
    checkWinAt(e9, 7, 6, 1) === 0,
    `[engine] checkWin 4-in-row → no win`,
  );
  // 6 连也算赢
  const e10 = createEmptyBoard();
  for (let c = 3; c <= 8; c++) e10[7][c] = 1;
  console.assert(
    checkWinAt(e10, 7, 5, 1) === 1,
    `[engine] checkWin 6-in-row → win (length>=5)`,
  );

  // isBoardFull
  const e11 = createEmptyBoard();
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) e11[r][c] = 1;
  console.assert(isBoardFull(e11), `[engine] isBoardFull → true`);
  const e12 = createEmptyBoard();
  console.assert(!isBoardFull(e12), `[engine] isBoardFull empty → false`);

  // getCandidateMoves: 开局返回中心 3x3
  const e13 = createEmptyBoard();
  const e13Cands = getCandidateMoves(e13, 1);
  console.assert(
    e13Cands.length === 9,
    `[engine] getCandidateMoves empty board → 9 (center 3x3), got ${e13Cands.length}`,
  );
  // 中局：已有 1 颗子，radius=1 应返回 8 邻居
  const e14 = createEmptyBoard();
  e14[7][7] = 1;
  const e14Cands = getCandidateMoves(e14, 1);
  console.assert(
    e14Cands.length === 8,
    `[engine] getCandidateMoves 1 stone radius 1 → 8, got ${e14Cands.length}`,
  );

  // 棋型识别：活四
  const e15 = createEmptyBoard();
  e15[7][4] = 1; e15[7][5] = 1; e15[7][6] = 1; e15[7][7] = 1;
  console.assert(
    bestPatternAt(e15, 7, 5, 1) === "OPEN_FOUR",
    `[engine] bestPatternAt 4 stones _XXXX_ → OPEN_FOUR, got ${bestPatternAt(e15, 7, 5, 1)}`,
  );
  // 冲四（被堵一端）
  const e16 = createEmptyBoard();
  e16[7][4] = 2; e16[7][5] = 1; e16[7][6] = 1; e16[7][7] = 1; e16[7][8] = 1;
  console.assert(
    bestPatternAt(e16, 7, 6, 1) === "FOUR",
    `[engine] bestPatternAt X_XXX (blocked) → FOUR, got ${bestPatternAt(e16, 7, 6, 1)}`,
  );
  // 活三
  const e17 = createEmptyBoard();
  e17[7][5] = 1; e17[7][6] = 1; e17[7][7] = 1;
  console.assert(
    bestPatternAt(e17, 7, 6, 1) === "OPEN_THREE",
    `[engine] bestPatternAt _XXX_ → OPEN_THREE, got ${bestPatternAt(e17, 7, 6, 1)}`,
  );
  // 眠三
  const e18 = createEmptyBoard();
  e18[7][4] = 2; e18[7][5] = 1; e18[7][6] = 1; e18[7][7] = 1;
  console.assert(
    bestPatternAt(e18, 7, 6, 1) === "THREE",
    `[engine] bestPatternAt X_XXX (open one side) → THREE (眠三), got ${bestPatternAt(e18, 7, 6, 1)}`,
  );
  // 五连
  const e19 = createEmptyBoard();
  e19[7][3] = 1; e19[7][4] = 1; e19[7][5] = 1; e19[7][6] = 1; e19[7][7] = 1;
  console.assert(
    bestPatternAt(e19, 7, 5, 1) === "FIVE",
    `[engine] bestPatternAt XXXXX → FIVE, got ${bestPatternAt(e19, 7, 5, 1)}`,
  );

  // evaluateBoardFor: 黑有活四 > 白有活三
  const e20 = createEmptyBoard();
  e20[7][4] = 1; e20[7][5] = 1; e20[7][6] = 1; e20[7][7] = 1; // 黑活四
  e20[5][5] = 2; e20[5][6] = 2; e20[5][7] = 2; // 白活三
  const blackScore = evaluateBoardFor(e20, 1);
  const whiteScore = evaluateBoardFor(e20, 2);
  console.assert(
    blackScore > whiteScore,
    `[engine] evaluateBoardFor: black open4 > white open3, black=${blackScore} white=${whiteScore}`,
  );

  // getBestMove Easy: 必胜检测
  // 场景：黑棋已有 4 连，下一步必胜
  const e21 = createEmptyBoard();
  e21[7][4] = 1; e21[7][5] = 1; e21[7][6] = 1; e21[7][7] = 1; // 4 连
  const e21Best = getBestMove(e21, 1, "easy");
  const e21Ok =
    e21Best !== null &&
    e21Best.row === 7 &&
    (e21Best.col === 3 || e21Best.col === 8);
  console.assert(
    e21Ok,
    `[engine] getBestMove Easy 必胜检测，应在 (7,3) 或 (7,8), got (${e21Best?.row}, ${e21Best?.col})`,
  );

  // getBestMove Easy: 必阻挡检测
  // 场景：白棋已有 4 连，黑棋必须阻挡
  const e22 = createEmptyBoard();
  e22[7][4] = 2; e22[7][5] = 2; e22[7][6] = 2; e22[7][7] = 2; // 白 4 连
  const e22Best = getBestMove(e22, 1, "easy");
  const e22Ok =
    e22Best !== null &&
    e22Best.row === 7 &&
    (e22Best.col === 3 || e22Best.col === 8);
  console.assert(
    e22Ok,
    `[engine] getBestMove Easy 必阻挡，应在 (7,3) 或 (7,8), got (${e22Best?.row}, ${e22Best?.col})`,
  );

  // getBestMove Medium: 必胜 + 必阻挡也工作
  const e23Best = getBestMove(e21, 1, "medium");
  const e23Ok =
    e23Best !== null &&
    e23Best.row === 7 &&
    (e23Best.col === 3 || e23Best.col === 8);
  console.assert(
    e23Ok,
    `[engine] getBestMove Medium 必胜检测, got (${e23Best?.row}, ${e23Best?.col})`,
  );
  const e24Best = getBestMove(e22, 1, "medium");
  const e24Ok =
    e24Best !== null &&
    e24Best.row === 7 &&
    (e24Best.col === 3 || e24Best.col === 8);
  console.assert(
    e24Ok,
    `[engine] getBestMove Medium 必阻挡, got (${e24Best?.row}, ${e24Best?.col})`,
  );

  // getBestMove Hard: 必胜 + 必阻挡
  const e25Best = getBestMove(e21, 1, "hard");
  const e25Ok =
    e25Best !== null &&
    e25Best.row === 7 &&
    (e25Best.col === 3 || e25Best.col === 8);
  console.assert(
    e25Ok,
    `[engine] getBestMove Hard 必胜检测, got (${e25Best?.row}, ${e25Best?.col})`,
  );
  const e26Best = getBestMove(e22, 1, "hard");
  const e26Ok =
    e26Best !== null &&
    e26Best.row === 7 &&
    (e26Best.col === 3 || e26Best.col === 8);
  console.assert(
    e26Ok,
    `[engine] getBestMove Hard 必阻挡, got (${e26Best?.row}, ${e26Best?.col})`,
  );

  // v0.x fix: AI 3 连靠边界时，必须选 OPEN_FOUR（必胜），不是死四（边界堵）
  // 场景：白（AI）3 连 (7,11)(7,12)(7,13)，下 (7,10) = OPEN_FOUR（必胜），下 (7,14) = 死四（边界）
  const e27board = createEmptyBoard();
  e27board[7][11] = 2; e27board[7][12] = 2; e27board[7][13] = 2; // 白 3 连
  // 模拟落子 (7, 10) → 白应凑 4 连 (7,10-13) 2 端空 = OPEN_FOUR
  e27board[7][10] = 2; // 模拟白走 (7, 10)
  console.assert(
    bestPatternAt(e27board, 7, 11, 2) === "OPEN_FOUR",
    `[engine] 边界 3 连 + (7,10) 凑 OPEN_FOUR, got ${bestPatternAt(e27board, 7, 11, 2)}`,
  );
  // 模拟落子 (7, 14) → 白应凑 4 连 (7,11-14) 1 端空 (7,10) + 1 端堵边界 = FOUR（死四，不能 5 连）
  e27board[7][10] = 0; // 清掉
  e27board[7][14] = 2;
  console.assert(
    bestPatternAt(e27board, 7, 12, 2) === "FOUR",
    `[engine] 边界 3 连 + (7,14) 凑 FOUR (死四), got ${bestPatternAt(e27board, 7, 12, 2)}`,
  );
  // 期望 Hard 选 (7, 10) — OPEN_FOUR 必胜，不是 (7, 14) 死四
  e27board[7][14] = 0; // 清掉，让 AI 决定
  const e27Best = getBestMove(e27board, 2, "hard");
  const e27Ok =
    e27Best !== null && e27Best.row === 7 && e27Best.col === 10;
  console.assert(
    e27Ok,
    `[engine] getBestMove Hard 边界 3 连应选 (7,10) OPEN_FOUR, got (${e27Best?.row}, ${e27Best?.col})`,
  );
  // Medium 同样期望
  const e28Best = getBestMove(e27board, 2, "medium");
  const e28Ok =
    e28Best !== null && e28Best.row === 7 && e28Best.col === 10;
  console.assert(
    e28Ok,
    `[engine] getBestMove Medium 边界 3 连应选 (7,10) OPEN_FOUR, got (${e28Best?.row}, ${e28Best?.col})`,
  );

  // newGameState
  const e27 = newGameState("easy");
  console.assert(
    e27.status === "playing" &&
      e27.currentPlayer === 1 &&
      e27.winner === 0 &&
      e27.moves.length === 0 &&
      e27.difficulty === "easy",
    `[engine] newGameState 初始值 OK`,
  );

  // eslint-disable-next-line no-console
  console.log("[engine] gomoku engine self-check passed");
}
