<script setup lang="ts">
import { computed } from "vue";
import GameHost from "@/components/arcade/GameHost.vue";
import Board from "@/components/SudokuBoard.vue";
import BaseButton from "@/components/BaseButton.vue";
import { useSudokuStore } from "@/stores/sudoku";
import { useI18n } from "@/composables/useI18n";
import { formatTime } from "./engine";
import type { Difficulty } from "./types";
import { action } from "../actions";
import type { GameSession } from "../contracts";
const store = useSudokuStore(),
  { t } = useI18n();
const selectedNotes = computed(() => {
  const cell = store.state.selectedCell;
  return cell
    ? [...store.state.notes[cell.row][cell.col]].sort().join(" · ")
    : "";
});
const input = (event: KeyboardEvent) => {
  if (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    store.state.status !== "playing"
  )
    return false;
  if (/^[1-9]$/.test(event.key)) {
    store.place(Number(event.key));
    return true;
  }
  const offsets: Record<string, number[]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const offset = offsets[event.key];
  if (!offset) return false;
  const selected = store.state.selectedCell || { row: 0, col: 0 };
  store.selectCell({
    row: Math.max(0, Math.min(8, selected.row + offset[0])),
    col: Math.max(0, Math.min(8, selected.col + offset[1])),
  });
  return true;
};
const session: GameSession = {
  status: computed(() =>
    store.state.status === "won"
      ? "won"
      : store.state.status === "failed"
        ? "lost"
        : "running",
  ),
  hasProgress: () =>
    store.state.status === "playing" && store.userActionCount > 0,
  actions: computed(() => [
    action("notes", "arcade.notes", "N", ["n"], store.toggleNotesMode, {
      disabled: store.state.status !== "playing",
      pressed: store.state.notesMode,
    }),
    action(
      "erase",
      "arcade.erase",
      "Delete",
      ["Delete", "Backspace", "0"],
      store.erase,
      { disabled: !store.state.selectedCell },
    ),
    action("new", "arcade.newGame", "R", ["r"], store.newGame, {
      primary: true,
    }),
    action("numbers", "arcade.enterNumber", "1–9", [], () => {}, {
      toolbar: false,
    }),
    action("select", "arcade.selectCell", "↑ ↓ ← →", [], () => {}, {
      toolbar: false,
    }),
  ]),
  metrics: computed(() => [
    {
      label: "sudoku.time",
      value: formatTime(store.state.time),
      emphasis: true,
    },
    { label: "sudoku.errors", value: `${store.state.errors} / 3` },
    {
      label: "sudoku.best",
      value:
        store.bestTimes[store.state.difficulty] === null
          ? "—"
          : formatTime(store.bestTimes[store.state.difficulty]!),
    },
  ]),
  settings: computed(() => [
    {
      label: "sudoku.difficulty",
      value: store.state.difficulty,
      options: store.difficulties.map((value) => ({
        value,
        label: t(`sudoku.difficulty.${value}`),
      })),
      change: (value) => store.setDifficulty(value as Difficulty),
    },
  ]),
  mount: store.startTimer,
  dispose: () => {
    store.newGame();
    store.stopTimer();
  },
  restart: store.newGame,
  input,
  rule: "arcade.sudokuRule",
  newBest: computed(() => store.state.isNewBest),
};
</script>
<template>
  <GameHost :session="session"
    ><Board
      :board="store.state.board"
      :puzzle="store.state.puzzle"
      :notes="store.state.notes"
      :selected-cell="store.state.selectedCell"
      :conflicts="store.conflicts"
      :notes-mode="store.state.notesMode"
      @select="store.selectCell"
    /><template #panel
      ><div class="number-pad">
        <BaseButton
          v-for="n in 9"
          :key="n"
          :disabled="store.state.status !== 'playing'"
          @click="store.place(n)"
          >{{ n }}</BaseButton
        >
      </div>
      <span
        v-if="store.state.notesMode || selectedNotes"
        class="candidate-notes"
        >{{ t("arcade.notes") }}: {{ selectedNotes || "—" }}</span
      ></template
    ></GameHost
  >
</template>
