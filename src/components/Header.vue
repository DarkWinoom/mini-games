<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
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

/* === 滚动监听：超过阈值加 .is-scrolled → 毛玻璃 + 阴影 === */
const isScrolled = ref(false);
const SCROLL_THRESHOLD = 30; // px
let scrollTicking = false;

function onScroll() {
  // rAF 节流：避免每帧都跑读 scrollY
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    isScrolled.value = window.scrollY > SCROLL_THRESHOLD;
    scrollTicking = false;
  });
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // 初始化（页面刷新时若已滚动）
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <header
    :class="['site-header', { 'is-scrolled': isScrolled }]"
  >
    <div class="site-header-inner flex items-center justify-between">
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
    </div>
  </header>
</template>
