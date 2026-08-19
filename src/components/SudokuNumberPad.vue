<script setup lang="ts">
import { useI18n } from "@/composables/useI18n";

const { t } = useI18n();

defineProps<{
  /** 是否笔注模式（高亮 toggle） */
  notesMode: boolean;
  /** 笔注 toggle 是否可点击（选中 cell 后才能用） */
  canUseNotes: boolean;
  /** 整个面板是否禁用（game over 时） */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  pick: [n: number];
  erase: [];
  toggleNotes: [];
}>();

function onPick(n: number) {
  emit("pick", n);
}
</script>

<template>
  <div :class="['sudoku-pad', disabled && 'is-disabled']">
    <!-- 笔注 toggle 行 -->
    <div class="sudoku-pad-row">
      <button
        type="button"
        :class="['sudoku-pad-toggle', notesMode && 'is-active', (!canUseNotes || disabled) && 'is-disabled']"
        :title="t('sudoku.notes')"
        :aria-label="t('sudoku.notes')"
        :disabled="!canUseNotes || disabled"
        @click="emit('toggleNotes')"
      >
        ✏️ {{ t("sudoku.notes") }}
      </button>
    </div>

    <!-- 1-5 行 -->
    <div class="sudoku-pad-row">
      <button
        v-for="n in 5"
        :key="`pad-${n}`"
        type="button"
        class="sudoku-pad-btn"
        :disabled="disabled"
        @click="onPick(n)"
      >{{ n }}</button>
    </div>
    <!-- 6-9 + 擦除 -->
    <div class="sudoku-pad-row">
      <button
        v-for="n in [6, 7, 8, 9]"
        :key="`pad-${n}`"
        type="button"
        class="sudoku-pad-btn"
        :disabled="disabled"
        @click="onPick(n)"
      >{{ n }}</button>
      <button
        type="button"
        class="sudoku-pad-btn sudoku-pad-erase"
        :title="t('sudoku.erase')"
        :aria-label="t('sudoku.erase')"
        :disabled="disabled"
        @click="emit('erase')"
      >⌫</button>
    </div>
  </div>
</template>
