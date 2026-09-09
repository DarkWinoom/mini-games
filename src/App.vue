<script setup lang="ts">
import { settingsOpen as settings } from "@/stores/overlays";
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
import AppSettings from "@/components/AppSettings.vue";
</script>
<template>
  <div class="site">
    <Header @settings="settings = true" /><RouterView /><Footer /><AppSettings
      v-if="settings"
      @close="settings = false"
    />
  </div>
</template>
