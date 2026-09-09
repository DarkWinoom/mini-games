<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/Twenty48Board.vue";
import { useTwenty48Store } from "@/stores/twothousandfortyeight";
import { useSwipe } from "@/composables/useSwipe";
import { action, directionActions } from "../actions";
import type { GameSession } from "../contracts";
const store = useTwenty48Store();
const swipe = useSwipe(store.move);
const session: GameSession = {
  status: computed(() =>
    store.isWon ? "won" : store.isOver ? "lost" : "running",
  ),
  hasProgress: () => store.isPlaying && store.moves > 0,
  actions: computed(() => [
    action("undo", "arcade.undo", "U", ["u", "ctrl+z"], store.undo, {
      disabled: !store.canUndo,
    }),
    action("new", "arcade.newGame", "R", ["r", "n"], store.newGame, {
      primary: true,
    }),
    ...directionActions(store.move),
  ]),
  metrics: computed(() => [
    { label: "twenty48.score", value: store.score, emphasis: true },
    { label: "twenty48.best", value: store.bestScore },
    { label: "twenty48.moves", value: store.moves },
  ]),
  restart: store.newGame,
  dispose: store.newGame,
  continue: store.continueGame,
  newBest: computed(() => store.isNewBest),
  rule: "arcade.twenty48Rule",
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
