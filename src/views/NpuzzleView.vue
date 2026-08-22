<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import NpuzzleBoard from "@/components/NpuzzleBoard.vue";
import NpuzzleSidebar from "@/components/NpuzzleSidebar.vue";
import { useNpuzzleStore } from "@/stores/npuzzle";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";
import type { Size } from "@/games/npuzzle/types";
import { isSolved } from "@/games/npuzzle/engine";

const router = useRouter();
const store = useNpuzzleStore();
const { t } = useI18n();

const {
  board,
  size,
  status,
  movesCount,
  elapsed,
  isOver,
  isPlaying,
  isNewBest,
  canUndo,
  bestRecord,
} = storeToRefs(store);

const showOverModal = ref(false);
const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

watchEffect(() => {
  if (isOver.value) showOverModal.value = true;
});

function closeOverModal() {
  showOverModal.value = false;
}

function onNewGame() {
  store.newGame();
  showOverModal.value = false;
}

function onSetSize(s: Size) {
  store.setSize(s);
  showOverModal.value = false;
}

function onUndo() {
  store.undo();
}

function onCellClick(row: number, col: number) {
  store.moveTile(row, col);
}

/* === 返回主页 === */
function tryBackHome() {
  if (isPlaying.value) {
    showLeaveModal.value = true;
  } else {
    router.push("/");
  }
}
function confirmLeave() {
  showLeaveModal.value = false;
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

/* === 路由拦截 === */
onBeforeRouteLeave((to, _from, next) => {
  if (isPlaying.value && to.path === "/") {
    showLeaveModal.value = true;
    pendingLeave = () => next();
  } else {
    next();
  }
});

/* === F5 / 关闭 tab 拦截 === */
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isPlaying.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

/* === 计时器 === */
let timerId: number | null = null;
onMounted(() => {
  window.addEventListener("beforeunload", onBeforeUnload);
  // 每秒 tick 一次
  timerId = window.setInterval(() => {
    store.tick();
  }, 1000);
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
});

/* === 键盘 === */
function onKeyDown(e: KeyboardEvent) {
  unlockAudioOnFirstInteraction();
  if (showOverModal.value || showLeaveModal.value) return;
  if (e.key === "n" || e.key === "N" || e.key === "r" || e.key === "R") {
    e.preventDefault();
    onNewGame();
  } else if (e.key === "u" || e.key === "U" || (e.ctrlKey && (e.key === "z" || e.key === "Z"))) {
    e.preventDefault();
    onUndo();
  }
}
onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

/** 胜利高亮：所有非空格 */
const isWinning = computed(() => isSolved(board.value, size.value));

/** mm:ss 格式（用于终局模态显示） */
function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />

    <main class="flex-1 py-8">
      <div class="npuzzle-game">
        <div class="npuzzle-board-wrap">
          <NpuzzleBoard
            :board="board"
            :size="size"
            :is-over="isOver"
            :is-winning="isWinning"
            @cell-click="onCellClick"
          />
        </div>
        <NpuzzleSidebar
          :size="size"
          :status="status"
          :moves-count="movesCount"
          :elapsed="elapsed"
          :can-undo="canUndo"
          :is-over="isOver"
          :best-moves="bestRecord?.moves ?? null"
          :best-time="bestRecord?.time ?? null"
          @new-game="onNewGame"
          @set-size="onSetSize"
          @undo="onUndo"
          @back-home="tryBackHome"
        />
      </div>
    </main>

    <!-- 规则与玩法（v0.9.5：精简为一句话） -->
    <section
      class="tetris-controls npuzzle-rules-section"
      :aria-label="t('npuzzle.rules.title')"
    >
      <div class="tetris-controls-title">{{ t("npuzzle.rules.title") }}</div>
      <p class="npuzzle-rule-oneliner">{{ t("npuzzle.rules.oneLiner") }}</p>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 终局模态 -->
    <BaseModal
      v-if="showOverModal"
      :title="isNewBest ? t('npuzzle.modal.newBest') : t('npuzzle.modal.over.title')"
      @close="closeOverModal"
    >
      <p>{{ t("npuzzle.modal.over.body") }}</p>
      <p class="npuzzle-modal-meta">
        {{ t("npuzzle.moves") }}: <strong>{{ movesCount }}</strong>
        · {{ t("npuzzle.time") }}: <strong>{{ formatTime(elapsed) }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="tryBackHome">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("npuzzle.newGame") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态 -->
    <BaseModal
      v-if="showLeaveModal"
      :title="t('npuzzle.modal.leave.title')"
      @close="cancelLeave"
    >
      <p>{{ t("npuzzle.modal.leave.body") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t("npuzzle.modal.leave.cancel") }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t("npuzzle.modal.leave.confirm") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
