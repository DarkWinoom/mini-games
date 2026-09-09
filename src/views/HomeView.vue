<script setup lang="ts">
import { useI18n } from "@/composables/useI18n";
import GameLibrary from "@/components/arcade/GameLibrary.vue";
const { t } = useI18n();
</script>
<template>
  <main>
    <section class="intro">
      <div>
        <div class="eyebrow">{{ t("arcade.eyebrow") }}</div>
        <h1>
          {{ t("arcade.heading") }}<br /><em>{{
            t("arcade.headingAccent")
          }}</em>
        </h1>
      </div>
      <div class="ticket">
        <strong>FREE PLAY</strong><span>{{ t("arcade.free") }}</span>
      </div>
    </section>
    <GameLibrary />
  </main>
</template>
