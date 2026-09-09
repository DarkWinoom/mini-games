<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { games } from "@/games/registry";
import { orderFavorites } from "@/games/library";
import { useI18n } from "@/composables/useI18n";
import { readStorage, writeStorage } from "@/utils/storage";
import GameArt from "./GameArt.vue";
import ArcadeCabinet from "./ArcadeCabinet.vue";
const { t } = useI18n();
const selected = shallowRef(games[0]);
const favorites = ref<string[]>([]);
try {
  const saved: unknown = JSON.parse(readStorage("ui.favorites") || "[]");
  if (Array.isArray(saved))
    favorites.value = saved.filter(
      (id): id is string => typeof id === "string",
    );
} catch {
  /* Empty favorites. */
}
const ordered = computed(() => orderFavorites(games, favorites.value));
function favorite(id: string) {
  favorites.value = favorites.value.includes(id)
    ? favorites.value.filter((value) => value !== id)
    : [...favorites.value, id];
  writeStorage("ui.favorites", JSON.stringify(favorites.value));
}
</script>
<template>
  <div class="library">
    <section class="catalog">
      <div class="list-label">
        <span>{{ t("arcade.pick") }}</span
        ><span>{{ t("arcade.count", { count: games.length }) }}</span>
      </div>
      <div
        class="game-list"
        tabindex="0"
        role="region"
        :aria-label="t('arcade.pick')"
      >
        <article
          v-for="game in ordered"
          :key="game.id"
          class="game-tile"
          :class="{ selected: selected.id === game.id }"
          :data-game="game.id"
        >
          <button
            class="game-select"
            :aria-pressed="selected.id === game.id"
            @click="selected = game"
          >
            <GameArt :id="game.id" /><strong>{{ t(game.title) }}</strong
            ><small>{{ t(game.description) }}</small></button
          ><button
            class="favorite-button"
            :aria-label="`${t(favorites.includes(game.id) ? 'arcade.unfavorite' : 'arcade.favorite')} ${t(game.title)}`"
            :aria-pressed="favorites.includes(game.id)"
            @click="favorite(game.id)"
          >
            <span aria-hidden="true">{{
              favorites.includes(game.id) ? "★" : "☆"
            }}</span>
          </button>
        </article>
      </div>
    </section>
    <RouterLink
      class="machine-area game-entry"
      :to="selected.path"
      :aria-label="`${t('common.play')} ${t(selected.title)}`"
    >
      <ArcadeCabinet
        ><div class="screen-head">
          <span>{{ t("arcade.selectGame") }}</span
          ><span>{{ games.indexOf(selected) + 1 }} / {{ games.length }}</span>
        </div>
        <div class="preview-body">
          <div class="preview-art"><GameArt :id="selected.id" large /></div>
          <div class="screen-copy">
            <h2>{{ t(selected.title) }}</h2>
            <p>{{ t(selected.description) }}</p>
            <span class="tag">{{ selected.tag }}</span>
          </div>
        </div>
        <div class="screen-foot">
          <span>● {{ t("arcade.ready") }}</span
          ><span>{{ t("arcade.solo") }}</span>
        </div>
        <template #controls
          ><span class="btn btn-primary"
            >▶ {{ t("common.play") }}</span
          ></template
        ></ArcadeCabinet
      >
    </RouterLink>
  </div>
</template>
