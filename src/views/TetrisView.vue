<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { storeToRefs } from "pinia";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import GamePageHeader from "@/components/GamePageHeader.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import TetrisBoard from "@/components/TetrisBoard.vue";
import TetrisSidebar from "@/components/TetrisSidebar.vue";
import { useTetrisStore } from "@/stores/tetris";
import { useTetrisKeys } from "@/composables/useTetrisKeys";
import { useI18n } from "@/composables/useI18n";

const router = useRouter();
const tetris = useTetrisStore();
const { grid, ghostCells, state, bestScore, isNewBest } = storeToRefs(tetris);
const { t } = useI18n();

useTetrisKeys();

const isPaused = computed(() => state.value.status === "paused");
const isGameOver = computed(() => state.value.status === "gameover");
const isPlaying = computed(() => state.value.status === "playing");
const isWaiting = computed(() => state.value.status === "waiting");

const showLeaveModal = ref(false);
let pendingLeave: (() => void) | null = null;

onMounted(() => {
  // v0.9.4：waiting 状态下不 startLoop（等玩家按方向键 / 旋转 / 硬降时由 start() 内部启动）
  if (tetris.state.status === "playing") {
    tetris.startLoop();
  }
  // 自动暂停：浏览器失焦 / 切到后台 / 最小化时暂停游戏
  document.addEventListener("visibilitychange", onVisibilityChange);
  // 浏览器刷新 / 关闭 / 跨页导航时弹出确认（仅 playing 状态）
  window.addEventListener("beforeunload", onBeforeUnload);
});
onUnmounted(() => {
  tetris.stopLoop();
  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("beforeunload", onBeforeUnload);
});

/** 切到后台自动暂停（防挂机掉线/丢失进度） */
function onVisibilityChange() {
  if (document.hidden && state.value.status === "playing") {
    tetris.pause();
  }
}

/** 浏览器离开页面时弹确认（仅 playing 状态；浏览器会忽略自定义 message） */
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (state.value.status === "playing") {
    e.preventDefault();
    // 兼容 Chrome：必须设置 returnValue 才会弹原生 dialog
    e.returnValue = "";
  }
}

/** 当前 event flash 文本（null = 无） */
const eventText = computed(() => {
  const ev = state.value.lastEvent;
  if (!ev) return null;
  if (ev.kind === "clear") {
    if (ev.tSpin === "tspin" && ev.clearType !== "") {
      return {
        main: `T-SPIN ${ev.clearType.toUpperCase()}`,
        tag: ev.b2b ? "B2B" : null,
        combo: ev.combo >= 2 ? `COMBO ×${ev.combo}` : null,
        cls: "event-tspin",
      };
    }
    if (ev.tSpin === "tspin-mini" && ev.clearType !== "") {
      return {
        main: `T-SPIN MINI ${ev.clearType.toUpperCase()}`,
        tag: null,
        combo: ev.combo >= 2 ? `COMBO ×${ev.combo}` : null,
        cls: "event-tspin-mini",
      };
    }
    if (ev.tSpin === "tspin") {
      return { main: "T-SPIN", tag: null, combo: null, cls: "event-tspin" };
    }
    if (ev.tSpin === "tspin-mini") {
      return { main: "T-SPIN MINI", tag: null, combo: null, cls: "event-tspin-mini" };
    }
    if (ev.clearType === "tetris") {
      return {
        main: "TETRIS",
        tag: ev.b2b ? "B2B" : null,
        combo: ev.combo >= 2 ? `COMBO ×${ev.combo}` : null,
        cls: "event-tetris",
      };
    }
    return {
      main: ev.clearType.toUpperCase(),
      tag: null,
      combo: ev.combo >= 2 ? `COMBO ×${ev.combo}` : null,
      cls: "event-clear",
    };
  }
  return null;
});

/* === 操作 === */
function onNewGame() {
  tetris.reset();
}
function onTogglePause() {
  // v0.9.4: waiting 状态点按钮 = 触发开始（而不是暂停）
  if (isWaiting.value) {
    tetris.start();
    return;
  }
  if (isPlaying.value || isPaused.value) tetris.pause();
}

/* === 返回主页（v0.9.6：未操作直接清进度返回，已操作弹模态确认） === */
function tryBackHome() {
  // v0.9.6: waiting 状态未操作 → 直接清进度返回（不弹模态）
  if (state.value.status === "waiting") {
    tetris.reset();
    router.push("/");
    return;
  }
  // playing / paused → 弹模态
  if (isPlaying.value || isPaused.value) {
    // v0.9.8: 弹模态前同步暂停（避免后台继续 tick 累计分数 / 触发 lock）
    if (isPlaying.value) tetris.pause();
    showLeaveModal.value = true;
    return;
  }
  // gameover 等终态：直接返回（但仍清进度确保下次进入是新局）
  tetris.reset();
  router.push("/");
}
function confirmLeave() {
  showLeaveModal.value = false;
  // v0.9.6: 确认时清空当前进度
  tetris.reset();
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
  if (isPaused.value) tetris.resumeOnly();
}

/* === 路由拦截 === */
onBeforeRouteLeave((to, _from, next) => {
  // v0.9.6: 仅 playing 状态弹模态，waiting 直接放行（已操作过就拦）
  if ((isPlaying.value || isPaused.value) && to.path === "/") {
    showLeaveModal.value = true;
    pendingLeave = () => next();
  } else {
    next();
  }
});
</script>

<template>
  <div class="container-x min-h-screen flex flex-col">
    <Header />
    <!-- v0.9.6: 顶部标题块（游戏名 + 返回主页） -->
    <GamePageHeader title-key="tetris.title" @back-home="tryBackHome" />

    <main class="tetris-game">
      <!-- 左侧：游戏板 + event flash + overlay 蒙版 -->
      <div class="relative">
        <TetrisBoard :grid="grid" :ghost-cells="ghostCells" />

        <!-- Event Flash Overlay（300ms 自动消失） -->
        <Transition name="event-flash">
          <div
            v-if="eventText"
            :key="`${eventText.main}-${Date.now()}`"
            class="tetris-event-overlay"
          >
            <div :class="['tetris-event', eventText.cls]">
              <div class="tetris-event-main">{{ eventText.main }}</div>
              <div v-if="eventText.tag" class="tetris-event-tag tetris-event-tag-b2b">
                {{ eventText.tag }}
              </div>
              <div v-if="eventText.combo" class="tetris-event-tag tetris-event-tag-combo">
                {{ eventText.combo }}
              </div>
            </div>
          </div>
        </Transition>

        <!-- v0.9.4: waiting 状态蒙版（按方向键 / 旋转 / 硬降 开始） -->
        <div v-if="isWaiting" class="game-overlay">
          <div class="game-overlay-text">{{ t("tetris.startHint") }}</div>
        </div>
        <!-- v0.9.4: 暂停状态蒙版（替代 BaseModal 暂停弹窗） -->
        <div v-if="isPaused" class="game-overlay">
          <div class="game-overlay-text">{{ t("tetris.paused") }}</div>
          <div class="game-overlay-hint">{{ t("tetris.controls.resumeHint") }}</div>
        </div>
      </div>

      <!-- 右侧：HUD（标准 sidebar 布局，与 Gomoku / N-Puzzle / 2048 一致） -->
      <TetrisSidebar
        :state="state"
        :best-score="bestScore"
        :is-paused="isPaused"
        :is-game-over="isGameOver"
        :is-waiting="isWaiting"
        @new-game="onNewGame"
        @toggle-pause="onTogglePause"
      />
    </main>

    <!-- 按键说明（v0.9.5：WASD 跟方向键等价） -->
    <section class="tetris-controls" :aria-label="t('tetris.controls.title')">
      <div class="tetris-controls-title">{{ t("tetris.controls.title") }}</div>
      <div class="tetris-controls-grid">
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">←</kbd><kbd class="kbd">A</kbd><kbd class="kbd">→</kbd><kbd class="kbd">D</kbd>
          </span>
          <span class="kbd-label">{{ t("tetris.controls.move") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↓</kbd><kbd class="kbd">S</kbd></span>
          <span class="kbd-label">{{ t("tetris.controls.soft") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">Space</kbd>
          <span class="kbd-label">{{ t("tetris.controls.hard") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row">
            <kbd class="kbd">↑</kbd><kbd class="kbd">W</kbd><kbd class="kbd">Z</kbd>
          </span>
          <span class="kbd-label">{{ t("tetris.controls.rotate") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">C</kbd><kbd class="kbd">Shift</kbd></span>
          <span class="kbd-label">{{ t("tetris.controls.hold") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">P</kbd>
          <span class="kbd-label">{{ t("tetris.controls.pause") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">R</kbd>
          <span class="kbd-label">{{ t("tetris.controls.restart") }}</span>
        </div>
      </div>
    </section>

    <Footer :on-custom-lang-click="() => {}" />

    <!-- 游戏结束弹窗 -->
    <BaseModal
      v-if="isGameOver"
      :title="isNewBest ? t('tetris.newBest') : t('tetris.gameOver')"
      :close-on-backdrop="false"
      @close="onNewGame"
    >
      <p v-if="isNewBest" class="tetris-newbest-msg">
        🎉 {{ t("tetris.newBest") }} — {{ state.score.toLocaleString() }}
      </p>
      <p v-else>
        {{ t("tetris.gameOver") }} — {{ t("tetris.score") }}：{{ state.score.toLocaleString() }}
      </p>
      <p v-if="bestScore > 0" class="text-xs opacity-60 mt-2">
        {{ t("tetris.best") }}：{{ bestScore.toLocaleString() }}
      </p>
      <template #actions>
        <BaseButton variant="ghost" @click="confirmLeave">
          {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="onNewGame">
          {{ t("tetris.controls.restart") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 离开确认模态（与 Gomoku / N-Puzzle / 2048 / 贪吃蛇 一致） -->
    <BaseModal
      v-if="showLeaveModal"
      :title="t('tetris.modal.leave.title')"
      @close="cancelLeave"
    >
      <p>{{ t("tetris.modal.leave.body") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="cancelLeave">
          {{ t("tetris.modal.leave.cancel") }}
        </BaseButton>
        <BaseButton variant="primary" @click="confirmLeave">
          {{ t("tetris.modal.leave.confirm") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
