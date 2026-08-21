<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import GomokuBoard from "@/components/GomokuBoard.vue";
import GomokuSidebar from "@/components/GomokuSidebar.vue";
import { useGomokuStore } from "@/stores/gomoku";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";
import type { Difficulty } from "@/games/gomoku/types";

const router = useRouter();
const store = useGomokuStore();
const { t } = useI18n();

const {
  board,
  currentPlayer,
  status,
  winner,
  lastMove,
  difficulty,
  isPlaying,
  isOver,
  isAIThinking,
  bestWins,
  aiWins,
  draws,
  winningLine,
  isPlayerTurn,
} = storeToRefs(store);

const showOverModal = ref(false);
const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

const isWon = computed(() => status.value === "over" && winner.value === 1);
const isLost = computed(() => status.value === "over" && winner.value === 2);

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

function onSetDifficulty(d: Difficulty) {
  store.setDifficulty(d);
  showOverModal.value = false;
}

/* === 返回主页：playing 状态弹模态，over 直接走 === */
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

/* === 路由拦截：浏览器后退 / vue-router 跳转都拦（playing 状态弹模态） === */
onBeforeRouteLeave((to, _from, next) => {
  if (isPlaying.value && to.path === "/") {
    showLeaveModal.value = true;
    pendingLeave = () => next();
  } else {
    next();
  }
});

/* === F5 / 关闭 tab 拦截：浏览器原生确认 === */
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isPlaying.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

/* === 键盘：N 新游戏 === */
function onKeyDown(e: KeyboardEvent) {
  unlockAudioOnFirstInteraction();
  if (showOverModal.value || showLeaveModal.value) return;
  if (e.key === "n" || e.key === "N" || e.key === "r" || e.key === "R") {
    e.preventDefault();
    onNewGame();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("beforeunload", onBeforeUnload);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("beforeunload", onBeforeUnload);
});

/* === 棋盘点击 === */
function onCellClick(row: number, col: number) {
  if (!isPlayerTurn.value) return;
  store.place(row, col);
}
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />

    <main class="flex-1 py-8">
      <div class="gomoku-game">
        <div class="gomoku-board-wrap">
          <GomokuBoard
            :board="board"
            :last-move="lastMove"
            :disabled="!isPlayerTurn || isAIThinking"
            :winning-line="winningLine"
            @cell-click="onCellClick"
          />
        </div>
        <GomokuSidebar
          :difficulty="difficulty"
          :current-player="currentPlayer"
          :is-a-i-thinking="isAIThinking"
          :is-playing="isPlaying"
          :is-over="isOver"
          :best-wins="bestWins"
          :ai-wins="aiWins"
          :draws="draws"
          @new-game="onNewGame"
          @set-difficulty="onSetDifficulty"
          @back-home="tryBackHome"
        />
      </div>
    </main>

    <!-- 规则与玩法（页面下方） -->
    <section
      class="tetris-controls gomoku-rules-section"
      :aria-label="t('gomoku.rules.title')"
    >
      <div class="tetris-controls-title">{{ t("gomoku.rules.title") }}</div>
      <div class="gomoku-rules-body">
        <h4>{{ t("gomoku.rules.goalTitle") }}</h4>
        <p>{{ t("gomoku.rules.goalBody") }}</p>
        <h4>{{ t("gomoku.rules.playTitle") }}</h4>
        <p>{{ t("gomoku.rules.playBody") }}</p>
        <h4>{{ t("gomoku.rules.winTitle") }}</h4>
        <p>{{ t("gomoku.rules.winBody") }}</p>
        <h4>{{ t("gomoku.rules.cautionTitle") }}</h4>
        <p>{{ t("gomoku.rules.cautionBody") }}</p>
      </div>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 终局模态 -->
    <BaseModal
      v-if="showOverModal"
      :title="
        isWon
          ? t('gomoku.won')
          : isLost
            ? t('gomoku.lost')
            : t('gomoku.draw')
      "
      @close="closeOverModal"
    >
      <p>{{ t("gomoku.modal.over.body") }}</p>
      <p class="gomoku-modal-meta">
        {{ t("gomoku.you") }}: <strong>{{ bestWins }}</strong>
        · {{ t("gomoku.ai") }}: <strong>{{ aiWins }}</strong>
        · {{ t("gomoku.draw") }}: <strong>{{ draws }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="tryBackHome">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("gomoku.newGame") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态 -->
    <BaseModal
      v-if="showLeaveModal"
      :title="t('gomoku.modal.leave.title')"
      @close="cancelLeave"
    >
      <p>{{ t("gomoku.modal.leave.body") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t("gomoku.modal.leave.cancel") }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t("gomoku.modal.leave.confirm") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
