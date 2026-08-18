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
</script>

<template>
  <div class="card">
    <div class="card-icon">{{ icon }}</div>
    <h2 class="text-[32px] font-bold tracking-tight">{{ title }}</h2>
    <p class="mt-3 text-base leading-relaxed" style="color: var(--color-fg-muted, #6b7280)">
      {{ description }}
    </p>
    <BaseButton variant="primary" class="mt-6" @click="emit('play')">
      Play →
    </BaseButton>
  </div>
</template>
