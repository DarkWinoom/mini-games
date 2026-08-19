<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { useI18n } from "@/composables/useI18n";
import { formatTime } from "@/games/sudoku/engine";
import { MAX_ERRORS } from "@/games/sudoku/types";
import type { Difficulty, BestTimes } from "@/games/sudoku/types";

const props = defineProps<{
  difficulty: Difficulty;
  difficulties: readonly Difficulty[];
  time: number;
  errors: number;
  bestTimes: BestTimes;
  status: "playing" | "paused" | "won" | "failed";
}>();

const emit = defineEmits<{
  setDifficulty: [d: Difficulty];
  newGame: [];
  togglePause: [];
}>();

const { t } = useI18n();

/** 当前难度的 best time（秒） */
const currentBest = computed<number | null>(() => {
  return props.bestTimes[props.difficulty];
});

/** 当前难度的 best time 格式化 */
const bestLabel = computed<string>(() => {
  const v = currentBest.value;
  if (v === null) return "—";
  return formatTime(v);
});

/** v0.5.6: best 卡 label 拼上当前难度名,让"分难度"一目了然
 *  例: "最佳 · 简单" / "Best · Easy" */
const bestCardLabel = computed<string>(() => {
  return `${t("sudoku.best")} · ${t(`sudoku.difficulty.${props.difficulty}`)}`;
});

/* === 错误反馈动画（v0.5.4） === */
/** errors 增额时触发 500ms shake + flash，给玩家"出错"的明确视觉信号 */
const isShaking = ref(false);
let shakeTimer: number | null = null;

watch(
  () => props.errors,
  (newVal, oldVal) => {
    if (newVal > oldVal && newVal > 0) {
      // 增额才触发（newGame 重置到 0 不触发，避免开场闪一下）
      isShaking.value = true;
      if (shakeTimer !== null) window.clearTimeout(shakeTimer);
      shakeTimer = window.setTimeout(() => {
        isShaking.value = false;
        shakeTimer = null;
      }, 500);
    }
  },
);

onUnmounted(() => {
  if (shakeTimer !== null) {
    window.clearTimeout(shakeTimer);
    shakeTimer = null;
  }
});
</script>

<template>
  <div class="sudoku-sidebar">
    <!-- 难度 + 新游戏 + 暂停 -->
    <div class="card !p-4">
      <h3 class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider mb-3">
        {{ t("sudoku.difficulty") }}
      </h3>
      <!-- 难度按钮：调大 + 与下方按钮增加间隙 -->
      <div class="flex gap-2 flex-wrap mb-5">
        <button
          v-for="d in difficulties"
          :key="d"
          type="button"
          :class="['sudoku-diff-btn', difficulty === d && 'is-active']"
          @click="emit('setDifficulty', d)"
        >{{ t(`sudoku.difficulty.${d}`) }}</button>
      </div>
      <button
        type="button"
        class="btn btn-primary w-full"
        @click="emit('newGame')"
      >{{ t("sudoku.newGame") }}</button>
      <button
        type="button"
        class="btn btn-ghost w-full mt-2"
        @click="emit('togglePause')"
      >
        <span v-if="status === 'paused'">▶ {{ t("common.resume") }}</span>
        <span v-else>⏸ {{ t("common.pause") }}</span>
      </button>
    </div>

    <!-- 统计：时间 / 错误（X/3） / Best（右扩占大头） -->
    <div class="card !p-4">
      <div class="space-y-3">
        <div>
          <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
            {{ t("sudoku.time") }}
          </div>
          <div class="sudoku-stat-value">{{ formatTime(time) }}</div>
        </div>
        <!-- Errors (auto 宽) + Best (flex-1 占大头) -->
        <div class="flex items-stretch gap-4">
          <div>
            <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
              {{ t("sudoku.errors") }}
            </div>
            <div
              :class="[
                'sudoku-stat-value',
                'text-2xl',
                'tabular-nums',
                errors > 0 && 'has-error',
                isShaking && 'is-shaking',
              ]"
            >
              {{ errors }} / {{ MAX_ERRORS }}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold text-gray-500 dark:text-white/70 uppercase tracking-wider">
              {{ bestCardLabel }}
            </div>
            <div class="sudoku-stat-value text-2xl tabular-nums">{{ bestLabel }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
