<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useThemeStore } from '@/stores/theme';
import { sfxMuted, toggleMute } from '@/composables/useSFX';
import BaseSelect from './BaseSelect.vue';
import BaseButton from './BaseButton.vue';

const { t, locales, locale, setLang } = useI18n();
const theme = useThemeStore();

function onLangChange(value: string) {
  setLang(value);
}

/** 全局静音按钮 icon + aria-label：开/关两种状态切换 */
const soundIcon = computed(() => (sfxMuted.value ? '🔇' : '🔊'));
const soundAriaLabel = computed(() =>
  sfxMuted.value ? t('header.soundOff') : t('header.soundOn'),
);
function onToggleMute() {
  toggleMute();
}
</script>

<template>
  <header class="flex items-center justify-between py-8">
    <div class="text-[22px] font-extrabold tracking-tight">
      {{ t('common.appName') }}
    </div>
    <div class="flex items-center gap-2">
      <BaseSelect :value="locale" :options="locales.map((l) => ({ value: l.code, label: l.name }))"
        :aria-label="t('header.language')" @change="onLangChange" />
      <div class="tooltip-wrap group">
        <BaseButton variant="ghost" :aria-label="t('header.theme')" @click="theme.cycleTheme()">
          {{ theme.icon }}
        </BaseButton>
        <span class="tooltip" role="tooltip">{{ t('header.theme') }}</span>
      </div>
      <div class="tooltip-wrap group">
        <BaseButton
          variant="ghost"
          :aria-label="soundAriaLabel"
          :aria-pressed="sfxMuted"
          @click="onToggleMute"
        >
          {{ soundIcon }}
        </BaseButton>
        <span class="tooltip" role="tooltip">{{ soundAriaLabel }}</span>
      </div>
    </div>
  </header>
</template>
