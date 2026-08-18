<script setup lang="ts">
import { ref, onUnmounted, computed } from 'vue';

interface Option {
  value: string;
  label: string;
}

const props = defineProps<{
  value: string;
  options: Option[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  change: [value: string];
}>();

const isOpen = ref(false);
const wrapRef = ref<HTMLElement | null>(null);

const currentLabel = computed(
  () => props.options.find((o) => o.value === props.value)?.label ?? '',
);

function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onEsc, true);
    }, 0);
  } else {
    close();
  }
}

function close() {
  isOpen.value = false;
  document.removeEventListener('click', onDocClick, true);
  document.removeEventListener('keydown', onEsc, true);
}

function onDocClick(e: MouseEvent) {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    close();
  }
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

function select(value: string) {
  if (value !== props.value) emit('change', value);
  close();
}

onUnmounted(close);
</script>

<template>
  <div ref="wrapRef" class="select">
    <button type="button" :class="['btn', 'btn-ghost', 'select-trigger', isOpen && 'open']" :aria-label="ariaLabel"
      @click.stop="toggle">
      {{ currentLabel }}
    </button>
    <div v-if="isOpen" class="select-panel">
      <div v-for="opt in options" :key="opt.value" :class="['select-item', opt.value === value && 'active']"
        @click="select(opt.value)">
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>
