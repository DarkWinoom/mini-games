<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useId, useTemplateRef } from "vue";
const props = withDefaults(
  defineProps<{ title: string; closeOnBackdrop?: boolean }>(),
  { closeOnBackdrop: true },
);
const emit = defineEmits<{ close: [] }>();
const panel = useTemplateRef<HTMLElement>("panel");
const id = useId();
let previous: HTMLElement | null = null;
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    emit("close");
  }
  if (event.key !== "Tab") return;
  const items = [
    ...panel.value!.querySelectorAll<HTMLElement>(
      'button:not(:disabled),a[href],input,textarea,[tabindex="0"]',
    ),
  ].filter((item) => item.getClientRects().length);
  const first = items[0],
    last = items.at(-1);
  if (!first) {
    event.preventDefault();
    panel.value?.focus();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
onMounted(async () => {
  previous = document.activeElement as HTMLElement;
  await nextTick();
  panel.value?.focus();
});
onUnmounted(() => previous?.isConnected && previous.focus());
</script>
<template>
  <Teleport to="body"
    ><div
      class="modal-backdrop"
      data-input-blocker
      @click.self="props.closeOnBackdrop && emit('close')"
      @keydown="keydown"
    >
      <section
        ref="panel"
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="id"
        tabindex="-1"
      >
        <h2 :id="id">{{ title }}</h2>
        <div class="modal-body"><slot /></div>
        <div v-if="$slots.actions" class="modal-actions">
          <slot name="actions" />
        </div>
      </section></div
  ></Teleport>
</template>
