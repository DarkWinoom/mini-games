<script setup lang="ts">
import { computed } from "vue";
import type { Board, Size } from "@/games/npuzzle/types";

/**
 * 数字华容道棋盘
 *
 * 视觉：
 * - size×size 网格（3 或 4）
 * - 浅木色背景
 * - 数字块：圆角矩形 + 紫蓝渐变色阶（按数字大小 1-N 渐变）
 * - 空格：浅木色（无方块）
 * - 点击数字块 → 移动（如果可移动）
 *
 * 交互：
 * - 点击 cell → emit cellClick(row, col)
 * - 父组件根据 isAdjacentToEmpty 决定是否触发 moveTile
 */

const props = defineProps<{
  board: Board;
  size: Size;
  isOver: boolean;
  /** 5 连线高亮（胜利后全方块高亮） */
  isWinning: boolean;
}>();

const emit = defineEmits<{
  cellClick: [row: number, col: number];
}>();

function cellAt(r: number, c: number): number {
  return props.board[r]?.[c] ?? 0;
}

function onCellClick(r: number, c: number): void {
  if (props.isOver) return;
  // 空格不能点击移动
  if (cellAt(r, c) === 0) return;
  emit("cellClick", r, c);
}

/**
 * 计算行高亮（胜利后全方块高亮）
 * 胜利状态：除空格外所有方块高亮
 */
function isWinningCell(value: number): boolean {
  return props.isWinning && value !== 0;
}

/** 数字块颜色：按数值大小 11 档紫蓝渐变（跟 2048 一致） */
const TILE_COLORS = [
  "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)", // 1 - 最浅
  "linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)", // 2
  "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)", // 3
  "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)", // 4
  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", // 5
  "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", // 6
  "linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)", // 7
  "linear-gradient(135deg, #5b21b6 0%, #4c1d95 100%)", // 8
  "linear-gradient(135deg, #4c1d95 0%, #312e81 100%)", // 9+
  "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)", // 10+
  "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)", // 11+ (N)
];

/** 文字颜色：浅色块用深色文字，深色块用白色文字 */
function textColorClass(value: number, size: Size): string {
  const max = size * size - 1;
  const ratio = value / max;
  if (ratio <= 0.4) return "is-light";
  return "is-dark";
}

/** 数字块背景色（按 value 选渐变） */
function tileColor(value: number, size: Size): string {
  const max = size * size - 1;
  const idx = Math.min(
    Math.floor((value / max) * TILE_COLORS.length),
    TILE_COLORS.length - 1,
  );
  return TILE_COLORS[idx];
}

/** size×size 索引 */
const indices = computed(() =>
  Array.from({ length: props.size }, (_, i) => i),
);
</script>

<template>
  <div
    class="npuzzle-board"
    :class="[`is-size-${size}`, { 'is-over': isOver }]"
  >
    <div
      v-for="r in indices"
      :key="`row-${r}`"
      class="npuzzle-row"
    >
      <button
        v-for="c in indices"
        :key="`cell-${r}-${c}`"
        type="button"
        class="npuzzle-cell"
        :class="{
          'is-empty': cellAt(r, c) === 0,
          'is-winning': isWinningCell(cellAt(r, c)),
        }"
        :style="{
          background:
            cellAt(r, c) !== 0
              ? tileColor(cellAt(r, c), size)
              : undefined,
        }"
        :disabled="isOver || cellAt(r, c) === 0"
        :aria-label="`cell ${r} ${c} value ${cellAt(r, c)}`"
        @click="onCellClick(r, c)"
      >
        <span
          v-if="cellAt(r, c) !== 0"
          :class="['npuzzle-tile-text', textColorClass(cellAt(r, c), size)]"
        >
          {{ cellAt(r, c) }}
        </span>
      </button>
    </div>
  </div>
</template>
