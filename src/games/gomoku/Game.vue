<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/GomokuBoard.vue";
import { useGomokuStore } from "@/stores/gomoku";
import { useI18n } from "@/composables/useI18n";
import { action } from "../actions";
import type { GameSession } from "../contracts";
import type { Difficulty } from "./types";
const store = useGomokuStore(),
  { t } = useI18n();
const session: GameSession = {
  status: computed(() =>
    !store.isOver
      ? "running"
      : store.winner === 1
        ? "won"
        : store.winner === 2
          ? "lost"
          : "draw",
  ),
  hasProgress: () => store.isPlaying && store.moves.length > 0,
  actions: computed(() => [
    action("new", "arcade.newGame", "R", ["r", "n"], store.newGame, {
      primary: true,
    }),
  ]),
  metrics: computed(() => [
    { label: "gomoku.you", value: store.bestWins, emphasis: true },
    { label: "gomoku.ai", value: store.aiWins },
    { label: "gomoku.draw", value: store.draws },
  ]),
  settings: computed(() => [
    {
      label: "gomoku.difficulty",
      value: store.difficulty,
      options: (["easy", "medium", "hard"] as const).map((value) => ({
        value,
        label: t(`gomoku.difficulty.${value}`),
      })),
      change: (value) => store.setDifficulty(value as Difficulty),
    },
  ]),
  restart: store.newGame,
  dispose: store.newGame,
  rule: "gomoku.rules.oneLiner",
  newBest: computed(() => store.isNewBest),
};
</script>
<template>
  <GameHost :session="session"
    ><Board
      :board="store.board"
      :last-move="store.lastMove"
      :disabled="!store.isPlayerTurn || store.isAIThinking"
      :winning-line="store.winningLine"
      @cell-click="store.place"
    /><template #panel
      ><span>{{
        t(store.isAIThinking ? "gomoku.thinking" : "gomoku.turn.your")
      }}</span></template
    ></GameHost
  >
</template>
