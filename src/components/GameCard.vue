<script setup lang="ts">
import BaseButton from './BaseButton.vue';

defineProps<{
  icon: string;
  title: string;
  description: string;
}>();

const emit = defineEmits<{
  play: [];
}>();

/** 整卡片可点击（HomeView 用户体验优化）：
 *  - 鼠标点任何位置（包括 Play 按钮，依赖冒泡）→ emit('play') 跳路由
 *  - 键盘 Tab → Enter/Space → emit('play')
 *  - Play 按钮不加 @click handler，避免与外层重复触发 */
function onPlay(): void {
  emit('play');
}
</script>

<template>
  <div
    class="card cursor-pointer"
    role="button"
    tabindex="0"
    :aria-label="title"
    @click="onPlay"
    @keydown.enter.prevent="onPlay"
    @keydown.space.prevent="onPlay"
  >
    <div class="card-icon">{{ icon }}</div>
    <h2 class="text-[32px] font-bold tracking-tight">{{ title }}</h2>
    <p class="mt-3 text-base leading-relaxed" style="color: var(--color-fg-muted, #6b7280)">
      {{ description }}
    </p>
    <BaseButton variant="primary" class="mt-6">
      Play →
    </BaseButton>
  </div>
</template>
