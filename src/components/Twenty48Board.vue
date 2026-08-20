<script setup lang="ts">
import { ref, watch } from "vue";
import { BOARD_SIZE } from "@/games/twothousandfortyeight/types";
import type { Grid } from "@/games/twothousandfortyeight/types";

const props = defineProps<{
  grid: Grid;
}>();

/**
 * Cell 状态机（每格独立）：
 * - "normal" — 普通
 * - "new"    — 0 → n（新生成 tile），200ms 后回 normal
 * - "merged" — n → 2n（合并产生），200ms 后回 normal
 */
type CellState = "normal" | "new" | "merged";

/** 每格的 state（行×列） */
const cellStates = ref<CellState[][]>([]);
function ensureStateMatrix(): CellState[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    new Array<CellState>(BOARD_SIZE).fill("normal"),
  );
}
cellStates.value = ensureStateMatrix();

/** 上一次的 grid（用于 diff） */
let prevGrid: Grid | null = null;

watch(
  () => props.grid,
  (newGrid) => {
    const next = ensureStateMatrix();
    if (prevGrid !== null) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const prev = prevGrid[r][c];
          const curr = newGrid[r][c];
          if (prev === 0 && curr !== 0) {
            next[r][c] = "new";
          } else if (curr !== 0 && curr === 2 * prev) {
            next[r][c] = "merged";
          }
        }
      }
    }
    cellStates.value = next;
    prevGrid = newGrid;

    // 200ms 后清掉 new / merged（保留视觉效果一次）
    if (prevGrid !== null) {
      window.setTimeout(() => {
        const cleared = ensureStateMatrix();
        cellStates.value = cleared;
      }, 200);
    }
  },
  { deep: true },
);

function stateClass(r: number, c: number): string {
  const s = cellStates.value[r]?.[c] ?? "normal";
  if (s === "new") return "is-new";
  if (s === "merged") return "is-merged";
  return "";
}
</script>

<template>
  <div class="twenty48-board">
    <div
      v-for="(_, r) in BOARD_SIZE"
      :key="`row-${r}`"
      class="twenty48-row"
    >
      <div
        v-for="(_, c) in BOARD_SIZE"
        :key="`cell-${r}-${c}`"
        :class="['twenty48-cell', stateClass(r, c)]"
      >
        <div
          v-if="props.grid[r][c] !== 0"
          :class="['twenty48-tile', `twenty48-tile-${props.grid[r][c]}`]"
        >
          {{ props.grid[r][c] }}
        </div>
      </div>
    </div>
  </div>
</template>
