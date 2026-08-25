<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import GamePageHeader from "@/components/GamePageHeader.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import BubbleBoard from "@/components/BubbleBoard.vue";
import BubbleSidebar from "@/components/BubbleSidebar.vue";
import { useBubbleStore } from "@/stores/bubble";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";

const router = useRouter();
const store = useBubbleStore();
const { t } = useI18n();

const {
  board,
  shootingBubble,
  currentColor,
  score,
  best,
  isAiming,
  isOver,
  isWon,
  isLost,
  isPaused,
  isNewBest,
} = storeToRefs(store);

const showOverModal = ref(false);
const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

/* === 终局模态自动弹出 === */
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

/* === 飞行泡泡 tick（60fps） === */
let tickId: number | null = null;
function startTick() {
  if (tickId !== null) return;
  tickId = window.setInterval(() => {
    store.tickShooting();
  }, 1000 / 60);
}
function stopTick() {
  if (tickId !== null) {
    window.clearInterval(tickId);
    tickId = null;
  }
}

/* === 失焦自动暂停（仅 aiming） === */
function onVisibilityChange() {
  store.onVisibilityChange(!document.hidden);
}

/* === F5 / 关闭 tab 拦截 === */
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (isAiming.value && !isOver.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

/* === 键盘（v1.0.1：纯鼠标操作，键盘只保留暂停 / 重开） === */
function onKeyDown(e: KeyboardEvent) {
  unlockAudioOnFirstInteraction();
  if (showOverModal.value || showLeaveModal.value) return;
  // 暂停 / 恢复：Space
  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    if (isAiming.value) {
      store.togglePause();
    }
    return;
  }
  // 重开
  if (e.key === "r" || e.key === "R" || e.key === "n" || e.key === "N") {
    e.preventDefault();
    onNewGame();
    return;
  }
  // Escape 返回主页
  if (e.key === "Escape") {
    e.preventDefault();
    tryBackHome();
  }
}

/* === 返回主页（v0.9.6：未操作直接清进度返回，已操作弹模态确认） === */
function tryBackHome() {
  // v0.9.6: 未操作过（score === 0 + aiming）→ 直接清进度返回
  if (isAiming.value && score.value === 0 && !shootingBubble.value) {
    store.newGame();
    router.push("/");
    return;
  }
  // playing/paused 状态 → 弹模态确认
  if (isAiming.value || isPaused.value) {
    // v0.9.8: 弹模态前同步暂停
    if (isAiming.value) store.pauseOnly();
    showLeaveModal.value = true;
    return;
  }
  // 终态 → 直接清进度返回
  store.newGame();
  router.push("/");
}
function confirmLeave() {
  showLeaveModal.value = false;
  // v0.9.6: 确认时清空当前进度
  store.newGame();
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
  // v0.9.8: 取消模态时若处于 paused 状态 → 自动恢复
  if (isPaused.value) store.resumeOnly();
}

/* === 路由拦截（v0.9.6：已操作才拦） === */
onBeforeRouteLeave((to, _from, next) => {
  if ((isAiming.value || isPaused.value) && score.value > 0 && to.path === "/") {
    showLeaveModal.value = true;
    pendingLeave = () => next();
  } else {
    next();
  }
});

/* === 生命周期 === */
onMounted(() => {
  window.addEventListener("beforeunload", onBeforeUnload);
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  startTick();
});
onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
  window.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  stopTick();
});

/* === 鼠标交互（来自 BubbleBoard） === */
function onSetAngle(deg: number) {
  store.setAngle(deg);
}
function onShoot() {
  store.shoot();
}
function onResume() {
  // v1.0.1：暂停时点击屏幕 = 继续（不走倒计时，直接 playing）
  store.resumeOnly();
}

/* === 暂停蒙版文案 === */
const pauseHint = computed(() => t("bubble.pauseHint"));
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />
    <GamePageHeader title-key="bubble.title" @back-home="tryBackHome" />

    <main class="flex-1 py-8">
      <div class="bubble-game">
        <div class="bubble-board-area">
          <BubbleBoard
            :board="board"
            :shooting-bubble="shootingBubble"
            :current-color="currentColor"
            :angle="store.angle"
            :is-aiming="isAiming"
            :is-paused="isPaused"
            :is-lost="isLost"
            :is-won="isWon"
            @set-angle="onSetAngle"
            @shoot="onShoot"
            @resume="onResume"
          />
          <!-- 暂停蒙版（board 内 .game-overlay） -->
          <div v-if="isPaused && isAiming" class="game-overlay">
            <div class="game-overlay-text">{{ t("bubble.paused") }}</div>
            <div class="game-overlay-hint">{{ pauseHint }}</div>
          </div>
        </div>
        <BubbleSidebar
          :score="score"
          :best="best"
          :current-color="currentColor"
          :next-color="store.nextColor"
          :is-paused="isPaused"
          :is-aiming="isAiming"
          :is-over="isOver"
          @new-game="onNewGame"
          @toggle-pause="store.togglePause()"
        />
      </div>
    </main>

    <!-- 规则与玩法（v1.0.1 精简：纯鼠标，无键位说明） -->
    <section
      class="tetris-controls bubble-rules-section"
      :aria-label="t('bubble.rules.title')"
    >
      <div class="tetris-controls-title">{{ t("bubble.rules.title") }}</div>
      <p class="bubble-rule-oneliner">{{ t("bubble.rules.oneLiner") }}</p>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 终局模态 -->
    <BaseModal
      v-if="showOverModal"
      :title="isWon ? (isNewBest ? t('bubble.modal.newBest') : t('bubble.modal.win.title')) : t('bubble.modal.lose.title')"
      @close="closeOverModal"
    >
      <p v-if="isWon">{{ t("bubble.modal.win.body") }}</p>
      <p v-else>{{ t("bubble.modal.lose.body") }}</p>
      <p class="bubble-modal-meta">
        {{ t("bubble.score") }}: <strong>{{ score }}</strong>
        · {{ t("bubble.best") }}: <strong>{{ best }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="confirmLeave">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("bubble.newGame") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态 -->
    <BaseModal
      v-if="showLeaveModal"
      :title="t('bubble.modal.leave.title')"
      @close="cancelLeave"
    >
      <p>{{ t("bubble.modal.leave.body") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t("bubble.modal.leave.cancel") }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t("bubble.modal.leave.confirm") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
