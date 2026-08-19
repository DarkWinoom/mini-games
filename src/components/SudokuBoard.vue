<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { BOARD_SIZE, BOX_SIZE } from "@/games/sudoku/types";
import { isGivenCell } from "@/games/sudoku/engine";
import type { Grid, CellPosition } from "@/games/sudoku/types";

const props = defineProps<{
  /** 9x9 棋盘（null = 空） */
  board: Grid;
  /** 初始题目 81 字符串 */
  puzzle: string;
  /** 笔注 9x9 集合 */
  notes: Set<number>[][];
  /** 选中 cell */
  selectedCell: CellPosition | null;
  /** 冲突 cell 集合（"row,col" 形式） */
  conflicts: Set<string>;
  /** 是否笔注模式（决定空 cell 显示什么） */
  notesMode: boolean;
}>();

const emit = defineEmits<{
  select: [pos: CellPosition];
}>();

/** 选中的数字（用于高亮同号 cells） */
const selectedNumber = computed<number | null>(() => {
  const sel = props.selectedCell;
  if (!sel) return null;
  return props.board[sel.row][sel.col];
});

/** 单元格 box 边界 + 边缘状态（CSS 用 border 画，v0.5.2 替代之前的 margin 方案） */

/** cell 是否在 3×3 box 右侧边界（col 2 / 5，最后一列除外） */
function isBoxRight(col: number): boolean {
  return col % BOX_SIZE === 2;
}

/** cell 是否在 3×3 box 底部边界（row 2 / 5，最后一行除外） */
function isBoxBottom(row: number): boolean {
  return row % BOX_SIZE === 2;
}

/** cell 是否在最右列（外框由 board border 提供，cell 不画右 border） */
function isLastCol(col: number): boolean {
  return col === BOARD_SIZE - 1;
}

/** cell 是否在最下行 */
function isLastRow(row: number): boolean {
  return row === BOARD_SIZE - 1;
}

function isSelected(row: number, col: number): boolean {
  const sel = props.selectedCell;
  if (!sel) return false;
  return sel.row === row && sel.col === col;
}

function isSameNumber(row: number, col: number): boolean {
  const n = selectedNumber.value;
  if (n === null) return false;
  if (isSelected(row, col)) return false;
  return props.board[row][col] === n;
}

function isSameBox(row: number, col: number): boolean {
  const sel = props.selectedCell;
  if (!sel) return false;
  if (isSelected(row, col)) return false;
  return (
    Math.floor(sel.row / BOX_SIZE) === Math.floor(row / BOX_SIZE) &&
    Math.floor(sel.col / BOX_SIZE) === Math.floor(col / BOX_SIZE)
  );
}

function isConflict(row: number, col: number): boolean {
  return props.conflicts.has(`${row},${col}`);
}

function isGiven(row: number, col: number): boolean {
  return isGivenCell(props.puzzle, row, col);
}

function onCellClick(row: number, col: number): void {
  emit("select", { row, col });
}

/* === 错误反馈：刚出错的 cell 短暂脉冲突红（v0.5.5） ===
 * 区别于持续红底的 is-conflict："刚出错" = 脉冲 3 次（0.6s），结束退回持续红
 * watch conflicts 集合的 diff 找出"新增冲突"的 cell key
 */
const recentlyFlagged = ref<Set<string>>(new Set());
const flaggedTimers = new Map<string, number>();

watch(
  () => props.conflicts,
  (newSet, oldSet) => {
    // 防御：第一次 watch 时 oldSet 是 undefined
    const oldKeys = oldSet ?? new Set<string>();
    for (const key of newSet) {
      if (oldKeys.has(key)) continue; // 旧冲突不触发
      // 新增冲突：加入 recentlyFlagged，0.6s 后移除
      recentlyFlagged.value = new Set([...recentlyFlagged.value, key]);
      // 清掉旧 timer（如果 cell 短时间内多次被加入）
      const oldTimer = flaggedTimers.get(key);
      if (oldTimer !== undefined) {
        window.clearTimeout(oldTimer);
        flaggedTimers.delete(key);
      }
      const timer = window.setTimeout(() => {
        const next = new Set(recentlyFlagged.value);
        next.delete(key);
        recentlyFlagged.value = next;
        flaggedTimers.delete(key);
      }, 600);
      flaggedTimers.set(key, timer);
    }
  },
);

onUnmounted(() => {
  for (const t of flaggedTimers.values()) window.clearTimeout(t);
  flaggedTimers.clear();
});

function isJustFlagged(row: number, col: number): boolean {
  return recentlyFlagged.value.has(`${row},${col}`);
}

/** 把 Set<number> 渲染成 3×3 mini-grid 的 boolean[][]（用于笔注） */
function notesAsGrid(notesSet: Set<number>): boolean[][] {
  const out: boolean[][] = [];
  for (let r = 0; r < 3; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < 3; c++) {
      const n = r * 3 + c + 1;
      row.push(notesSet.has(n));
    }
    out.push(row);
  }
  return out;
}
</script>

<template>
  <div class="sudoku-board">
    <div
      v-for="(_, row) in BOARD_SIZE"
      :key="`row-${row}`"
      class="sudoku-row"
    >
      <div
        v-for="(_, col) in BOARD_SIZE"
        :key="`cell-${row}-${col}`"
        :class="[
          'sudoku-cell',
          {
            'box-right': isBoxRight(col),
            'box-bottom': isBoxBottom(row),
            'col-last': isLastCol(col),
            'row-last': isLastRow(row),
            'is-selected': isSelected(row, col),
            'is-same-number': isSameNumber(row, col),
            'is-same-box': isSameBox(row, col),
            'is-conflict': isConflict(row, col),
            'is-pulse': isJustFlagged(row, col),
            'is-given': isGiven(row, col),
          },
        ]"
        @click="onCellClick(row, col)"
      >
        <!-- 有值（用户填的或 given） -->
        <span
          v-if="board[row][col] !== null"
          class="sudoku-cell-value"
        >{{ board[row][col] }}</span>
        <!-- 笔注：notes mode + 空 cell + 有 notes -->
        <div
          v-else-if="notesMode && notes[row][col].size > 0"
          class="sudoku-notes-grid"
        >
          <span
            v-for="(cellNotes, nr) in notesAsGrid(notes[row][col])"
            :key="`nr-${nr}`"
            class="sudoku-notes-row"
          >
            <span
              v-for="(has, nc) in cellNotes"
              :key="`nc-${nc}`"
              :class="['sudoku-notes-cell', { 'has': has }]"
            >{{ has ? nr * 3 + nc + 1 : '' }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
