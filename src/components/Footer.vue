<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

defineProps<{
  onCustomLangClick: () => void;
}>();
</script>

<template>
  <footer class="py-8 text-sm text-center text-gray-500 dark:text-white/70">
    <span>{{ t('footer.copyright') }}</span>
    <span class="inline-flex gap-4 ml-6">
      <a href="https://github.com/darkwinoom/mini-games" target="_blank" rel="noopener"
        class="no-underline text-inherit hover:opacity-80">
        {{ t('footer.github') }}
      </a>
      <a href="#" class="no-underline cursor-pointer text-inherit hover:opacity-80" @click.prevent="onCustomLangClick">
        {{ t('footer.customLanguage') }}
      </a>
      <span>{{ t('footer.license') }}</span>
    </span>
  </footer>
</template>
