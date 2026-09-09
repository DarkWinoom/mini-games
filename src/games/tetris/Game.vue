<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/TetrisBoard.vue";
import Preview from "@/components/TetrisPreview.vue";
import { useTetrisStore } from "@/stores/tetris";
import { useTetrisKeys } from "@/composables/useTetrisKeys";
import { useI18n } from "@/composables/useI18n";
import { action } from "../actions";
import type { GameSession } from "../contracts";
const store = useTetrisStore(),
  { t } = useI18n();
const play = (move: () => void) => () => {
  if (store.state.status === "paused") store.resume();
  move();
};

const pause = () => {
  if (store.state.status === "playing") store.pause();
};
const toggle = () => {
  if (store.state.status === "waiting") store.start();
  else if (store.state.status === "paused") store.resume();
  else store.pause();
};
const session: GameSession = {
  status: computed(() =>
    store.state.status === "waiting"
      ? "ready"
      : store.state.status === "paused"
        ? "paused"
        : store.state.status === "gameover"
          ? "lost"
          : "running",
  ),
  hasProgress: () => ["playing", "paused"].includes(store.state.status),
  actions: computed(() => [
    action(
      "pause",
      store.state.status === "waiting"
        ? "arcade.start"
        : store.state.status === "paused"
          ? "common.resume"
          : "common.pause",
      "P",
      ["p"],
      toggle,
      { disabled: store.state.status === "gameover" },
    ),
    action("new", "arcade.newGame", "R", ["r"], store.reset, { primary: true }),
    action("left", "arcade.left", "← / A", ["ArrowLeft", "a"], play(store.left), {
      toolbar: false,
      touch: true,
    }),
    action("right", "arcade.right", "→ / D", ["ArrowRight", "d"], play(store.right), {
      toolbar: false,
      touch: true,
    }),
    action("soft", "arcade.soft", "↓ / S", ["ArrowDown", "s"], play(store.soft), {
      toolbar: false,
      touch: true,
    }),
    action("rotate", "arcade.rotate", "↑ / W", ["ArrowUp", "w"], play(store.cw), {
      toolbar: false,
      touch: true,
    }),
    action("reverse", "arcade.rotateBack", "Z", ["z"], play(store.ccw), {
      toolbar: false,
    }),
    action("hard", "arcade.hard", "Space", [" "], play(store.hard), {
      toolbar: false,
      touch: true,
    }),
    action("hold", "arcade.hold", "C / Shift", ["c", "Shift"], play(store.doHold), {
      toolbar: false,
      touch: true,
    }),
  ]),
  metrics: computed(() => [
    { label: "tetris.score", value: store.state.score, emphasis: true },
    { label: "tetris.best", value: store.bestScore },
    { label: "tetris.level", value: store.state.level },
    { label: "tetris.lines", value: store.state.lines },
  ]),
  restart: store.reset,
  pause,
  resume: store.resumeOnly,
  ownsMovementKeys: true,
  dispose: () => {
    store.reset();
    store.stopLoop();
  },
  rule: "arcade.tetrisRule",
  newBest: computed(() => store.isNewBest),
};
useTetrisKeys(session.actions);
const eventText = computed(() => {
  const event = store.state.lastEvent;
  return event?.kind === "clear"
    ? `${event.tSpin ? event.tSpin.toUpperCase() + " " : ""}${event.clearType.toUpperCase()}${event.b2b ? " · B2B" : ""}${event.combo > 1 ? " · COMBO ×" + event.combo : ""}`
    : "";
});
</script>
<template>
  <GameHost :session="session"
    ><Board :grid="store.grid" :ghost-cells="store.ghostCells" />
    <div v-if="eventText" class="event-flash">{{ eventText }}</div>
    <template #panel
      ><div class="special-panel">
        <div>
          <h2>{{ t("arcade.hold") }}</h2>
          <Preview :type="store.state.hold" />
        </div>
        <div>
          <h2>{{ t("tetris.next") }}</h2>
          <div class="piece-line">
            <Preview
              v-for="(piece, i) in store.state.next.slice(0, 3)"
              :key="i"
              :type="piece"
            />
          </div>
        </div></div></template
  ></GameHost>
</template>
