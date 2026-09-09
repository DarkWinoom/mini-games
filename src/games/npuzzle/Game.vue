<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/NpuzzleBoard.vue";
import { useNpuzzleStore } from "@/stores/npuzzle";
import { action } from "../actions";
import type { GameSession } from "../contracts";
import type { Size } from "./types";
const store = useNpuzzleStore();
let timer: number | undefined;
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const session: GameSession = {
  status: computed(() => (store.isOver ? "won" : "running")),
  hasProgress: () => store.isPlaying && store.movesCount > 0,
  actions: computed(() => [
    action("undo", "arcade.undo", "U", ["u", "ctrl+z"], store.undo, {
      disabled: !store.canUndo,
    }),
    action("new", "arcade.newGame", "R", ["r", "n"], () => store.newGame(), {
      primary: true,
    }),
  ]),
  metrics: computed(() => [
    { label: "npuzzle.moves", value: store.movesCount, emphasis: true },
    { label: "npuzzle.time", value: time(store.elapsed) },
    {
      label: "npuzzle.best",
      value: store.bestRecord
        ? `${store.bestRecord.moves} / ${time(store.bestRecord.time)}`
        : "—",
    },
  ]),
  settings: computed(() => [
    {
      label: "npuzzle.difficulty",
      value: String(store.size),
      options: [
        { value: "3", label: "3 × 3" },
        { value: "4", label: "4 × 4" },
      ],
      change: (value) => store.setSize(Number(value) as Size),
    },
  ]),
  restart: () => store.newGame(),
  mount: () => {
    timer = window.setInterval(store.tick, 1000);
  },
  dispose: () => {
    clearInterval(timer);
    store.newGame();
  },
  rule: "npuzzle.rules.oneLiner",
  newBest: computed(() => store.isNewBest),
};
</script>
<template>
  <GameHost :session="session"
    ><Board
      :board="store.board"
      :size="store.size"
      :is-over="store.isOver"
      :is-winning="store.isOver"
      @cell-click="store.moveTile"
  /></GameHost>
</template>
