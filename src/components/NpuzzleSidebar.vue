<script setup lang="ts">
import { computed } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
import type { Size } from "@/games/npuzzle/types";

const props = defineProps<{
  size: Size;
  status: "idle" | "playing" | "over";
  movesCount: number;
  elapsed: number;
  canUndo: boolean;
  isOver: boolean;
  /** 当前 size 的 best（可能 null） */
  bestMoves: number | null;
  bestTime: number | null;
}>();

const emit = defineEmits<{
  newGame: [];
  setSize: [s: Size];
  undo: [];
  backHome: [];
}>();

const { t } = useI18n();

const SIZES: Size[] = [3, 4];

/** mm:ss 格式 */
const timeText = computed(() => {
  const m = Math.floor(props.elapsed / 60);
  const s = props.elapsed % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
});

const bestTimeText = computed(() => {
  if (props.bestTime == null) return "--";
  const m = Math.floor(props.bestTime / 60);
  const s = props.bestTime % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
});

const statusText = computed(() => {
  if (props.isOver) return t("npuzzle.solved");
  return t("npuzzle.playing");
});
</script>

<template>
  <div class="npuzzle-sidebar">
    <!-- 1. 状态 -->
    <div :class="['npuzzle-status', { 'is-over': isOver }]">
      <div class="npuzzle-status-label">{{ statusText }}</div>
    </div>

    <!-- 2. 难度（尺寸）选择 -->
    <div class="npuzzle-section">
      <div class="npuzzle-section-label">{{ t("npuzzle.difficulty") }}</div>
      <div class="npuzzle-difficulty">
        <button
          v-for="s in SIZES"
          :key="s"
          type="button"
          :class="['npuzzle-diff-btn', { 'is-active': props.size === s }]"
          @click="emit('setSize', s)"
        >
          {{ s }}×{{ s }}
        </button>
      </div>
    </div>

    <!-- 3. 实时统计 -->
    <div class="npuzzle-section npuzzle-stats">
      <div class="npuzzle-stat-card">
        <div class="npuzzle-stat-label">{{ t("npuzzle.moves") }}</div>
        <div class="npuzzle-stat-value">{{ props.movesCount }}</div>
      </div>
      <div class="npuzzle-stat-card">
        <div class="npuzzle-stat-label">{{ t("npuzzle.time") }}</div>
        <div class="npuzzle-stat-value npuzzle-stat-time">{{ timeText }}</div>
      </div>
    </div>

    <!-- 4. 最佳记录 -->
    <div class="npuzzle-section">
      <div class="npuzzle-section-label">{{ t("npuzzle.best") }} ({{ props.size }}×{{ props.size }})</div>
      <div class="npuzzle-best">
        <div class="npuzzle-best-card">
          <div class="npuzzle-best-label">{{ t("npuzzle.bestMoves") }}</div>
          <div class="npuzzle-best-value">{{ props.bestMoves ?? "--" }}</div>
        </div>
        <div class="npuzzle-best-card">
          <div class="npuzzle-best-label">{{ t("npuzzle.bestTime") }}</div>
          <div class="npuzzle-best-value">{{ bestTimeText }}</div>
        </div>
      </div>
    </div>

    <!-- 5. 操作按钮 -->
    <div class="npuzzle-section npuzzle-actions">
      <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
        {{ t("npuzzle.newGame") }}
      </BaseButton>
      <BaseButton
        variant="ghost"
        :disabled="!props.canUndo"
        @click="emit('undo')"
      >
        {{ t("npuzzle.undo") }}
      </BaseButton>
    </div>

    <!-- 6. 返回主页 -->
    <BaseButton variant="ghost" class="npuzzle-back-home" @click="emit('backHome')">
      {{ t("npuzzle.backHome") }}
    </BaseButton>
  </div>
</template>
