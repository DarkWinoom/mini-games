<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import GamePageHeader from "@/components/GamePageHeader.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import SudokuBoard from "@/components/SudokuBoard.vue";
import SudokuNumberPad from "@/components/SudokuNumberPad.vue";
import SudokuSidebar from "@/components/SudokuSidebar.vue";
import { useSudokuStore } from "@/stores/sudoku";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";
import { isGivenCell, formatTime } from "@/games/sudoku/engine";
import type { CellPosition, Difficulty } from "@/games/sudoku/types";

const router = useRouter();
const sudoku = useSudokuStore();
const { state, bestTimes, conflicts, userActionCount } = storeToRefs(sudoku);
// 用 state.errors（累计）而非 errorCount computed（每次重算 board）
// 后者会在用户修正错误后把 count 重置为 0，违反"错误数累计"语义
// `difficulties` 是 const 不在 storeToRefs 返回里（storeToRefs 只包 ref/reactive）
// 直接用 sudoku.difficulties 访问即可（不是响应式需要）
const { t } = useI18n();

const isWon = computed(() => state.value.status === "won");
const isFailed = computed(() => state.value.status === "failed");
const isGameOver = computed(() => isWon.value || isFailed.value);
const isPlaying = computed(() => state.value.status === "playing");

const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

/** 选中 cell 是否可编辑（用户 cell + 未 won/paused/failed） */
const canEdit = computed(() => {
  if (state.value.status !== "playing") return false;
  const sel = state.value.selectedCell;
  if (!sel) return false;
  return !isGivenCell(state.value.puzzle, sel.row, sel.col);
});

function onSelectCell(pos: CellPosition) {
  sudoku.selectCell(pos);
}
function onPick(n: number) {
  sudoku.place(n);
}
function onErase() {
  sudoku.erase();
}
function onToggleNotes() {
  sudoku.toggleNotesMode();
}
function onSetDifficulty(d: Difficulty) {
  sudoku.setDifficulty(d);
}
function onNewGame() {
  sudoku.newGame();
}

function moveSelection(dr: number, dc: number) {
  const sel = state.value.selectedCell ?? { row: 0, col: 0 };
  const newRow = Math.max(0, Math.min(8, sel.row + dr));
  const newCol = Math.max(0, Math.min(8, sel.col + dc));
  sudoku.selectCell({ row: newRow, col: newCol });
}

/* === 返回主页（v0.9.7：用 userActionCount 判定未操作，time 判定太严） === */
function tryBackHome() {
  // v0.9.7: 未操作过（userActionCount === 0）→ 直接清进度返回
  if (userActionCount.value === 0) {
    sudoku.newGame();
    router.push("/");
    return;
  }
  // playing 状态 → 弹模态确认
  if (isPlaying.value) {
    showLeaveModal.value = true;
    return;
  }
  // won / failed 等终态：直接清进度返回
  sudoku.newGame();
  router.push("/");
}
function confirmLeave() {
  showLeaveModal.value = false;
  // v0.9.7: 确认时清空当前进度
  sudoku.newGame();
  if (pendingLeave) {
    pendingLeave();
    pendingLeave = null;
  } else {
    router.push("/");
  }
}
function cancelLeave() {
  showLeaveModal.value = false;
  pendingLeave = null;
}

/* === 路由拦截（v0.9.7：已操作才拦） === */
onBeforeRouteLeave((to, _from, next) => {
  if (isPlaying.value && userActionCount.value > 0 && to.path === "/") {
    showLeaveModal.value = true;
    pendingLeave = () => next();
  } else {
    next();
  }
});

/* === 键盘 === */
function onKeyDown(e: KeyboardEvent) {
  // 任何键首次触发都尝试解锁 audio
  unlockAudioOnFirstInteraction();

  // 已结束（won / failed）时仅响应 R（新游戏）
  if (state.value.status === "won" || state.value.status === "failed") {
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      onNewGame();
    }
    return;
  }

  // 数字 1-9 → place
  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    onPick(parseInt(e.key, 10));
    return;
  }
  // Backspace / 0 → erase
  if (e.key === "Backspace" || e.key === "0" || e.key === "Delete") {
    e.preventDefault();
    onErase();
    return;
  }
  // n → toggle notes
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    onToggleNotes();
    return;
  }
  // r → new game
  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    onNewGame();
    return;
  }
  // 方向键 → 移动选中
  if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1, 0); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1, 0); return; }
  if (e.key === "ArrowLeft") { e.preventDefault(); moveSelection(0, -1); return; }
  if (e.key === "ArrowRight") { e.preventDefault(); moveSelection(0, 1); return; }
}

/* === 离开提示 === */
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (state.value.status === "playing") {
    e.preventDefault();
    e.returnValue = "";
  }
}

onMounted(() => {
  sudoku.startTimer();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("beforeunload", onBeforeUnload);
});
onUnmounted(() => {
  sudoku.stopTimer();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("beforeunload", onBeforeUnload);
});
</script>

<template>
  <div class="container-x min-h-screen flex flex-col has-fixed-header">
    <Header />
    <!-- v0.9.6: 顶部标题块（游戏名 + 返回主页） -->
    <GamePageHeader title-key="sudoku.title" @back-home="tryBackHome" />

    <main class="sudoku-game">
      <!-- 左侧：棋盘 + 输入 -->
      <div class="flex flex-col gap-4 items-center">
        <SudokuBoard
          :board="state.board"
          :puzzle="state.puzzle"
          :notes="state.notes"
          :selected-cell="state.selectedCell"
          :conflicts="conflicts"
          :notes-mode="state.notesMode"
          @select="onSelectCell"
        />
        <SudokuNumberPad
          :notes-mode="state.notesMode"
          :can-use-notes="canEdit"
          :disabled="isGameOver"
          @pick="onPick"
          @erase="onErase"
          @toggle-notes="onToggleNotes"
        />
      </div>

      <!-- 右侧：sidebar（标准布局：状态/难度/统计/操作/返回主页） -->
      <SudokuSidebar
        :difficulty="state.difficulty"
        :difficulties="sudoku.difficulties"
        :time="state.time"
        :errors="state.errors"
        :best-times="bestTimes"
        :status="state.status"
        @set-difficulty="onSetDifficulty"
        @new-game="onNewGame"
      />
    </main>

    <!-- 按键说明（v0.9.5：与俄罗斯方块统一只用键位，不写规则详情） -->
    <section class="tetris-controls sudoku-rules-section" :aria-label="t('tetris.controls.title')">
      <div class="tetris-controls-title">{{ t("tetris.controls.title") }}</div>
      <div class="tetris-controls-grid">
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">1-9</kbd></span>
          <span class="kbd-label">{{ t("sudoku.controls.place") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">←</kbd><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd><kbd class="kbd">→</kbd>
          </span>
          <span class="kbd-label">{{ t("sudoku.controls.move") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">N</kbd>
          <span class="kbd-label">{{ t("sudoku.controls.notes") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">⌫</kbd><kbd class="kbd">0</kbd>
          </span>
          <span class="kbd-label">{{ t("sudoku.controls.erase") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">R</kbd>
          <span class="kbd-label">{{ t("sudoku.controls.restart") }}</span>
        </div>
      </div>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 胜利弹窗 -->
    <BaseModal
      v-if="isWon"
      :title="state.isNewBest ? t('sudoku.newBest') : t('sudoku.completed')"
      :close-on-backdrop="false"
      @close="onNewGame"
    >
      <p v-if="state.isNewBest" class="sudoku-newbest-msg">
        🎉 {{ t("sudoku.newBest") }} — {{ formatTime(state.time) }}
      </p>
      <p v-else>
        {{ t("sudoku.completed") }} — {{ t("sudoku.time") }}：{{ formatTime(state.time) }}
      </p>
      <p v-if="state.errors > 0" class="text-xs opacity-60 mt-2">
        {{ t("sudoku.errors") }}：{{ state.errors }}
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="confirmLeave">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("sudoku.newGame") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 失败弹窗（3 错上限） -->
    <BaseModal
      v-if="isFailed"
      :title="t('sudoku.failed')"
      :close-on-backdrop="false"
      @close="onNewGame"
    >
      <p>{{ t("sudoku.failed.message") }}</p>
      <p class="text-xs opacity-60 mt-2">
        {{ t("sudoku.time") }}：{{ formatTime(state.time) }}
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="confirmLeave">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("sudoku.newGame") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态（与 Gomoku / N-Puzzle / 2048 / 贪吃蛇 / 俄罗斯方块 一致） -->
    <BaseModal
      v-if="showLeaveModal"
      :title="t('sudoku.modal.leave.title')"
      @close="cancelLeave"
    >
      <p>{{ t("sudoku.modal.leave.body") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t("sudoku.modal.leave.cancel") }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t("sudoku.modal.leave.confirm") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
