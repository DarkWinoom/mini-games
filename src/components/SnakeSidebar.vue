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
}>();

const emit = defineEmits<{
  newGame: [];
  togglePause: [];
  backHome: [];
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
        :disabled="props.isOver || props.isWaiting"
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

    <!-- 3. 返回主页（防误操作：F5 / 后退会丢进度，引导走这里） -->
    <BaseButton variant="ghost" class="snake-back-home" @click="emit('backHome')">
      {{ t('snake.backHome') }}
    </BaseButton>
  </div>
</template>
