/**
 * 贪吃蛇类型定义
 *
 * 实现参考：
 * - 经典贪吃蛇（1976，Blockade），Gremlin 街机版本
 * - 行业标准 20×20 网格
 * - 蛇身数组 [0] = 头，[length-1] = 尾巴
 */

export const BOARD_SIZE = 20;
/** 蛇初始长度 */
export const INITIAL_LENGTH = 3;
/** 初始 tick 间隔（毫秒） */
export const TICK_MS = 200;
/** 每次吃食物得分 */
export const FOOD_SCORE = 1;

export type Cell = 0 | 1 | 2 | 3;
/** 0 = 空，1 = 蛇身，2 = 蛇头，3 = 食物 */

export type Grid = Cell[][];

export interface Point {
  row: number;
  col: number;
}

export type Direction = "up" | "down" | "left" | "right";

/** waiting = 新回合等待玩家按方向键开始；playing = 进行中；paused = 玩家暂停；over = 死亡结束 */
export type Status = "waiting" | "playing" | "paused" | "over";

/** 单步走结果 */
export interface StepResult {
  grid: Grid;
  snake: Point[];
  food: Point | null;
  score: number;
  ate: boolean;
  died: boolean;
}

/** 蛇头在数组 [0]，数组按 head → body → ... → tail 顺序 */
export type Snake = Point[];
