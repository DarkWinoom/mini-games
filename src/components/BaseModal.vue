<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

withDefaults(defineProps<{
  title: string;
  closeOnBackdrop?: boolean;
}>(), {
  closeOnBackdrop: true,
});

const emit = defineEmits<{
  close: [];
}>();

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  document.addEventListener('keydown', onEsc);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onEsc);
});
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" role="dialog" aria-modal="true" @click.self="closeOnBackdrop && $emit('close')">
      <div class="modal-panel">
        <h3 class="modal-title">{{ title }}</h3>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.actions" class="modal-actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
