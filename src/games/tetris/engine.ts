/**
 * 俄罗斯方块游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 7-bag 随机生成器
 * - SRS 旋转 + Wall Kick
 * - 移动 / 软降 / 硬降
 * - Hold / Next
 * - 行消除 + 计分
 * - 等级 / 速度
 * - T-Spin 检测（v2）
 * - Back-to-Back / Combo（v2）
 *
 * 标准：
 * - SRS（Super Rotation System）— Tetris Guideline
 * - Guideline 计分（含 T-Spin / Back-to-Back / Combo，v2）
 * - 7-bag randomizer（Tetris Guideline 标准）
 *
 * 注意：上次「是否旋转」通过闭包变量 lastMoveWasRotation 跟踪。
 * 该变量在每次 lockPiece / spawn 后清零。
 */

import {
  COLS,
  ROWS,
  HIDDEN_ROWS,
  PREVIEW_SIZE,
  SRS_KICKS_JLSTZ,
  SRS_KICKS_I,
  gravityMs,
  LINE_SCORES,
  TSPIN_NO_LINE_SCORES,
  TSPIN_LINE_SCORES,
  COMBO_PER_LEVEL,
  B2B_MULTIPLIER,
} from "./types";
import type {
  Cell,
  GameState,
  Piece,
  PieceType,
  Rotation,
  TSpinType,
  ClearType,
  LastEvent,
} from "./types";

/* ============================================================================
 * Piece shapes — SRS 标准（每种 4 个 rotation，相对 piece 左上角）
 * ========================================================================== */

const PIECE_SHAPES: Record<PieceType, Array<Array<[number, number]>>> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

const ALL_PIECES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

/* ============================================================================
 * 7-bag 随机
 * ========================================================================== */

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Bag {
  private queue: PieceType[] = [];

  next(): PieceType {
    if (this.queue.length === 0) {
      this.queue = shuffle(ALL_PIECES);
    }
    return this.queue.shift()!;
  }

  /** 预填 N 个到预览队列 */
  preview(n: number): PieceType[] {
    while (this.queue.length < n) {
      this.queue = this.queue.concat(shuffle(ALL_PIECES));
    }
    return this.queue.slice(0, n);
  }
}

/* ============================================================================
 * Board 操作
 * ========================================================================== */

function createBoard(): Cell[][] {
  const total = ROWS + HIDDEN_ROWS;
  const board: Cell[][] = [];
  for (let y = 0; y < total; y++) {
    board.push(new Array(COLS).fill(0));
  }
  return board;
}

function pieceCells(piece: Piece): Array<[number, number]> {
  return PIECE_SHAPES[piece.type][piece.rotation];
}

function isValidPosition(board: Cell[][], piece: Piece): boolean {
  for (const [dx, dy] of pieceCells(piece)) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (x < 0 || x >= COLS) return false;
    if (y >= board.length) return false; // 顶部越界（y<0）允许
    if (y >= 0 && board[y][x] !== 0) return false;
  }
  return true;
}

function lockPiece(board: Cell[][], piece: Piece): void {
  for (const [dx, dy] of pieceCells(piece)) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (y >= 0 && y < board.length && x >= 0 && x < COLS) {
      board[y][x] = piece.type;
    }
  }
}

function clearLines(board: Cell[][]): number {
  let cleared = 0;
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every((c) => c !== 0)) {
      board.splice(y, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      y++; // re-check same index (now contains the shifted row)
    }
  }
  return cleared;
}

/* ============================================================================
 * T-Spin 检测（v2）
 * ========================================================================== */

/** 单个对角格子是否「被占」：墙 / 地板 / 已锁定的方块都算 */
function isCornerOccupied(board: Cell[][], cx: number, cy: number): boolean {
  if (cx < 0 || cx >= COLS) return true; // 墙外 = 占据
  if (cy >= board.length) return true; // 地板下 = 占据
  if (cy < 0) return false; // 顶部外 = 不算（顶部是 sky）
  return board[cy][cx] !== 0;
}

/**
 * T-Spin 检测：标准 3-corner rule + front-2-corner rule
 * - 仅 T-piece 且上一次成功移动是旋转 → 进入 T-Spin 判定
 * - 4 个对角角中 ≥ 3 个 occupied → T-Spin 或 T-Spin Mini
 * - 旋转方向「前侧」2 个角都被占 → 完整 T-Spin，否则 T-Spin Mini
 */
function detectTSpin(
  board: Cell[][],
  piece: Piece,
  lastMoveWasRotation: boolean,
): TSpinType {
  if (piece.type !== "T" || !lastMoveWasRotation) return "";

  const x = piece.x;
  const y = piece.y;
  // 4 个对角
  const tl = isCornerOccupied(board, x, y);
  const tr = isCornerOccupied(board, x + 2, y);
  const bl = isCornerOccupied(board, x, y + 2);
  const br = isCornerOccupied(board, x + 2, y + 2);

  const filled = [tl, tr, bl, br].filter(Boolean).length;
  if (filled < 3) return "";

  // 前侧 2 角（按 rotation 决定 T 块尖头方向）
  let frontA: boolean;
  let frontB: boolean;
  switch (piece.rotation) {
    case 0: frontA = tl; frontB = tr; break; // 尖头朝上
    case 1: frontA = tr; frontB = br; break; // 朝右
    case 2: frontA = br; frontB = bl; break; // 朝下
    case 3: frontA = bl; frontB = tl; break; // 朝左
  }

  return frontA && frontB ? "tspin" : "tspin-mini";
}

/* ============================================================================
 * 旋转 + Wall Kick
 * ========================================================================== */

function tryRotate(
  board: Cell[][],
  piece: Piece,
  dir: 1 | -1,
): { piece: Piece; kickIndex: number } | null {
  if (piece.type === "O") return { piece, kickIndex: 0 }; // O 块不旋转

  const from = piece.rotation;
  const to = (((piece.rotation + dir) % 4) + 4) % 4 as Rotation;
  const kicks = piece.type === "I" ? SRS_KICKS_I : SRS_KICKS_JLSTZ;
  const kickList = kicks[`${from}->${to}`] || [[0, 0]];

  const rotated: Piece = { ...piece, rotation: to };
  for (let i = 0; i < kickList.length; i++) {
    const [kx, ky] = kickList[i];
    const candidate: Piece = { ...rotated, x: piece.x + kx, y: piece.y - ky };
    if (isValidPosition(board, candidate)) {
      return { piece: candidate, kickIndex: i };
    }
  }
  return null;
}

/* ============================================================================
 * 移动 / 软降 / 硬降
 * ========================================================================== */

function tryMove(board: Cell[][], piece: Piece, dx: number, dy: number): Piece | null {
  const candidate: Piece = { ...piece, x: piece.x + dx, y: piece.y + dy };
  return isValidPosition(board, candidate) ? candidate : null;
}

function hardDropDistance(board: Cell[][], piece: Piece): number {
  let dist = 0;
  while (tryMove(board, { ...piece, y: piece.y + dist + 1 }, 0, 0)) {
    dist++;
  }
  return dist;
}

/* ============================================================================
 * 计分（v2 — Guideline 含 T-Spin / B2B / Combo）
 * ========================================================================== */

function scoreClear(
  lines: number,
  tSpin: TSpinType,
  level: number,
  b2b: boolean,
  combo: number,
): { base: number; difficult: boolean } {
  let base = 0;
  let difficult = false;

  if (tSpin !== "") {
    // T-Spin 路线
    if (lines === 0) {
      base = TSPIN_NO_LINE_SCORES[tSpin];
    } else {
      const key = `${tSpin}-${lines}` as keyof typeof TSPIN_LINE_SCORES;
      base = TSPIN_LINE_SCORES[key] ?? 0;
    }
    difficult = true; // 所有 T-Spin 都是 difficult
  } else {
    // 普通消除
    const types: ClearType[] = ["", "single", "double", "triple", "tetris"];
    const type = types[lines] ?? "";
    base = LINE_SCORES[type];
    if (type === "tetris") difficult = true;
  }

  // B2B 加成
  if (b2b && difficult) {
    base = Math.floor(base * B2B_MULTIPLIER);
  }

  // Combo 加成（combo ≥ 1）
  if (combo >= 1 && lines > 0) {
    base += COMBO_PER_LEVEL * combo;
  }

  base *= level;
  return { base, difficult };
}

/* ============================================================================
 * 公共 API
 * ========================================================================== */

export function newGame(): GameState {
  const bag = new Bag();
  // 取 PREVIEW_SIZE + 1：1 个给 current，剩下 PREVIEW_SIZE 个给 next
  // （如果只取 PREVIEW_SIZE，shift 后 next 长度 = PREVIEW_SIZE - 1 = 2，
  //  view 渲染 next[2] 时会得到 undefined，触发 Vue prop type warning）
  const queue = bag.preview(PREVIEW_SIZE + 1);
  const first = queue.shift()!;
  return {
    board: createBoard(),
    current: { type: first, rotation: 0, x: 3, y: 0 },
    hold: null,
    canHold: true,
    next: queue, // 长度 = PREVIEW_SIZE（3），view 可安全读 next[0..2]
    score: 0,
    level: 1,
    lines: 0,
    status: "waiting",

    // v2
    tSpin: "",
    b2b: false,
    combo: -1,
    lastClearLines: 0,
    lastEvent: null,
  };
}

export function gravityIntervalMs(state: GameState): number {
  return gravityMs(state.level);
}

/**
 * Lock 当前 piece，处理 T-Spin / 行消除 / 计分 / spawn 下一块。
 * 返回新的 GameState + 是否 gameover。
 */
function lockAndScore(state: GameState): { state: GameState; gameover: boolean } {
  if (!state.current) return { state, gameover: false };

  const board = state.board.map((row) => row.slice());

  // T-Spin 检测：state.tSpin 字段在 rotateCW/CCW 后被设为 "tspin"（marker），
  // 移动/软降/重力 tick 时清空。这里用 `state.tSpin !== ""` 作为"上一次是旋转"的信号。
  const tSpin = detectTSpin(board, state.current, state.tSpin !== "");

  lockPiece(board, state.current);
  const cleared = clearLines(board);
  const lines = state.lines + cleared;
  const level = Math.floor(lines / 10) + 1;

  // Combo
  let combo: number;
  if (cleared > 0) {
    combo = state.combo + 1;
  } else {
    combo = -1;
  }

  // 计分
  const { base, difficult } = scoreClear(cleared, tSpin, state.level, state.b2b, combo);
  const score = state.score + base;

  // B2B 更新
  let b2b: boolean;
  if (cleared > 0 && difficult) {
    b2b = true;
  } else if (cleared > 0 && !difficult) {
    b2b = false;
  } else {
    b2b = state.b2b; // 本次未消除行，B2B 状态保留
  }

  // Last event（用于 view 闪动）
  let lastEvent: LastEvent = null;
  if (cleared > 0) {
    const types: ClearType[] = ["", "single", "double", "triple", "tetris"];
    const clearType: ClearType = types[cleared] ?? "";
    lastEvent = {
      kind: "clear",
      clearType,
      tSpin,
      b2b: b2b && difficult,
      combo: combo >= 1 ? combo : 0,
    };
  } else if (tSpin !== "") {
    lastEvent = { kind: "tspin", tSpin };
  }

  // 抽下一块：先 shift 拿到 newType，再 refill 到 PREVIEW_SIZE
  // （如果先 refill 再 shift，最后剩 PREVIEW_SIZE - 1 = 2 项，view 读 next[2] 会 undefined）
  const next = state.next.slice();
  const newType = next.shift()!;
  const bag = new Bag();
  while (next.length < PREVIEW_SIZE) {
    next.push(...bag.preview(PREVIEW_SIZE - next.length));
  }
  const newPiece: Piece = { type: newType, rotation: 0, x: 3, y: 0 };
  const gameover = !isValidPosition(board, newPiece);

  const newState: GameState = {
    ...state,
    board,
    current: gameover ? null : newPiece,
    next,
    score,
    lines,
    level,
    tSpin: "",
    b2b,
    combo,
    lastClearLines: cleared,
    lastEvent,
    status: gameover ? "gameover" : "playing",
    canHold: true, // 每次 lock 后重置
  };
  return { state: newState, gameover };
}

/**
 * 主 game tick：重力下落一格；如撞底则 lock。
 *
 * 注意：tSpin 字段在移动/旋转时被设为 "tspin"（marker），表示"上一次操作是旋转"。
 * lock 时清空。
 */
export function tick(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const moved = tryMove(state.board, state.current, 0, 1);
  if (moved) {
    // 移动成功：清 tSpin marker（不是旋转）
    return { ...state, current: moved, tSpin: "" };
  }
  // 撞底 lock
  return lockAndScore(state).state;
}

export function moveLeft(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const moved = tryMove(state.board, state.current, -1, 0);
  if (moved) return { ...state, current: moved, tSpin: "" };
  return state;
}

export function moveRight(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const moved = tryMove(state.board, state.current, 1, 0);
  if (moved) return { ...state, current: moved, tSpin: "" };
  return state;
}

export function rotateCW(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const result = tryRotate(state.board, state.current, 1);
  if (result) {
    return {
      ...state,
      current: result.piece,
      // 旋转成功：tSpin 标记为 "tspin"（仅 marker），lock 时再检测
      tSpin: "tspin",
    };
  }
  return state;
}

export function rotateCCW(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const result = tryRotate(state.board, state.current, -1);
  if (result) {
    return { ...state, current: result.piece, tSpin: "tspin" };
  }
  return state;
}

/** 软降：下移一格 + 加分；撞底则 lock */
export function softDrop(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const moved = tryMove(state.board, state.current, 0, 1);
  if (moved) {
    return { ...state, current: moved, score: state.score + 1, tSpin: "" };
  }
  // 撞底，等同于 tick
  return lockAndScore(state).state;
}

/** 硬降：直接落到底 + lock + 计分 */
export function hardDrop(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;
  const dist = hardDropDistance(state.board, state.current);
  const dropped: Piece = { ...state.current, y: state.current.y + dist };
  return lockAndScore({
    ...state,
    current: dropped,
    score: state.score + dist * 2,
  }).state;
}

/** Hold：每回合一次（用 canHold 标记） */
export function hold(state: GameState): GameState {
  if (state.status !== "playing" || !state.current || !state.canHold) {
    return state;
  }
  const currentType = state.current.type;
  let nextType: PieceType;
  if (state.hold) {
    nextType = state.hold;
  } else {
    // 从 next 取一个；shift 后再 refill 到 PREVIEW_SIZE，view 读 next[2] 安全
    const next = state.next.slice();
    const shifted = next.shift()!;
    const bag = new Bag();
    while (next.length < PREVIEW_SIZE) {
      next.push(...bag.preview(PREVIEW_SIZE - next.length));
    }
    return {
      ...state,
      hold: currentType,
      current: { type: shifted, rotation: 0, x: 3, y: 0 },
      canHold: false,
      next,
      tSpin: "",
    };
  }
  const newPiece: Piece = { type: nextType, rotation: 0, x: 3, y: 0 };
  if (!isValidPosition(state.board, newPiece)) {
    return { ...state, status: "gameover", current: null };
  }
  return {
    ...state,
    hold: currentType,
    current: newPiece,
    canHold: false,
    tSpin: "",
  };
}

export function togglePause(state: GameState): GameState {
  if (state.status === "playing") return { ...state, status: "paused" };
  if (state.status === "paused") return { ...state, status: "playing" };
  return state;
}

/** 用于 view 渲染：合并 board + current piece 到一个二维数组 */
export function renderGrid(state: GameState): Cell[][] {
  const grid = state.board.map((row) => row.slice());
  // v0.9.4：waiting 状态也合并 piece（让玩家在"按方向键开始"时能看到下一块在 board 顶部预览）
  // waiting 时把 piece 视觉下推 HIDDEN_ROWS，让 piece 顶部出现在 visible 区域
  // （不修改 state.current.y，保持 SRS 兼容；start() 后 playing 分支按原 y=0 渲染）
  if (state.current && (state.status === "playing" || state.status === "waiting")) {
    const yOffset = state.status === "waiting" ? HIDDEN_ROWS : 0;
    for (const [dx, dy] of pieceCells(state.current)) {
      const x = state.current.x + dx;
      const y = state.current.y + dy + yOffset;
      if (y >= 0 && y < grid.length && x >= 0 && x < COLS) {
        grid[y][x] = state.current.type;
      }
    }
  }
  return grid;
}

/** 渲染 ghost piece（硬降预览） */
export function renderGhost(state: GameState): Piece | null {
  if (!state.current || (state.status !== "playing" && state.status !== "waiting")) return null;
  const dist = hardDropDistance(state.board, state.current);
  if (dist === 0) return null;
  return { ...state.current, y: state.current.y + dist };
}

/** 取 ghost piece 在 board 上的 cells 集合（"x,y" 形式），用于 view 标记 ghost */
export function renderGhostCells(state: GameState): Set<string> {
  const out = new Set<string>();
  const ghost = renderGhost(state);
  if (!ghost) return out;
  for (const [dx, dy] of pieceCells(ghost)) {
    out.add(`${ghost.x + dx},${ghost.y + dy}`);
  }
  return out;
}

/** 显式清空 lastEvent（view 在 300ms 动画结束后调用，避免重新显示） */
export function clearLastEvent(state: GameState): GameState {
  return { ...state, lastEvent: null };
}
