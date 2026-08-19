<script setup lang="ts">
import { computed } from "vue";
import { ROWS, HIDDEN_ROWS } from "@/games/tetris/types";
import type { Cell } from "@/games/tetris/types";

const props = defineProps<{
  /** 已合并 current piece 的渲染网格（renderGrid 输出，长度 ROWS + HIDDEN_ROWS） */
  grid: Cell[][];
  /** Ghost cells 集合（"x,y" 形式） */
  ghostCells: Set<string>;
}>();

/** 跳过顶部隐藏行（HIDDEN_ROWS），只显示用户可见的 20 行 */
const visibleRows = computed(() =>
  props.grid.slice(HIDDEN_ROWS, HIDDEN_ROWS + ROWS),
);

function isGhost(y: number, x: number): boolean {
  return props.ghostCells.has(`${x},${y}`);
}
</script>

<template>
  <div class="tetris-board">
    <template v-for="(row, y) in visibleRows" :key="y">
      <div
        v-for="(cell, x) in row"
        :key="`${y}-${x}`"
        :class="[
          'tetris-cell',
          cell !== 0 && cell,
          cell === 0 && isGhost(y + HIDDEN_ROWS, x) && 'ghost',
        ]"
      ></div>
    </template>
  </div>
</template>
