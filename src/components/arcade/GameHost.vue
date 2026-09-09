<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ArcadeCabinet from "./ArcadeCabinet.vue";
import BaseModal from "../BaseModal.vue";
import BaseSelect from "../BaseSelect.vue";
import BaseButton from "../BaseButton.vue";
import { useI18n } from "@/composables/useI18n";
import { useGameSession } from "@/composables/useGameSession";
import { games } from "@/games/registry";
import type { GameSession } from "@/games/contracts";
import { action } from "@/games/actions";
const props = defineProps<{ session: GameSession }>();
const { t } = useI18n();
const route = useRoute(),
  router = useRouter();
const definition = computed(
  () => games.find((game) => game.id === route.name)!,
);
const backAction = action("back", "arcade.back", "Esc", ["Escape"], () => {
  void router.push("/");
});
const actions = computed(() => [...props.session.actions.value, backAction]);
const { leaving, confirmLeave, cancelLeave } = useGameSession({
  ...props.session,
  actions,
});
const toolbar = computed(() =>
  actions.value.filter((action) => action.toolbar && action.id !== "back"),
);
const terminal = computed(() =>
  ["won", "lost", "draw"].includes(props.session.status.value),
);
const title = computed(() => t(`arcade.${props.session.status.value}`));
</script>
<template>
  <main class="game-page" :data-game="definition.id">
    <div class="playbar">
      <button
        class="back-link"
        :aria-keyshortcuts="backAction.keys[0]"
        @click="backAction.run"
      >
        <kbd>{{ backAction.key }}</kbd> {{ t(backAction.label) }}
      </button>
    </div>
    <ArcadeCabinet :title="t(definition.title)">
      <div class="screen-head">
        <h1>{{ t(definition.title) }}</h1>
        <span>{{ title }}</span>
      </div>
      <div class="game-layout">
        <div class="game-stage">
          <div class="board-interaction" :inert="leaving || terminal">
            <slot />
          </div>
          <div
            v-if="
              session.status.value === 'ready' ||
              session.status.value === 'paused'
            "
            class="game-status"
          >
            <strong>{{ session.countdown?.value || title }}</strong
            ><span v-if="!session.countdown?.value">{{
              t(
                session.status.value === "ready"
                  ? "arcade.startHint"
                  : "arcade.pauseHint",
              )
            }}</span>
          </div>
        </div>
        <aside class="game-hud">
          <label
            v-for="setting in session.settings?.value"
            :key="setting.label"
            class="game-setting"
            ><span>{{ t(setting.label) }}</span
            ><BaseSelect
              :value="setting.value"
              :options="setting.options"
              :aria-label="t(setting.label)"
              @change="setting.change"
          /></label>
          <div class="metrics">
            <div
              v-for="metric in session.metrics.value"
              :key="metric.label"
              class="metric"
              :class="{ emphasis: metric.emphasis }"
            >
              <span>{{ t(metric.label) }}</span
              ><strong>{{ metric.value }}</strong>
            </div>
          </div>
          <slot name="panel" />
        </aside>
      </div>
      <template #controls
        ><BaseButton
          v-for="item in toolbar"
          :key="item.id"
          :variant="item.primary ? 'primary' : 'ghost'"
          :disabled="item.disabled || leaving"
          :aria-keyshortcuts="item.keys[0]"
          :aria-pressed="item.pressed"
          @click="item.run"
          ><kbd>{{ item.key }}</kbd
          ><span>{{ t(item.label) }}</span></BaseButton
        ></template
      >
    </ArcadeCabinet>
    <div v-if="actions.some((item) => item.touch)" class="touch-controls">
      <BaseButton
        v-for="item in actions.filter((item) => item.touch)"
        :key="item.id"
        :disabled="item.disabled || leaving"
        @click="item.run"
        >{{ t(item.label) }}</BaseButton
      >
    </div>
    <section class="game-rules" :aria-label="t('arcade.controls')">
      <div class="key-hints">
        <span v-for="item in actions" :key="item.id"
          ><kbd>{{ item.key }}</kbd
          >{{ t(item.label) }}</span
        >
      </div>
      <p>{{ t(session.rule) }}</p>
    </section>
    <BaseModal
      v-if="leaving"
      :title="t('arcade.leaveTitle')"
      @close="cancelLeave"
      ><p>{{ t("arcade.leaveBody") }}</p>
      <template #actions
        ><BaseButton @click="cancelLeave">{{ t("common.cancel") }}</BaseButton
        ><BaseButton variant="primary" @click="confirmLeave">{{
          t("arcade.leave")
        }}</BaseButton></template
      ></BaseModal
    >
    <BaseModal
      v-else-if="terminal"
      :title="session.newBest?.value ? t('arcade.newBest') : title"
      :close-on-backdrop="false"
      @close="session.restart"
      ><p>{{ title }}</p>
      <template #actions
        ><BaseButton @click="router.push('/')">{{
          t("arcade.back")
        }}</BaseButton
        ><BaseButton
          v-if="session.continue && session.status.value === 'won'"
          @click="session.continue"
          >{{ t("common.resume") }}</BaseButton
        ><BaseButton variant="primary" @click="session.restart">{{
          t("arcade.newGame")
        }}</BaseButton></template
      ></BaseModal
    >
  </main>
</template>
