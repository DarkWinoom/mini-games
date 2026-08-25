<script setup lang="ts">
import { computed } from "vue";
import BaseButton from "@/components/BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
import type { BubbleColor } from "@/games/bubble/types";

const props = defineProps<{
  score: number;
  best: number;
  currentColor: BubbleColor;
  nextColor: BubbleColor;
  isPaused: boolean;
  isAiming: boolean;
  isOver: boolean;
}>();

const emit = defineEmits<{
  newGame: [];
  togglePause: [];
}>();

const { t } = useI18n();

/** 6 色 CSS 背景（与 board 同步） */
const BUBBLE_COLORS_CSS: Record<BubbleColor, string> = {
  red: "linear-gradient(135deg, #fb7185 0%, #ef4444 100%)",
  blue: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
  green: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
  yellow: "linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)",
  purple: "linear-gradient(135deg, #c084fc 0%, #a855f7 100%)",
  orange: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
};

const currentColorStyle = computed(() => ({ background: BUBBLE_COLORS_CSS[props.currentColor] }));
const nextColorStyle = computed(() => ({ background: BUBBLE_COLORS_CSS[props.nextColor] }));
</script>

<template>
  <div class="bubble-sidebar">
    <!-- 1. 当前分数 -->
    <div class="bubble-section">
      <div class="bubble-section-label">{{ t("bubble.score") }}</div>
      <div class="bubble-stat-card bubble-score-card">
        <div class="bubble-stat-value">{{ score }}</div>
      </div>
    </div>

    <!-- 2. 下一发 -->
    <div class="bubble-section">
      <div class="bubble-section-label">{{ t("bubble.next") }}</div>
      <div class="bubble-next-row">
        <div class="bubble-mini-bubble" :style="currentColorStyle" aria-hidden="true" />
        <div class="bubble-next-arrow">→</div>
        <div class="bubble-mini-bubble" :style="nextColorStyle" :aria-label="`next ${nextColor}`">
          <span class="bubble-mini-highlight" />
        </div>
      </div>
    </div>

    <!-- 3. 最佳记录 -->
    <div class="bubble-section">
      <div class="bubble-section-label">{{ t("bubble.best") }}</div>
      <div class="bubble-stat-card bubble-best-card">
        <div class="bubble-stat-value">{{ best }}</div>
      </div>
    </div>

    <!-- 4. 操作按钮 -->
    <div class="bubble-section bubble-actions">
      <BaseButton
        variant="primary"
        class="flex-1"
        :disabled="!isAiming"
        @click="emit('togglePause')"
      >
        {{ isPaused ? t("bubble.resume") : t("bubble.pause") }}
      </BaseButton>
      <BaseButton variant="ghost" @click="emit('newGame')">
        {{ t("bubble.newGame") }}
      </BaseButton>
    </div>
  </div>
</template>
