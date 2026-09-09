<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  shallowRef,
  useTemplateRef,
} from "vue";
const props = defineProps<{ width: number; height: number }>();
const container = useTemplateRef<HTMLElement>("container");
const available = shallowRef(props.width);
const scale = computed(() => Math.min(1, available.value / props.width));
let observer: ResizeObserver;
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    available.value = entries[0].contentRect.width;
  });
  observer.observe(container.value!);
});
onUnmounted(() => observer?.disconnect());
</script>
<template>
  <div
    ref="container"
    class="board-viewport"
    :style="{ height: `${height * scale}px` }"
  >
    <div
      class="board-scaled"
      :style="{
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${scale})`,
      }"
    >
      <slot />
    </div>
  </div>
</template>
