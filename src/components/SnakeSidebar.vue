<script setup lang="ts">
import { computed } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";

const props = defineProps<{
  score: number;
  bestScore: number;
  snakeLength: number;
  isPlaying: boolean;
  isPaused: boolean;
  isOver: boolean;
  isWaiting: boolean;
  /** v0.9.7: 暂停恢复倒计时中（>0）时按钮禁用 */
  isCountingDown?: boolean;
}>();

const emit = defineEmits<{
  newGame: [];
  togglePause: [];
}>();

const { t } = useI18n();

const pauseLabel = computed(() => (props.isPaused ? t('snake.resume') : t('snake.pause')));
const formattedScore = computed(() => String(props.score));
const formattedBest = computed(() => String(props.bestScore));
const formattedLength = computed(() => String(props.snakeLength));
</script>

<template>
  <div class="snake-sidebar">
    <!-- 1. 行动按钮 -->
    <div class="snake-actions">
      <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
        {{ t('snake.newGame') }}
      </BaseButton>
      <BaseButton
        variant="ghost"
        class="flex-1"
        :disabled="props.isOver || props.isWaiting || props.isCountingDown"
        @click="emit('togglePause')"
      >
        {{ pauseLabel }}
      </BaseButton>
    </div>

    <!-- 2. 统计 -->
    <div class="snake-stats">
      <div class="snake-stat-card">
        <div class="snake-stat-label">{{ t('snake.score') }}</div>
        <div class="snake-stat-value snake-stat-value-primary">
          {{ formattedScore }}
        </div>
      </div>
      <div class="snake-stat-card">
        <div class="snake-stat-label">{{ t('snake.best') }}</div>
        <div class="snake-stat-value">
          {{ formattedBest }}
        </div>
      </div>
      <div class="snake-stat-card">
        <div class="snake-stat-label">{{ t('snake.length') }}</div>
        <div class="snake-stat-value">
          {{ formattedLength }}
        </div>
      </div>
    </div>
  </div>
</template>
