<script setup lang="ts">
type Variant = 'default' | 'primary' | 'ghost';

withDefaults(defineProps<{
  variant?: Variant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
}>(), {
  variant: 'default',
  type: 'button',
  disabled: false,
});

defineEmits<{
  click: [e: MouseEvent];
}>();
</script>

<template>
  <button :type="type" :class="[
    'btn',
    variant === 'primary' && 'btn-primary',
    variant === 'ghost' && 'btn-ghost',
  ]" :disabled="disabled" :aria-label="ariaLabel" @click="$emit('click', $event)">
    <slot />
  </button>
</template>
