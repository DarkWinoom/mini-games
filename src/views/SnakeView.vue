<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
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
const { grid, score, snakeLength, status, bestScore, isNewBest } = storeToRefs(store);

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

/* === 返回主页：playing 状态弹模态，其他状态直接走（v0.7.2: waiting 不算"在玩"） === */
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
    case "p":
    case "P":
    case " ":
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
  <div class="flex flex-col min-h-screen container-x">
    <Header />

    <main class="flex-1 py-8">
      <div class="snake-game">
        <div class="snake-board-wrap" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <SnakeBoard :grid="grid" />
          <!-- v0.7.2: waiting 状态显示开始提示 -->
          <div v-if="isWaiting" class="snake-start-hint">
            <span class="snake-start-hint-text">{{ t('snake.startHint') }}</span>
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
          @new-game="onNewGame"
          @toggle-pause="onTogglePause"
          @back-home="tryBackHome"
        />
      </div>
    </main>

    <!-- 规则与玩法（页面下方，复用 .tetris-controls 范式） -->
    <section class="tetris-controls snake-rules-section" :aria-label="t('snake.rules.title')">
      <div class="tetris-controls-title">{{ t('snake.rules.title') }}</div>
      <div class="snake-rules-body">
        <h4>{{ t('snake.rules.goalTitle') }}</h4>
        <p>{{ t('snake.rules.goalBody') }}</p>
        <h4>{{ t('snake.rules.playTitle') }}</h4>
        <p>{{ t('snake.rules.playBody') }}</p>
        <h4>{{ t('snake.rules.dieTitle') }}</h4>
        <p>{{ t('snake.rules.dieBody') }}</p>
        <h4>{{ t('snake.rules.cautionTitle') }}</h4>
        <p>{{ t('snake.rules.cautionBody') }}</p>
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
        <BaseButton variant="ghost" @click="tryBackHome">
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
