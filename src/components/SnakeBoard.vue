<script setup lang="ts">
import { BOARD_SIZE } from "@/games/snake/types";
import type { Grid } from "@/games/snake/types";

const props = defineProps<{
  grid: Grid;
}>();

function cellClass(value: number): string {
  if (value === 2) return "is-snake-head";
  if (value === 1) return "is-snake-body";
  if (value === 3) return "is-food";
  return "";
}
</script>

<template>
  <div class="snake-board">
    <div
      v-for="(_, r) in BOARD_SIZE"
      :key="`row-${r}`"
      class="snake-row"
    >
      <div
        v-for="(_, c) in BOARD_SIZE"
        :key="`cell-${r}-${c}`"
        :class="['snake-cell', cellClass(props.grid[r][c])]"
      ></div>
    </div>
  </div>
</template>
