<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
  useId,
  useTemplateRef,
} from "vue";
const props = defineProps<{
  value: string;
  options: { value: string; label: string }[];
  ariaLabel?: string;
}>();
const emit = defineEmits<{ change: [value: string] }>();
const open = shallowRef(false);
const wrap = useTemplateRef<HTMLElement>("wrap"),
  trigger = useTemplateRef<HTMLButtonElement>("trigger");
const id = useId();
const label = computed(
  () =>
    props.options.find((option) => option.value === props.value)?.label ??
    props.value,
);
function close(restore = false) {
  open.value = false;
  if (restore) trigger.value?.focus();
}
async function toggle() {
  if (open.value) return close(true);
  open.value = true;
  await nextTick();
  wrap.value?.querySelector<HTMLElement>("[aria-checked=true]")?.focus();
}
function select(value: string) {
  emit("change", value);
  close(true);
}
function outside(event: Event) {
  if (!wrap.value?.contains(event.target as Node)) close();
}
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (!open.value) {
    void toggle();
    return;
  }
  const items = [
    ...wrap.value!.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]"),
  ];
  let index = items.indexOf(document.activeElement as HTMLButtonElement);
  index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
  items[index]?.focus();
}
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  document.addEventListener("focusin", outside);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", outside);
  document.removeEventListener("focusin", outside);
});
</script>
<template>
  <div ref="wrap" class="select-wrap" @keydown="keydown">
    <button
      ref="trigger"
      class="btn select-trigger"
      type="button"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      :aria-controls="id"
      aria-haspopup="menu"
      @click="toggle"
    >
      {{ label }} <span aria-hidden="true">▾</span>
    </button>
    <div
      v-if="open"
      :id="id"
      class="select-menu"
      role="menu"
      :aria-label="ariaLabel"
      data-input-blocker
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="menuitemradio"
        :aria-checked="value === option.value"
        @click="select(option.value)"
      >
        <span>{{ option.label }}</span
        ><span v-if="value === option.value" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>
