<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseButton from "@/components/BaseButton.vue";
import TetrisBoard from "@/components/TetrisBoard.vue";
import TetrisPreview from "@/components/TetrisPreview.vue";
import { useTetrisStore } from "@/stores/tetris";
import { useTetrisKeys } from "@/composables/useTetrisKeys";
import { useI18n } from "@/composables/useI18n";
import { sfxMuted, toggleMute } from "@/composables/useSFX";
import { storeToRefs } from "pinia";

const router = useRouter();
const tetris = useTetrisStore();
const { grid, ghostCells, state, bestScore, isNewBest } = storeToRefs(tetris);
const { t } = useI18n();

useTetrisKeys();

onMounted(() => {
  tetris.startLoop();
  // 自动暂停：浏览器失焦 / 切到后台 / 最小化时暂停游戏
  // （仅 playing 状态触发；paused / gameover / idle 不重复触发）
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

const isPaused = computed(() => state.value.status === "paused");
const isGameOver = computed(() => state.value.status === "gameover");
const isPlaying = computed(() => state.value.status === "playing");

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

function resume() {
  if (isPaused.value) tetris.pause();
}
function restart() {
  tetris.reset();
}
function backHome() {
  router.push("/");
}
function onToggleMute() {
  toggleMute();
}
function onTogglePause() {
  if (isPlaying.value || isPaused.value) tetris.pause();
}
</script>

<template>
  <div class="container-x min-h-screen flex flex-col">
    <Header />

    <main class="flex-1 flex items-center justify-center gap-8 py-8">
      <!-- 左侧：游戏板 + event flash -->
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
      </div>

      <!-- 右侧：HUD -->
      <div class="flex flex-col gap-4 w-[200px]">
        <!-- Pause / Mute toggle row -->
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="icon-btn"
            :aria-label="isPaused ? t('tetris.resume') : t('common.pause')"
            :title="isPaused ? t('tetris.resume') : t('common.pause')"
            @click="onTogglePause"
          >
            <span v-if="isPaused">▶</span>
            <span v-else>⏸</span>
          </button>
          <button
            type="button"
            class="icon-btn"
            :aria-label="sfxMuted ? t('tetris.unmute') : t('tetris.mute')"
            :title="sfxMuted ? t('tetris.unmute') : t('tetris.mute')"
            @click="onToggleMute"
          >
            <span v-if="sfxMuted">🔇</span>
            <span v-else>🔊</span>
          </button>
        </div>

        <!-- Hold -->
        <div class="card !p-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider mb-2">
            {{ t("tetris.hold") }}
          </h3>
          <div class="flex justify-end">
            <!-- Hold 内部右对齐：piece 贴右，列 0 空（用户反馈：右侧内容不应空） -->
            <TetrisPreview :type="state.hold" align="right" />
          </div>
        </div>

        <!-- Next -->
        <div class="card !p-4">
          <h3 class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider mb-2">
            {{ t("tetris.next") }}
          </h3>
          <div class="flex flex-col gap-2 items-start">
            <!-- Next 内部左对齐：piece 贴左，列 3 空（用户反馈：左侧区域不应空） -->
            <TetrisPreview :type="state.next[0]" align="left" />
            <TetrisPreview :type="state.next[1]" align="left" />
            <TetrisPreview :type="state.next[2]" align="left" />
          </div>
        </div>

        <!-- Score / Level / Lines / Best / B2B / Combo -->
        <div class="card !p-4">
          <div class="space-y-2">
            <div>
              <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
                {{ t("tetris.score") }}
              </div>
              <div class="stat-value">{{ state.score.toLocaleString() }}</div>
              <!-- Best 副标：始终显示，0 时隐藏 -->
              <div
                v-if="bestScore > 0"
                class="tetris-best-row"
                :title="t('tetris.best')"
              >
                <span class="tetris-best-label">{{ t("tetris.best") }}</span>
                <span class="tetris-best-value">{{ bestScore.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex gap-4">
              <div>
                <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
                  {{ t("tetris.level") }}
                </div>
                <div class="stat-value text-2xl">{{ state.level }}</div>
              </div>
              <div>
                <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
                  {{ t("tetris.lines") }}
                </div>
                <div class="stat-value text-2xl">{{ state.lines }}</div>
              </div>
            </div>
            <!-- v2: B2B / Combo 指示器 -->
            <div class="flex gap-2 pt-1">
              <span
                v-if="state.b2b"
                class="tetris-hud-badge tetris-hud-badge-b2b"
                :title="t('tetris.b2b')"
              >{{ t("tetris.b2b") }}</span>
              <span
                v-if="state.combo >= 1"
                class="tetris-hud-badge tetris-hud-badge-combo"
                :title="t('tetris.combo')"
              >{{ t("tetris.combo") }} ×{{ state.combo }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 按键说明 -->
    <section class="tetris-controls" :aria-label="t('tetris.controls.title')">
      <div class="tetris-controls-title">{{ t("tetris.controls.title") }}</div>
      <div class="tetris-controls-grid">
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">←</kbd><kbd class="kbd">→</kbd></span>
          <span class="kbd-label">{{ t("tetris.controls.move") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">↓</kbd>
          <span class="kbd-label">{{ t("tetris.controls.soft") }}</span>
        </div>
        <div class="tetris-controls-item">
          <kbd class="kbd">Space</kbd>
          <span class="kbd-label">{{ t("tetris.controls.hard") }}</span>
        </div>
        <div class="tetris-controls-item">
          <span class="kbd-row"><kbd class="kbd">↑</kbd><kbd class="kbd">Z</kbd></span>
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

    <!-- 暂停弹窗 -->
    <BaseModal
      v-if="isPaused"
      :title="t('tetris.paused')"
      :close-on-backdrop="false"
      @close="resume"
    >
      <p>{{ t("tetris.paused") }} — {{ t("tetris.controls.resumeHint") }}</p>
      <template #actions>
        <BaseButton variant="ghost" @click="backHome">
          ← {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="restart">
          {{ t("common.restart") }}
        </BaseButton>
        <BaseButton variant="primary" @click="resume">
          {{ t("tetris.resume") }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- 游戏结束弹窗 -->
    <BaseModal
      v-if="isGameOver"
      :title="isNewBest ? t('tetris.newBest') : t('tetris.gameOver')"
      :close-on-backdrop="false"
      @close="restart"
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
        <BaseButton variant="ghost" @click="backHome">
          ← {{ t("common.back") }}
        </BaseButton>
        <BaseButton variant="primary" @click="restart">
          {{ t("common.restart") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
