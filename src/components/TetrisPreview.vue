<script setup lang="ts">
import { computed } from "vue";
import type { PieceType } from "@/games/tetris/types";

const props = withDefaults(
  defineProps<{
    type: PieceType | null;
    /** piece 在 4×2 grid 内的对齐方式：
     *  - "left"  piece 贴左（cols 0-2，col 3 空）— 用于 Next
     *  - "right" piece 贴右（cols 1-3，col 0 空）— 用于 Hold
     *  I-piece 满 4 列，不受 align 影响
     */
    align?: "left" | "right";
  }>(),
  { align: "left" },
);

/** 4×2 统一网格（永远 8 cells）。各 piece 占据其中 4 cells。 */
const GRID_LEFT: Record<PieceType, Array<[number, number]>> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 0], [2, 0], [1, 1], [2, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};

/** 右对齐版本：非 I 块整体右移 1 列 */
const GRID_RIGHT: Record<PieceType, Array<[number, number]>> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], // 满 4 列，无需移动
  O: [[2, 0], [3, 0], [2, 1], [3, 1]],
  T: [[2, 0], [1, 1], [2, 1], [3, 1]],
  S: [[2, 0], [3, 0], [1, 1], [2, 1]],
  Z: [[1, 0], [2, 0], [2, 1], [3, 1]],
  J: [[1, 0], [1, 1], [2, 1], [3, 1]],
  L: [[3, 0], [1, 1], [2, 1], [3, 1]],
};

const filledSet = computed(() => {
  if (!props.type) return new Set<string>();
  const grid = props.align === "right" ? GRID_RIGHT : GRID_LEFT;
  return new Set(grid[props.type].map(([x, y]) => `${x},${y}`));
});
</script>

<template>
  <div :class="['tetris-preview', type ?? 'empty']">
    <div
      v-for="(_, idx) in 8"
      :key="idx"
      :class="[
        'tetris-preview-cell',
        type && filledSet.has(`${idx % 4},${Math.floor(idx / 4)}`) && type,
      ]"
    ></div>
  </div>
</template>
