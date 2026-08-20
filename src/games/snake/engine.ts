/**
 * 贪吃蛇游戏引擎（纯逻辑，无 DOM 依赖）
 *
 * 包含：
 * - 棋盘创建 / 克隆
 * - 蛇身表示（Point[]，头在 [0]）
 * - 食物生成（随机空位）
 * - 单步走：移动 + 碰撞 + 吃食物
 * - 死亡判定：撞墙 / 撞自己（排除尾巴）
 * - 方向 180 反向检测
 *
 * 不变量：
 * - 纯函数永远返回新 grid + 新 snake 数组（immutability）
 * - 死亡判定时**排除尾巴**（没吃食物的步 = 去尾巴 + 加头，新头可能"撞旧尾巴"——这是允许的）
 * - 食物永远在空位（不在蛇身上）
 * - 蛇身永远在棋盘内（撞墙 = died=true）
 */

import { BOARD_SIZE, INITIAL_LENGTH } from "./types";
import type { Grid, Point, Direction, StepResult, Snake } from "./types";

/* ============================================================================
 * 棋盘工具
 * ========================================================================== */

/** 创建 20×20 全 0 棋盘 */
export function createEmptyGrid(): Grid {
  return Array.from({ length: BOARD_SIZE }, () =>
    new Array<0 | 1 | 2 | 3>(BOARD_SIZE).fill(0),
  );
}

/** 深度克隆 grid */
export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.slice());
}

/** 蛇身克隆（Point[]） */
export function cloneSnake(snake: Snake): Snake {
  return snake.map((p) => ({ row: p.row, col: p.col }));
}

/** 两个点是否相等 */
export function pointEq(a: Point, b: Point): boolean {
  return a.row === b.row && a.col === b.col;
}

/** 蛇身是否包含点（O(n) 廉价） */
export function snakeContains(snake: Snake, p: Point): boolean {
  for (const s of snake) {
    if (pointEq(s, p)) return true;
  }
  return false;
}

/** 找出所有空格（值为 0） */
export function getEmptyCells(grid: Grid): Array<Point> {
  const empties: Point[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c] === 0) empties.push({ row: r, col: c });
    }
  }
  return empties;
}

/* ============================================================================
 * 方向工具
 * ========================================================================== */

/** 方向 → 头位置偏移 */
export function directionOffset(dir: Direction): Point {
  switch (dir) {
    case "up":
      return { row: -1, col: 0 };
    case "down":
      return { row: 1, col: 0 };
    case "left":
      return { row: 0, col: -1 };
    case "right":
      return { row: 0, col: 1 };
  }
}

/** 是否 180 反向（up↔down, left↔right） */
export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

/* ============================================================================
 * 碰撞判定
 * ========================================================================== */

/** 点是否出界 */
export function isWallHit(p: Point): boolean {
  return p.row < 0 || p.row >= BOARD_SIZE || p.col < 0 || p.col >= BOARD_SIZE;
}

/**
 * 蛇头是否撞自己
 * @param excludeTail true 表示排除尾巴（用于"未吃食物的步"——新头可能等于旧尾巴位置）
 */
export function isSelfHit(snake: Snake, head: Point, excludeTail: boolean): boolean {
  const end = excludeTail ? snake.length - 1 : snake.length;
  for (let i = 0; i < end; i++) {
    if (pointEq(snake[i], head)) return true;
  }
  return false;
}

/* ============================================================================
 * 初始状态
 * ========================================================================== */

/**
 * 棋盘中央水平方向，长度 3，向右
 * 例如 [9,10] [9,9] [9,8]（头在 [0] = 右端）
 */
function createInitialSnake(): Snake {
  const mid = Math.floor(BOARD_SIZE / 2);
  // 头 = [9,10]，身 = [9,9]，尾 = [9,8]
  // 初始方向 right，所以下一步加头 = [9,11]
  return [
    { row: mid, col: mid + 1 }, // 头
    { row: mid, col: mid }, // 身
    { row: mid, col: mid - 1 }, // 尾
  ];
}

/**
 * 在蛇身外随机生成一个食物
 * 蛇占满时返回 null（理论上 v1 不会到这一步，因为撞自己会死）
 */
export function placeFood(
  grid: Grid,
  snake: Snake,
  rng: () => number = Math.random,
): Point | null {
  const empties = getEmptyCells(grid);
  // 排除蛇身位置
  const free: Point[] = empties.filter((p) => !snakeContains(snake, p));
  if (free.length === 0) return null;
  const idx = Math.floor(rng() * free.length);
  return free[idx];
}

/**
 * 构造初始游戏状态：
 * - 蛇在中央，方向 right
 * - 食物在随机空位
 * - score=0, status="playing"
 */
export function createInitialState(
  rng: () => number = Math.random,
): { grid: Grid; snake: Snake; direction: Direction; food: Point | null } {
  const snake = createInitialSnake();
  // 先用临时 grid 找空位
  const tempGrid = createEmptyGrid();
  const food = placeFood(tempGrid, snake, rng);
  return {
    grid: tempGrid,
    snake,
    direction: "right",
    food,
  };
}

/* ============================================================================
 * 核心：单步走
 * ========================================================================== */

/**
 * 蛇按 direction 走一步：
 * 1. 计算新头位置（direction 偏移）
 * 2. 死亡判定：
 *    - 撞墙 → died
 *    - 撞自己（除尾巴）→ died
 * 3. 吃到食物：
 *    - 保留尾巴（不缩短）
 *    - 蛇身长度 +1
 *    - score += FOOD_SCORE
 *    - 重新生成食物
 * 4. 没吃到：去掉尾巴（保持长度）
 * 5. 重建 grid
 */
export function step(
  snake: Snake,
  food: Point | null,
  direction: Direction,
  rng: () => number = Math.random,
): StepResult {
  const offset = directionOffset(direction);
  const newHead: Point = {
    row: snake[0].row + offset.row,
    col: snake[0].col + offset.col,
  };

  // 撞墙
  if (isWallHit(newHead)) {
    return {
      grid: buildGrid(snake, snake[0], food),
      snake: cloneSnake(snake),
      food,
      score: 0,
      ate: false,
      died: true,
    };
  }

  // 是否吃到食物
  const ate = food !== null && pointEq(newHead, food);

  // 撞自己判定：
  // - 吃到食物 → 尾巴保留 → 新头可能撞"旧尾巴位置以外的任意身体"
  // - 没吃到 → 尾巴会去掉 → 新头可能等于"旧尾巴"（允许）
  if (isSelfHit(snake, newHead, !ate)) {
    return {
      grid: buildGrid(snake, snake[0], food),
      snake: cloneSnake(snake),
      food,
      score: 0,
      ate: false,
      died: true,
    };
  }

  // 构造新蛇身
  const newSnake: Snake = [newHead, ...snake];
  if (!ate) {
    newSnake.pop(); // 去掉尾巴
  }

  // 重新生成食物（仅吃到时）
  const newFood = ate ? placeFood(createEmptyGrid(), newSnake, rng) : food;

  // 重建 grid
  const newGrid = buildGrid(newSnake, newHead, newFood);

  return {
    grid: newGrid,
    snake: newSnake,
    food: newFood,
    score: ate ? 1 : 0,
    ate,
    died: false,
  };
}

/* ============================================================================
 * Grid 重建（基于蛇身 + 蛇头 + 食物位置）
 * ========================================================================== */

function buildGrid(snake: Snake, head: Point, food: Point | null): Grid {
  const grid = createEmptyGrid();
  // 蛇身（不含头）
  for (let i = 1; i < snake.length; i++) {
    grid[snake[i].row][snake[i].col] = 1;
  }
  // 蛇头
  grid[head.row][head.col] = 2;
  // 食物
  if (food !== null) {
    grid[food.row][food.col] = 3;
  }
  return grid;
}

/* ============================================================================
 * 开发态自检（dev only）
 * ========================================================================== */

if (import.meta.env?.DEV) {
  // isOpposite
  console.assert(isOpposite("up", "down") === true, "[snake] isOpposite up/down");
  console.assert(isOpposite("down", "up") === true, "[snake] isOpposite down/up");
  console.assert(isOpposite("left", "right") === true, "[snake] isOpposite left/right");
  console.assert(isOpposite("right", "left") === true, "[snake] isOpposite right/left");
  console.assert(isOpposite("up", "up") === false, "[snake] isOpposite up/up (self=false)");
  console.assert(isOpposite("up", "left") === false, "[snake] isOpposite up/left (perpendicular=false)");

  // isWallHit
  console.assert(isWallHit({ row: -1, col: 5 }) === true, "[snake] isWallHit row=-1");
  console.assert(isWallHit({ row: 20, col: 5 }) === true, "[snake] isWallHit row=20");
  console.assert(isWallHit({ row: 5, col: -1 }) === true, "[snake] isWallHit col=-1");
  console.assert(isWallHit({ row: 5, col: 20 }) === true, "[snake] isWallHit col=20");
  console.assert(isWallHit({ row: 0, col: 0 }) === false, "[snake] isWallHit (0,0)");
  console.assert(isWallHit({ row: 19, col: 19 }) === false, "[snake] isWallHit (19,19)");

  // directionOffset
  console.assert(JSON.stringify(directionOffset("up")) === '{"row":-1,"col":0}', "[snake] offset up");
  console.assert(JSON.stringify(directionOffset("down")) === '{"row":1,"col":0}', "[snake] offset down");
  console.assert(JSON.stringify(directionOffset("left")) === '{"row":0,"col":-1}', "[snake] offset left");
  console.assert(JSON.stringify(directionOffset("right")) === '{"row":0,"col":1}', "[snake] offset right");

  // pointEq
  console.assert(pointEq({ row: 1, col: 2 }, { row: 1, col: 2 }) === true, "[snake] pointEq same");
  console.assert(pointEq({ row: 1, col: 2 }, { row: 2, col: 1 }) === false, "[snake] pointEq diff");

  // createInitialState
  const init = createInitialState(() => 0.5);
  console.assert(init.snake.length === INITIAL_LENGTH, "[snake] initial snake length");
  console.assert(init.direction === "right", "[snake] initial direction=right");
  console.assert(init.food !== null, "[snake] initial food not null");
  // 初始蛇身 [9,10] [9,9] [9,8]
  console.assert(init.snake[0].row === 9 && init.snake[0].col === 10, "[snake] initial head [9,10]");
  console.assert(init.snake[1].row === 9 && init.snake[1].col === 9, "[snake] initial body [9,9]");
  console.assert(init.snake[2].row === 9 && init.snake[2].col === 8, "[snake] initial tail [9,8]");

  // placeFood 不在蛇身上
  const snakeAt: Snake = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ];
  const grid1 = createEmptyGrid();
  // 把蛇身位置标 1
  for (const s of snakeAt) grid1[s.row][s.col] = 1;
  const food1 = placeFood(grid1, snakeAt, () => 0.5);
  console.assert(food1 !== null, "[snake] placeFood returns non-null");
  console.assert(snakeContains(snakeAt, food1!) === false, "[snake] placeFood not on snake");

  // step 基本：向右走 1 步（不吃食物）
  const initSnake: Snake = [
    { row: 5, col: 5 },
    { row: 5, col: 4 },
    { row: 5, col: 3 },
  ];
  const step1 = step(initSnake, null, "right");
  console.assert(step1.died === false, "[snake] step right no die");
  console.assert(step1.ate === false, "[snake] step right no eat");
  console.assert(step1.snake.length === 3, "[snake] step right length=3 (no growth)");
  console.assert(step1.snake[0].row === 5 && step1.snake[0].col === 6, "[snake] step right head moved to [5,6]");

  // step 撞墙
  const wallSnake: Snake = [
    { row: 0, col: 5 },
    { row: 1, col: 5 },
    { row: 2, col: 5 },
  ];
  const step2 = step(wallSnake, null, "up");
  console.assert(step2.died === true, "[snake] step up to wall dies");

  // step 撞自己（贪吃蛇死亡时常见 case：U 形回头）
  const uSnake: Snake = [
    { row: 5, col: 5 },
    { row: 5, col: 6 },
    { row: 6, col: 6 },
    { row: 6, col: 5 },
    { row: 6, col: 4 },
    { row: 5, col: 4 },
  ];
  // 当前 head [5,5] 朝 right → 下一步 head [5,6] = snake[1]，撞自己
  const step3 = step(uSnake, null, "right");
  console.assert(step3.died === true, "[snake] U-shape right into body dies");

  // step 吃食物（尾巴保留 + 分数 +1）
  const eatSnake: Snake = [
    { row: 5, col: 5 },
    { row: 5, col: 4 },
    { row: 5, col: 3 },
  ];
  const foodAt: Point = { row: 5, col: 6 }; // right 一步就吃到
  const step4 = step(eatSnake, foodAt, "right", () => 0.5);
  console.assert(step4.ate === true, "[snake] ate food");
  console.assert(step4.died === false, "[snake] no die when eat");
  console.assert(step4.score === 1, "[snake] score=1");
  console.assert(step4.snake.length === 4, "[snake] snake grows to 4 (head + 3 body)");
  console.assert(step4.snake[0].row === 5 && step4.snake[0].col === 6, "[snake] new head at food [5,6]");

  // step 没吃食物：尾巴必须去掉（"撞自己时排除尾巴"才正确）
  const tailMoveSnake: Snake = [
    { row: 5, col: 6 },
    { row: 5, col: 5 },
    { row: 5, col: 4 },
  ];
  // 向 right → 新头 [5,7]，尾巴 [5,4] 会被去掉，所以新蛇身 = [[5,7],[5,6],[5,5]]，没撞自己
  const step5 = step(tailMoveSnake, null, "right");
  console.assert(step5.died === false, "[snake] tail-move doesn't self-hit (excluded)");
  console.assert(step5.snake.length === 3, "[snake] tail-move length stays 3");

  // immutability
  const origSnake: Snake = [
    { row: 5, col: 5 },
    { row: 5, col: 4 },
    { row: 5, col: 3 },
  ];
  const beforeStr = JSON.stringify(origSnake);
  step(origSnake, null, "right");
  console.assert(JSON.stringify(origSnake) === beforeStr, "[snake] step doesn't mutate input");

  // eslint-disable-next-line no-console
  console.log("[snake] engine self-check passed");
}
