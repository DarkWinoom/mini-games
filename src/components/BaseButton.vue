<script setup lang="ts">
withDefaults(
  defineProps<{ variant?: "primary" | "ghost"; disabled?: boolean }>(),
  { variant: "ghost" },
);
</script>
<template>
  <button
    type="button"
    :class="['btn', { 'btn-primary': variant === 'primary' }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
