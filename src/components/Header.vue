<script setup lang="ts">
import { useI18n } from "@/composables/useI18n";
import { useThemeStore } from "@/stores/theme";
import { sfxMuted, toggleMute } from "@/composables/useSFX";
import BaseSelect from "./BaseSelect.vue";
const { t, locales, locale, setLang } = useI18n();
const theme = useThemeStore();
</script>
<template>
  <header class="topbar">
    <RouterLink class="brand" to="/" :aria-label="t('arcade.back')"
      ><span class="brand-mark" aria-hidden="true">✜</span
      ><span>MINI GAMES<small>THE LITTLE ARCADE CLUB</small></span></RouterLink
    >
    <nav class="top-actions" :aria-label="t('arcade.settings')">
      <BaseSelect
        :value="locale"
        :options="
          locales.map((item) => ({ value: item.code, label: item.name }))
        "
        :aria-label="t('header.language')"
        @change="setLang"
      />
      <button
        class="btn"
        :title="t('header.theme')"
        @click="theme.cycleTheme()"
      >
        {{
          t(
            theme.userTheme === "light"
              ? "header.themeLight"
              : theme.userTheme === "dark"
                ? "header.themeDark"
                : "header.themeSystem",
          )
        }}
      </button>
      <button class="btn" :aria-pressed="sfxMuted" @click="toggleMute">
        {{ t(sfxMuted ? "header.soundOff" : "header.soundOn") }}
      </button>
    </nav>
  </header>
</template>
