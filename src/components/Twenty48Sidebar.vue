<script setup lang="ts">
import { computed } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";

const props = defineProps<{
  score: number;
  bestScore: number;
  moves: number;
  maxTile: number;
  canUndo: boolean;
  isOver: boolean;
}>();

const emit = defineEmits<{
  newGame: [];
  undo: [];
  backHome: [];
}>();

const { t } = useI18n();

const formattedScore = computed(() => String(props.score));
const formattedBest = computed(() => String(props.bestScore));
</script>

<template>
  <div class="twenty48-sidebar">
    <!-- 1. 行动按钮 -->
    <div class="twenty48-actions">
      <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
        {{ t('twenty48.newGame') }}
      </BaseButton>
      <BaseButton
        variant="ghost"
        class="flex-1"
        :disabled="!props.canUndo"
        @click="emit('undo')"
      >
        {{ t('twenty48.undo') }}
      </BaseButton>
    </div>

    <!-- 2. 统计 -->
    <div class="twenty48-stats">
      <div class="twenty48-stat-card">
        <div class="twenty48-stat-label">{{ t('twenty48.score') }}</div>
        <div class="twenty48-stat-value twenty48-stat-value-primary">
          {{ formattedScore }}
        </div>
      </div>
      <div class="twenty48-stat-card">
        <div class="twenty48-stat-label">{{ t('twenty48.best') }}</div>
        <div class="twenty48-stat-value">
          {{ formattedBest }}
        </div>
      </div>
      <div class="twenty48-stat-card twenty48-stat-card-full">
        <div class="twenty48-stat-label">{{ t('twenty48.moves') }}</div>
        <div class="twenty48-stat-value twenty48-stat-value-small">
          {{ props.moves }}
        </div>
        <div class="twenty48-stat-meta">
          {{ t('twenty48.maxTile') }}: <strong>{{ props.maxTile }}</strong>
        </div>
      </div>
    </div>

    <!-- 3. 返回主页（防误操作：F5 / 后退会丢进度，引导走这里） -->
    <BaseButton variant="ghost" class="twenty48-back-home" @click="emit('backHome')">
      {{ t('twenty48.backHome') }}
    </BaseButton>
  </div>
</template>
