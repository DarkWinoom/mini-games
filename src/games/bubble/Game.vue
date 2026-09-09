<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useI18n } from "@/composables/useI18n";
const { t } = useI18n();
import GameHost from "@/components/arcade/GameHost.vue";
import BoardViewport from "@/components/arcade/BoardViewport.vue";
import Board from "@/components/BubbleBoard.vue";
import { useBubbleStore } from "@/stores/bubble";
import { BOARD_W, SHOOTER_Y, CELL_H } from "./engine";
import { action } from "../actions";
import type { GameSession } from "../contracts";
const store = useBubbleStore(),
  shots = shallowRef(0);
let timer: number | undefined;
function restart() {
  store.newGame();
  shots.value = 0;
}
function shoot() {
  if (store.isAiming && !store.isPaused) {
    shots.value++;
    store.shoot();
  }
}
const session: GameSession = {
  status: computed(() =>
    store.isWon
      ? "won"
      : store.isLost
        ? "lost"
        : store.isPaused
          ? "paused"
          : "running",
  ),
  hasProgress: () => !store.isOver && shots.value > 0,
  actions: computed(() => [
    action(
      "pause",
      store.isPaused ? "common.resume" : "common.pause",
      "Space",
      [" "],
      () => (store.isPaused ? store.resumeOnly() : store.pauseOnly()),
      { disabled: store.isOver },
    ),
    action("new", "arcade.newGame", "R", ["r", "n"], restart, {
      primary: true,
    }),
  ]),
  metrics: computed(() => [
    { label: "bubble.score", value: store.score, emphasis: true },
    { label: "bubble.best", value: store.best },
  ]),
  restart,
  mount: () => {
    timer = window.setInterval(store.tickShooting, 1000 / 60);
  },
  dispose: () => {
    clearInterval(timer);
    restart();
  },
  pause: store.pauseOnly,
  resume: store.resumeOnly,
  rule: "bubble.rules.oneLiner",
  newBest: computed(() => store.isNewBest),
};
</script>
<template>
  <GameHost :session="session"
    ><BoardViewport :width="BOARD_W" :height="SHOOTER_Y + CELL_H"
      ><Board
        :board="store.board"
        :shooting-bubble="store.shootingBubble"
        :current-color="store.currentColor"
        :angle="store.angle"
        :is-aiming="store.isAiming"
        :is-paused="store.isPaused"
        :is-lost="store.isLost"
        :is-won="store.isWon"
        @set-angle="store.setAngle"
        @shoot="shoot"
        @resume="store.resumeOnly" /></BoardViewport
    ><template #panel
      ><div class="bubble-queue">
        <div>
          <span>{{ t("arcade.current") }}</span
          ><i :class="`bubble-token ${store.currentColor}`" />
        </div>
        <div>
          <span>{{ t("arcade.next") }}</span
          ><i :class="`bubble-token ${store.nextColor}`" />
        </div></div></template
  ></GameHost>
</template>
