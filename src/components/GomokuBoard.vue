<script setup lang="ts">
import { computed } from "vue";
import { BOARD_SIZE, type Cell } from "@/games/gomoku/types";

/**
 * 棋盘渲染
 *
 * 视觉：
 * - 15×15 网格，浅木色背景（gomoku 经典）
 * - 网格线用 SVG 画（不靠 cell border，避免 cell 自身 border 占用空间导致线偏移）
 * - 4 段防线（col 0,3,7,11 + row 0,3,7,11）：加粗 2px
 * - 5 个星位：天元 + 四角（3,3 / 3,11 / 7,7 / 11,3 / 11,11）
 * - 棋子：黑/白圆形，玻璃稿
 * - 最后一手：红色小圆点
 *
 * 交互：
 * - 点击 cell → emit cellClick(row, col)
 * - 禁用：board[r][c] !== 0（已有子） / over 状态 / AI 思考中（由父组件控制）
 */

const props = defineProps<{
  board: Cell[][];
  lastMove: { row: number; col: number } | null;
  disabled: boolean;
  /** 5 连线高亮坐标（用于胜利后画线） */
  winningLine: Array<{ row: number; col: number }> | null;
}>();

const emit = defineEmits<{
  cellClick: [row: number, col: number];
}>();

function cellAt(r: number, c: number): Cell {
  return props.board[r]?.[c] ?? 0;
}

function isLast(r: number, c: number): boolean {
  return (
    props.lastMove !== null &&
    props.lastMove.row === r &&
    props.lastMove.col === c
  );
}

function isWinning(r: number, c: number): boolean {
  if (!props.winningLine) return false;
  return props.winningLine.some((m) => m.row === r && m.col === c);
}

function onCellClick(r: number, c: number): void {
  if (props.disabled) return;
  if (cellAt(r, c) !== 0) return;
  emit("cellClick", r, c);
}

/** 4 段防线 + 最外圈（5 段加粗：0, 3, 7, 11, 14）— 业界标准 Gomoku 棋盘
 * 注意：BOLD_LINES 索引是 0-14（共 15 条线），对应 15 个交叉点 */
const BOLD_LINES = new Set([0, 3, 7, 11, 14]);

/** 5 个星位（天元 + 四角） */
const STAR_POINTS = [
  { r: 3, c: 3 },
  { r: 3, c: 11 },
  { r: 7, c: 7 },
  { r: 11, c: 3 },
  { r: 11, c: 11 },
] as const;

/** 棋盘边距：15 条线画在 14 段 × 36px = 504px 范围内
 * SVG 画布 = 504×504（线刚好填满画布，不会"开 36px"）
 * 居中策略：SVG 504px 放在 board content 540px 中央，左右各 18px 浅木色边距 */
const BOARD_INNER_SIZE = 504;

/** SVG 网格线位置：15 条线在 0, 36, 72, ..., 504（贴边画，刚好填满 504px 画布） */
const linePositions = computed(() =>
  Array.from({ length: BOARD_SIZE }, (_, i) => i * 36),
);

/** 5 个星位的 SVG 坐标（用线交点） */
const starPointsSvg = STAR_POINTS.map((p) => ({
  cx: p.c * 36,
  cy: p.r * 36,
}));

/** 15 个 row 索引 + 15 个 col 索引（template 用） */
const indices = computed(() => Array.from({ length: BOARD_SIZE }, (_, i) => i));

/** SVG 总尺寸 = 14 段 × 36px = 504（15 条线刚好填满画布，无 36px 空白） */
const SVG_SIZE = BOARD_INNER_SIZE;

/** 判断某条线是否需要加粗 */
function isBold(idx: number): boolean {
  return BOLD_LINES.has(idx);
}
</script>

<template>
  <div class="gomoku-board">
    <!-- 网格线 SVG 层（绝对定位在 board padding 内部，z-index 在 cell 之下） -->
    <svg
      class="gomoku-grid-svg"
      :viewBox="`0 0 ${SVG_SIZE} ${SVG_SIZE}`"
      :width="SVG_SIZE"
      :height="SVG_SIZE"
      aria-hidden="true"
    >
      <!-- 15 条横线 -->
      <line
        v-for="(y, i) in linePositions"
        :key="`hline-${i}`"
        :x1="0"
        :y1="y"
        :x2="SVG_SIZE"
        :y2="y"
        :class="['gomoku-grid-line', { 'is-bold': isBold(i) }]"
      />
      <!-- 15 条竖线 -->
      <line
        v-for="(x, i) in linePositions"
        :key="`vline-${i}`"
        :x1="x"
        :y1="0"
        :x2="x"
        :y2="SVG_SIZE"
        :class="['gomoku-grid-line', { 'is-bold': isBold(i) }]"
      />
      <!-- 5 个星位 -->
      <circle
        v-for="(p, i) in starPointsSvg"
        :key="`star-${i}`"
        :cx="p.cx"
        :cy="p.cy"
        r="3.5"
        class="gomoku-star-point"
      />
    </svg>

    <!-- 15x15 cell 网格（点击区） -->
    <div class="gomoku-grid" role="grid" aria-label="Gomoku board">
      <div
        v-for="r in indices"
        :key="`row-${r}`"
        class="gomoku-row"
        role="row"
      >
        <button
          v-for="c in indices"
          :key="`cell-${r}-${c}`"
          type="button"
          class="gomoku-cell"
          :class="{
            'is-last': isLast(r, c),
            'is-winning': isWinning(r, c),
          }"
          :disabled="props.disabled || cellAt(r, c) !== 0"
          :aria-label="`cell ${r} ${c}`"
          @click="onCellClick(r, c)"
        >
          <div
            v-if="cellAt(r, c) === 1"
            class="gomoku-stone gomoku-stone-black"
          />
          <div
            v-else-if="cellAt(r, c) === 2"
            class="gomoku-stone gomoku-stone-white"
          />
          <div v-else-if="isLast(r, c)" class="gomoku-last-marker" />
        </button>
      </div>
    </div>
  </div>
</template>
