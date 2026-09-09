import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { createLeaveGuard } from "../src/games/leaveGuard";
import { orderFavorites } from "../src/games/library";
import { action, matchesAction } from "../src/games/actions";
import { useI18nStore } from "../src/stores/i18n";
import { useSnakeStore } from "../src/stores/snake";
import { useGomokuStore } from "../src/stores/gomoku";
import { useTwenty48Store } from "../src/stores/twothousandfortyeight";
import { useSudokuStore } from "../src/stores/sudoku";
import { useTetrisStore } from "../src/stores/tetris";
import { useNpuzzleStore } from "../src/stores/npuzzle";
import { useBubbleStore } from "../src/stores/bubble";
import { locale as en } from "../src/locales/en-US";
import { locale as zh } from "../src/locales/zh-CN";
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
  configurable: true,
});
Object.defineProperty(globalThis, "window", {
  value: {
    setTimeout: (...args: any[]) => setTimeout(...args),
    clearTimeout: (handle: any) => clearTimeout(handle),
  },
  configurable: true,
});
Object.defineProperty(globalThis, "document", {
  value: { documentElement: { lang: "" } },
  configurable: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: { languages: ["zh-TW", "en-US"] },
  configurable: true,
});
beforeEach(() => {
  storage.clear();
  setActivePinia(createPinia());
  navigator.languages = ["zh-TW", "en-US"];
});

test("favorites remain stable when a catalog grows to 100 games", () => {
  const games = Array.from({ length: 100 }, (_, index) => ({
    id: `game-${index}`,
  }));
  const ordered = orderFavorites(games, ["game-90", "game-2", "removed-game"]);
  assert.deepEqual(
    ordered.slice(0, 2).map((game) => game.id),
    ["game-2", "game-90"],
  );
  assert.equal(ordered.length, 100);
  assert.equal(new Set(ordered.map((game) => game.id)).size, 100);
  assert.equal(games[0].id, "game-0");
});
test("removing a favorite restores its catalog position", () => {
  const games = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(
    orderFavorites(games, ["b", "c"]).map((game) => game.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    orderFavorites(games, ["c"]).map((game) => game.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(orderFavorites(games, []), games);
});

test("all seven games read records saved by the previous version", () => {
  storage.set("mini-games.tetris.best", "1234");
  storage.set("mini-games.twenty48.best", "2048");
  storage.set("mini-games.snake.best", "21");
  storage.set("mini-games.gomoku.bestWins", "5");
  storage.set("mini-games.sudoku.best", JSON.stringify({ easy: 42 }));
  storage.set(
    "mini-games.npuzzle.best.4x4",
    JSON.stringify({ moves: 99, time: 80, date: "2026-08-21" }),
  );
  storage.set("mini-games.bubble.best", "700");
  assert.equal(useTetrisStore().bestScore, 1234);
  assert.equal(useTwenty48Store().bestScore, 2048);
  assert.equal(useSnakeStore().bestScore, 21);
  assert.equal(useGomokuStore().bestWins, 5);
  assert.equal(useSudokuStore().bestTimes.easy, 42);
  assert.equal(useNpuzzleStore().bestRecord?.moves, 99);
  assert.equal(useBubbleStore().best, 700);
});

test("leave confirmation freezes immediately and cancellation settles navigation", async () => {
  let running = true,
    open = false,
    resumed = 0;
  const guard = createLeaveGuard({
    hasProgress: () => true,
    isRunning: () => running,
    pause: () => {
      running = false;
    },
    resume: () => {
      running = true;
      resumed++;
    },
    setOpen: (value) => {
      open = value;
    },
  });
  const result = guard.request();
  assert.equal(running, false);
  assert.equal(open, true);
  assert.equal(guard.request(), false);
  guard.cancel();
  assert.equal(await result, false);
  assert.equal(running, true);
  assert.equal(resumed, 1);
  assert.equal(open, false);
});
test("cancelling a previously paused game does not resume it", async () => {
  let resumed = false;
  const guard = createLeaveGuard({
    hasProgress: () => true,
    isRunning: () => false,
    resume: () => {
      resumed = true;
    },
    setOpen: () => {},
  });
  const result = guard.request();
  guard.cancel();
  assert.equal(await result, false);
  assert.equal(resumed, false);
});
test("confirm, disposal and untouched runs all settle correctly", async () => {
  let progress = false;
  const guard = createLeaveGuard({
    hasProgress: () => progress,
    isRunning: () => false,
    setOpen: () => {},
  });
  assert.equal(guard.request(), true);
  progress = true;
  const first = guard.request();
  guard.confirm();
  assert.equal(await first, true);
  const second = guard.request();
  guard.dispose();
  assert.equal(await second, false);
});
test("action bindings share a label and reject unintended modifier shortcuts", () => {
  const undo = action("undo", "arcade.undo", "U", ["u", "ctrl+z"], () => {});
  const key = (
    key: string,
    ctrlKey = false,
    altKey = false,
    metaKey = false,
  ) => ({ key, ctrlKey, altKey, metaKey });
  assert.equal(matchesAction(key("U"), undo), true);
  assert.equal(matchesAction(key("z", true), undo), true);
  assert.equal(matchesAction(key("u", true), undo), false);
  assert.equal(matchesAction(key("u", false, true), undo), false);
  assert.equal(matchesAction(key("u", false, false, true), undo), false);
});
test("first language detection is saved and later browser preferences do not override it", () => {
  let locale = useI18nStore();
  locale.init();
  assert.equal(locale.currentLocale, "zh-CN");
  assert.equal(storage.get("ui.lang"), "zh-CN");
  navigator.languages = ["en-US"];
  setActivePinia(createPinia());
  locale = useI18nStore();
  locale.init();
  assert.equal(locale.currentLocale, "zh-CN");
  locale.setLang("en-US");
  assert.equal(storage.get("ui.lang"), "en-US");
  assert.equal(document.documentElement.lang, "en-US");
});
test("language registration updates the menu and partial packs fall back to English", () => {
  const locale = useI18nStore();
  assert.equal(locale.locales.length, 2);
  locale.registerLocale("Français", { "arcade.newGame": "Nouvelle partie" });
  locale.setLang("Français");
  assert.equal(locale.locales.length, 3);
  assert.equal(locale.t("arcade.newGame"), "Nouvelle partie");
  assert.equal(locale.t("common.close"), en["common.close"]);
  for (let i = 0; i < 28; i++)
    locale.registerLocale(`test-${i}`, { "common.close": `Close ${i}` });
  assert.equal(locale.locales.length, 31);
});

test("saved custom language imports are no longer loaded", () => {
  storage.set("ui.lang", "custom");
  storage.set(
    "ui.customLocale",
    JSON.stringify({
      code: "custom",
      dict: { "arcade.newGame": "Imported text" },
    }),
  );
  const locale = useI18nStore();
  locale.init();
  assert.deepEqual(
    locale.locales.map((item) => item.code),
    ["zh-CN", "en-US"],
  );
  assert.equal(locale.currentLocale, "zh-CN");
  assert.equal(locale.t("arcade.newGame"), zh["arcade.newGame"]);
  assert.equal(storage.get("ui.lang"), "zh-CN");
});
test("built-in translations have the same keys and interpolate literal replacements", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  const locale = useI18nStore();
  assert.equal(locale.t("arcade.count", { count: 30 }), "30 games");
});
test("snake countdown and movement stop when a run is reset", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const snake = useSnakeStore();
  snake.start();
  snake.togglePause();
  snake.togglePause();
  assert.equal(snake.resumeCountdown, 3);
  snake.newGame();
  context.mock.timers.tick(5000);
  assert.equal(snake.status, "waiting");
  assert.equal(snake.resumeCountdown, 0);
});
test("background pause cancels an active snake resume countdown", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const snake = useSnakeStore();
  snake.start();
  snake.togglePause();
  snake.togglePause();
  snake.pauseOnly();
  context.mock.timers.tick(4000);
  assert.equal(snake.status, "paused");
  assert.equal(snake.resumeCountdown, 0);
});
test("an old AI callback cannot make a move in a restarted gomoku game", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const game = useGomokuStore();
  game.place(7, 7);
  assert.equal(game.isAIThinking, true);
  game.newGame();
  context.mock.timers.tick(100);
  assert.equal(game.moves.length, 0);
  assert.equal(game.isAIThinking, false);
});
test("continuing 2048 does not reopen the win dialog after every move", () => {
  const game = useTwenty48Store();
  game.state.grid = [
    [1024, 1024, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  game.move("left");
  assert.equal(game.status, "won");
  game.continueGame();
  game.move("right");
  assert.equal(game.status, "playing");
  game.newGame();
  assert.equal(game.moves, 0);
});
test("sudoku notes and three-error result remain intact", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const game = useSudokuStore();
  const index = [...game.state.puzzle].findIndex((value) => value === "-");
  assert.notEqual(index, -1);
  const row = Math.floor(index / 9),
    col = index % 9;
  game.selectCell({ row, col });
  game.toggleNotesMode();
  game.place(3);
  assert.equal(game.state.notes[row][col].has(3), true);
  game.toggleNotesMode();
  const wrong = (Number(game.state.solution[index]) % 9) + 1;
  game.place(wrong);
  game.erase();
  game.place(wrong);
  game.erase();
  game.place(wrong);
  assert.equal(game.state.status, "failed");
  game.stopTimer();
});
test("tetris starts through movement, holds once per piece and resets to waiting", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const game = useTetrisStore();
  assert.equal(game.state.status, "waiting");
  game.left();
  assert.equal(game.state.status, "playing");
  game.doHold();
  const hold = game.state.hold;
  game.doHold();
  assert.equal(game.state.hold, hold);
  game.reset();
  game.stopLoop();
  context.mock.timers.tick(1000);
  assert.equal(game.state.status, "waiting");
});
