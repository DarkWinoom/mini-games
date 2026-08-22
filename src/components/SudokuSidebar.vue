<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
import { formatTime } from "@/games/sudoku/engine";
import { MAX_ERRORS } from "@/games/sudoku/types";
import type { Difficulty, BestTimes } from "@/games/sudoku/types";

/**
 * 数独右侧 Sidebar
 *
 * 标准布局（与 Gomoku / N-Puzzle / 2048 / 俄罗斯方块 一致）：
 *  1. 状态（顶部）
 *  2. 难度选择（最上面）
 *  3. 统计：时间 / 错误 / Best
 *  4. 行动按钮：新游戏 / 暂停（底部）
 *  5. 返回主页（最底部 ghost 按钮）
 *
 * 设计原则（plan §2.3 UI 改动）：
 *  - 不用图标按钮（统一 BaseButton 文字）
 *  - "返回主页"放最底（与其它游戏统一）
 *  - 难度放最上面（用户首屏就能切换）
 */
const props = defineProps<{
  difficulty: Difficulty;
  difficulties: readonly Difficulty[];
  time: number;
  errors: number;
  bestTimes: BestTimes;
  status: "playing" | "won" | "failed";
}>();

const emit = defineEmits<{
  setDifficulty: [d: Difficulty];
  newGame: [];
  backHome: [];
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
    <!-- 1. 难度选择（最上面） -->
    <div class="sudoku-section">
      <div class="sudoku-section-label">{{ t("sudoku.difficulty") }}</div>
      <div class="sudoku-difficulty">
        <button
          v-for="d in difficulties"
          :key="d"
          type="button"
          :class="['sudoku-diff-btn', { 'is-active': difficulty === d }]"
          @click="emit('setDifficulty', d)"
        >{{ t(`sudoku.difficulty.${d}`) }}</button>
      </div>
    </div>

    <!-- 3. 统计：时间 / 错误（X/3） / Best（右扩占大头） -->
    <div class="sudoku-section sudoku-stats">
      <div>
        <div class="sudoku-stat-label">{{ t("sudoku.time") }}</div>
        <div class="sudoku-stat-value">{{ formatTime(time) }}</div>
      </div>
      <div class="flex items-stretch gap-4">
        <div>
          <div class="sudoku-stat-label">{{ t("sudoku.errors") }}</div>
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
          <div class="sudoku-stat-label">{{ bestCardLabel }}</div>
          <div class="sudoku-stat-value text-2xl tabular-nums">{{ bestLabel }}</div>
        </div>
      </div>
    </div>

    <!-- 4. 行动按钮（v0.9.5：移除暂停按钮） -->
    <div class="sudoku-section sudoku-actions">
      <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
        {{ t("sudoku.newGame") }}
      </BaseButton>
    </div>

    <!-- 5. 返回主页（防误操作：F5 / 后退会丢进度，引导走这里） -->
    <BaseButton variant="ghost" class="sudoku-back-home" @click="emit('backHome')">
      {{ t("sudoku.backHome") }}
    </BaseButton>
  </div>
</template>
