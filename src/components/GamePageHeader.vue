<script setup lang="ts">
/**
 * 游戏页面顶部标题块（v0.9.6）
 *
 * 用途：6 个游戏 view 都在 Header 下方插入本组件，统一展示游戏名 + 返回主页按钮。
 * - 标题：i18n key（如 "tetris.title"）
 * - 返回按钮：触发 tryBackHome（弹模态 / 直接清进度返回，由 view 自己判断）
 */
import { useI18n } from "@/composables/useI18n";
import BaseButton from "@/components/BaseButton.vue";
import type { LocaleDict } from "@/i18n/types";

defineProps<{
  /** i18n 键，如 "tetris.title" */
  titleKey: keyof LocaleDict;
}>();

const emit = defineEmits<{
  backHome: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="game-page-header">
    <h1 class="game-page-title">{{ t(titleKey) }}</h1>
    <BaseButton variant="ghost" @click="emit('backHome')">
      {{ t("common.back") }}
    </BaseButton>
  </div>
</template>
