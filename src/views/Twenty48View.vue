<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import Twenty48Board from "@/components/Twenty48Board.vue";
import Twenty48Sidebar from "@/components/Twenty48Sidebar.vue";
import { useTwenty48Store } from "@/stores/twothousandfortyeight";
import { useI18n } from "@/composables/useI18n";
import { unlockAudioOnFirstInteraction } from "@/composables/useSFX";
import type { Direction } from "@/games/twothousandfortyeight/types";

const router = useRouter();
const store = useTwenty48Store();
const { t } = useI18n();
const { grid, score, moves, status, canUndo, isNewBest, bestScore, maxTile } = storeToRefs(store);

const showWonModal = ref(false);
const showOverModal = ref(false);
const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

const isWon = computed(() => status.value === "won");
const isOver = computed(() => status.value === "over");
const isPlaying = computed(() => status.value === "playing");

// 监听 won / over 自动弹模态
watchEffect(() => {
  if (isWon.value) showWonModal.value = true;
  if (isOver.value) showOverModal.value = true;
});

function closeWonModal() {
  showWonModal.value = false;
}
function closeOverModal() {
  showOverModal.value = false;
}

function onNewGame() {
  store.newGame();
  showWonModal.value = false;
  showOverModal.value = false;
}
function onUndo() {
  store.undo();
}
function onContinue() {
  store.continueGame();
  showWonModal.value = false;
}

/* === 返回主页：playing 状态弹模态，won/over 直接走 === */
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
    // 兼容 Chrome：必须设置 returnValue 才会弹原生 dialog
    e.returnValue = "";
  }
}

/* === 键盘 === */
function onKeyDown(e: KeyboardEvent) {
  unlockAudioOnFirstInteraction();

  // 模态打开时不响应游戏键
  if (showWonModal.value || showOverModal.value || showLeaveModal.value) return;

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
    case "u":
    case "U":
    case "z":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        store.undo();
      } else {
        store.undo();
      }
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
    store.move(dir);
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
  store.move(dir);
}
</script>

<template>
  <div class="flex flex-col min-h-screen container-x">
    <Header />

    <main class="flex-1 py-8">
      <div class="twenty48-game">
        <div class="twenty48-board-wrap" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <Twenty48Board :grid="grid" />
        </div>
        <Twenty48Sidebar
          :score="score"
          :best-score="bestScore"
          :moves="moves"
          :max-tile="maxTile"
          :can-undo="canUndo"
          :is-over="isOver"
          @new-game="onNewGame"
          @undo="onUndo"
          @back-home="tryBackHome"
        />
      </div>
    </main>

    <!-- 按键说明（v0.9.5：与俄罗斯方块 / 数独统一为键位说明样式） -->
    <section class="tetris-controls twenty48-rules-section" :aria-label="t('twenty48.controls.title')">
      <div class="tetris-controls-title">{{ t("twenty48.controls.title") }}</div>
      <div class="tetris-controls-grid">
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">←</kbd><kbd class="kbd">A</kbd><kbd class="kbd">→</kbd><kbd class="kbd">D</kbd>
          </span>
          <span class="kbd-label">{{ t("twenty48.controls.moveLR") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↑</kbd><kbd class="kbd">W</kbd></span>
          <span class="kbd-label">{{ t("twenty48.controls.moveUp") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↓</kbd><kbd class="kbd">S</kbd></span>
          <span class="kbd-label">{{ t("twenty48.controls.moveDown") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">U</kbd><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Z</kbd></span>
          <span class="kbd-label">{{ t("twenty48.controls.undo") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">R</kbd>
          <span class="kbd-label">{{ t("twenty48.controls.restart") }}</span>
        </div>
      </div>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 胜利模态 -->
    <BaseModal v-if="showWonModal" :title="t('twenty48.modal.win.title')" @close="closeWonModal">
      <p v-if="isNewBest" class="twenty48-newbest-msg">
        {{ t('twenty48.modal.win.newBest') }}
      </p>
      <p v-else>{{ t('twenty48.modal.win.body') }}</p>
      <p class="twenty48-modal-meta">
        {{ t('twenty48.score') }}: <strong>{{ score }}</strong> · {{ t('twenty48.moves') }}: <strong>{{ moves }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="tryBackHome">
          {{ t('common.back') }}
        </BaseButton>
        <BaseButton variant="primary" @click="onContinue">
          {{ t('twenty48.modal.win.continue') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 结束模态 -->
    <BaseModal v-if="showOverModal" :title="t('twenty48.modal.over.title')" @close="closeOverModal">
      <p>{{ t('twenty48.modal.over.body') }}</p>
      <p class="twenty48-modal-meta">
        {{ t('twenty48.score') }}: <strong>{{ score }}</strong> · {{ t('twenty48.maxTile') }}: <strong>{{ maxTile }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="tryBackHome">
          {{ t('common.back') }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t('twenty48.newGame') }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态（F5 / 后退 / 点"返回主页"都走这里） -->
    <BaseModal v-if="showLeaveModal" :title="t('twenty48.modal.leave.title')" @close="cancelLeave">
      <p>{{ t('twenty48.modal.leave.body') }}</p>
      <p class="twenty48-modal-meta">
        {{ t('twenty48.score') }}: <strong>{{ score }}</strong> · {{ t('twenty48.moves') }}: <strong>{{ moves }}</strong>
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t('twenty48.modal.leave.cancel') }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t('twenty48.modal.leave.confirm') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
