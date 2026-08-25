<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import GamePageHeader from "@/components/GamePageHeader.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import SnakeBoard from "@/components/SnakeBoard.vue";
import SnakeSidebar from "@/components/SnakeSidebar.vue";
import { useSnakeStore } from "@/stores/snake";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";
import type { Direction } from "@/games/snake/types";

const router = useRouter();
const store = useSnakeStore();
const { t } = useI18n();
const { grid, score, snakeLength, status, bestScore, isNewBest, resumeCountdown } = storeToRefs(store);

const showOverModal = ref(false);
const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

const isPlaying = computed(() => status.value === "playing");
const isPaused = computed(() => status.value === "paused");
const isOver = computed(() => status.value === "over");
const isWaiting = computed(() => status.value === "waiting");

// 监听 over 自动弹模态
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
function onTogglePause() {
  store.togglePause();
}

/* === 返回主页（v0.9.6：未操作直接清进度返回，已操作弹模态确认） === */
function tryBackHome() {
  // v0.9.6: waiting 状态未操作 → 直接清进度返回
  if (isWaiting.value) {
    store.newGame();
    router.push("/");
    return;
  }
  // playing / paused → 弹模态确认
  if (isPlaying.value || isPaused.value) {
    // v0.9.8: 弹模态前同步暂停（不走倒计时，直接 paused）
    if (isPlaying.value) store.pauseOnly();
    showLeaveModal.value = true;
    return;
  }
  // over 等终态：直接清进度返回
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
  // v0.9.8: 取消模态时若处于 paused 状态 → 自动恢复（玩家期望"取消" = 继续玩）
  if (isPaused.value) store.resumeOnly();
}

/* === 路由拦截（v0.9.6：已操作才拦） === */
onBeforeRouteLeave((to, _from, next) => {
  if ((isPlaying.value || isPaused.value) && to.path === "/") {
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

/* === 失焦自动暂停（防挂机） === */
function onVisibilityChange() {
  if (document.hidden && isPlaying.value) {
    store.togglePause();
  }
}

/* === 键盘 === */
function onKeyDown(e: KeyboardEvent) {
  unlockAudioOnFirstInteraction();

  // 模态打开时不响应游戏键
  if (showOverModal.value || showLeaveModal.value) return;

  let dir: Direction | null = null;
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      dir = "up";
      break;
    case "ArrowDown":
    case "s":
    case "S":
      dir = "down";
      break;
    case "ArrowLeft":
    case "a":
    case "A":
      dir = "left";
      break;
    case "ArrowRight":
    case "d":
    case "D":
      dir = "right";
      break;
    case " ":
      // v0.9.5: 暂停改用 Space 键（更醒目，跟现代游戏习惯一致）
      e.preventDefault();
      store.togglePause();
      return;
    case "r":
    case "R":
    case "n":
    case "N":
      store.newGame();
      return;
  }

  if (dir) {
    e.preventDefault();
    store.setDirection(dir);
  }
}

onMounted(() => {
  // v0.7.2 fix：默认 waiting，不自动 startTick。玩家按方向键触发 start()
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibilityChange);
});
onUnmounted(() => {
  store.stopTick();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("beforeunload", onBeforeUnload);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

/* === 触屏滑动 === */
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;

function onTouchStart(e: TouchEvent) {
  const t0 = e.touches[0];
  if (!t0) return;
  touchStartX = t0.clientX;
  touchStartY = t0.clientY;
}
function onTouchEnd(e: TouchEvent) {
  const t1 = e.changedTouches[0];
  if (!t1) return;
  const dx = t1.clientX - touchStartX;
  const dy = t1.clientY - touchStartY;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < SWIPE_THRESHOLD) return;
  let dir: Direction;
  if (absX > absY) {
    dir = dx > 0 ? "right" : "left";
  } else {
    dir = dy > 0 ? "down" : "up";
  }
  store.setDirection(dir);
}
</script>

<template>
  <div class="flex flex-col min-h-screen container-x has-fixed-header">
    <Header />
    <!-- v0.9.6: 顶部标题块（游戏名 + 返回主页） -->
    <GamePageHeader title-key="snake.title" @back-home="tryBackHome" />

    <main class="flex-1 py-8">
      <div class="snake-game">
        <div class="snake-board-wrap" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <SnakeBoard :grid="grid" />
          <!-- v0.7.2: waiting 状态显示开始提示 -->
          <div v-if="isWaiting" class="snake-start-hint">
            <span class="snake-start-hint-text">{{ t('snake.startHint') }}</span>
          </div>
          <!-- v0.9.7: 暂停状态蒙版（仅在 paused 状态且非倒计时中显示） -->
          <div v-if="isPaused && resumeCountdown === 0" class="game-overlay">
            <div class="game-overlay-text">{{ t('snake.paused') }}</div>
            <div class="game-overlay-hint">{{ t('snake.pauseHint') }}</div>
          </div>
          <!-- v0.9.7: 倒计时小数字（角落，不遮场，让玩家看见场上情况） -->
          <div v-if="isPaused && resumeCountdown > 0" class="resume-countdown">
            {{ resumeCountdown }}
          </div>
        </div>
        <SnakeSidebar
          :score="score"
          :best-score="bestScore"
          :snake-length="snakeLength"
          :is-playing="isPlaying"
          :is-paused="isPaused"
          :is-over="isOver"
          :is-waiting="isWaiting"
          :is-counting-down="resumeCountdown > 0"
          @new-game="onNewGame"
          @toggle-pause="onTogglePause"
        />
      </div>
    </main>

    <!-- 按键说明（v0.9.5：与俄罗斯方块 / 2048 统一为键位说明样式） -->
    <section class="tetris-controls snake-rules-section" :aria-label="t('snake.controls.title')">
      <div class="tetris-controls-title">{{ t("snake.controls.title") }}</div>
      <div class="tetris-controls-grid">
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">←</kbd><kbd class="kbd">A</kbd><kbd class="kbd">→</kbd><kbd class="kbd">D</kbd>
          </span>
          <span class="kbd-label">{{ t("snake.controls.moveLR") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↑</kbd><kbd class="kbd">W</kbd></span>
          <span class="kbd-label">{{ t("snake.controls.moveUp") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↓</kbd><kbd class="kbd">S</kbd></span>
          <span class="kbd-label">{{ t("snake.controls.moveDown") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">Space</kbd>
          <span class="kbd-label">{{ t("snake.controls.pause") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">R</kbd>
          <span class="kbd-label">{{ t("snake.controls.restart") }}</span>
        </div>
      </div>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 结束模态 -->
    <BaseModal v-if="showOverModal" :title="t('snake.modal.over.title')" @close="closeOverModal">
      <p>{{ t('snake.modal.over.body') }}</p>
      <p v-if="isNewBest" class="twenty48-newbest-msg">
        {{ t('twenty48.modal.win.newBest') }}
      </p>
      <p class="twenty48-modal-meta">
        {{ t('snake.score') }}: <strong>{{ score }}</strong> · {{ t('snake.length') }}: <strong>{{ snakeLength }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="confirmLeave">
          {{ t('common.back') }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t('snake.newGame') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态 -->
    <BaseModal v-if="showLeaveModal" :title="t('snake.modal.leave.title')" @close="cancelLeave">
      <p>{{ t('snake.modal.leave.body') }}</p>
      <p class="twenty48-modal-meta">
        {{ t('snake.score') }}: <strong>{{ score }}</strong> · {{ t('snake.length') }}: <strong>{{ snakeLength }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t('snake.modal.leave.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t('snake.modal.leave.confirm') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
