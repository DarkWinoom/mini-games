<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/SnakeBoard.vue";
import { useSnakeStore } from "@/stores/snake";
import { useSwipe } from "@/composables/useSwipe";
import { action, directionActions } from "../actions";
import type { GameSession } from "../contracts";
const store = useSnakeStore();
function move(direction: "up" | "down" | "left" | "right") {
  if (!store.isPaused) store.setDirection(direction);
}
const swipe = useSwipe(move);
const session: GameSession = {
  status: computed(() =>
    store.isWaiting
      ? "ready"
      : store.isPaused
        ? "paused"
        : store.isOver
          ? "lost"
          : "running",
  ),
  hasProgress: () => store.isPlaying || store.isPaused,
  actions: computed(() => [
    action(
      "pause",
      store.isWaiting
        ? "arcade.start"
        : store.isPaused
          ? "common.resume"
          : "common.pause",
      "Space",
      [" "],
      () => (store.isWaiting ? store.start() : store.togglePause()),
      { disabled: store.isOver || store.resumeCountdown > 0 },
    ),
    action("new", "arcade.newGame", "R", ["r", "n"], store.newGame, {
      primary: true,
    }),
    ...directionActions(move),
  ]),
  metrics: computed(() => [
    { label: "snake.score", value: store.score, emphasis: true },
    { label: "snake.best", value: store.bestScore },
    { label: "snake.length", value: store.snakeLength },
  ]),
  restart: store.newGame,
  dispose: store.newGame,
  pause: store.pauseOnly,
  resume: store.resumeOnly,
  countdown: computed(() => store.resumeCountdown),
  newBest: computed(() => store.isNewBest),
  rule: "arcade.snakeRule",
};
</script>
<template>
  <GameHost :session="session"
    ><div
      class="swipe-board"
      @touchstart.passive="swipe.touchstart"
      @touchend.passive="swipe.touchend"
    >
      <Board :grid="store.grid" /></div
  ></GameHost>
</template>
