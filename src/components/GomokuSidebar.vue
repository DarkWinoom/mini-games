<script setup lang="ts">
import { computed } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
import type { Difficulty, Player } from "@/games/gomoku/types";

const props = defineProps<{
  difficulty: Difficulty;
  currentPlayer: Player;
  isAIThinking: boolean;
  isPlaying: boolean;
  isOver: boolean;
  bestWins: number;
  aiWins: number;
  draws: number;
}>();

const emit = defineEmits<{
  newGame: [];
  setDifficulty: [d: Difficulty];
}>();

const { t } = useI18n();

/** 难度三档 */
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const statusText = computed(() => {
  if (props.isOver) {
    if (props.currentPlayer === 1) return t("gomoku.won");
    if (props.currentPlayer === 2) return t("gomoku.lost");
    return t("gomoku.draw");
  }
  if (props.isAIThinking) return t("gomoku.thinking");
  if (props.currentPlayer === 1) return t("gomoku.turn.your");
  return t("gomoku.turn.ai");
});

const statusClass = computed(() => {
  if (props.isOver) {
    if (props.currentPlayer === 1) return "is-win";
    if (props.currentPlayer === 2) return "is-lose";
    return "is-draw";
  }
  if (props.isAIThinking) return "is-thinking";
  return "is-playing";
});
</script>

<template>
  <div class="gomoku-sidebar">
    <!-- 1. 状态 -->
    <div :class="['gomoku-status', statusClass]">
      <div class="gomoku-status-label">{{ t("gomoku.status") }}</div>
      <div class="gomoku-status-text">{{ statusText }}</div>
    </div>

    <!-- 2. 难度选择 -->
    <div class="gomoku-section">
      <div class="gomoku-section-label">{{ t("gomoku.difficulty") }}</div>
      <div class="gomoku-difficulty">
        <button
          v-for="d in DIFFICULTIES"
          :key="d"
          type="button"
          :class="['gomoku-diff-btn', { 'is-active': props.difficulty === d }]"
          @click="emit('setDifficulty', d)"
        >
          {{ t(`gomoku.difficulty.${d}`) }}
        </button>
      </div>
    </div>

    <!-- 3. 战绩 -->
    <div class="gomoku-section gomoku-record">
      <div class="gomoku-record-grid">
        <div class="gomoku-record-card">
          <div class="gomoku-record-label">{{ t("gomoku.you") }}</div>
          <div class="gomoku-record-value gomoku-record-value-win">
            {{ props.bestWins }}
          </div>
        </div>
        <div class="gomoku-record-card">
          <div class="gomoku-record-label">{{ t("gomoku.ai") }}</div>
          <div class="gomoku-record-value gomoku-record-value-lose">
            {{ props.aiWins }}
          </div>
        </div>
        <div class="gomoku-record-card gomoku-record-card-full">
          <div class="gomoku-record-label">{{ t("gomoku.draw") }}</div>
          <div class="gomoku-record-value gomoku-record-value-draw">
            {{ props.draws }}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 行动按钮 -->
    <div class="gomoku-section gomoku-actions">
      <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
        {{ t("gomoku.newGame") }}
      </BaseButton>
    </div>

    <!-- v0.9.6: 返回主页按钮已迁移到顶部标题块 -->
  </div>
</template>
