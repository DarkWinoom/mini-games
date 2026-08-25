import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  makeMove as engineMakeMove,
  checkWinAt,
  findWinningLine,
  isBoardFull,
  getBestMove,
  newGameState,
} from "@/games/gomoku/engine";
import { playSfx } from "@/composables/useSFX";
import type { Difficulty, GameState, Move } from "@/games/gomoku/types";

/** localStorage key：玩家胜利累计 */
const BEST_WINS_KEY = "mini-games.gomoku.bestWins";

function readBestWins(): number {
  try {
    const raw = localStorage.getItem(BEST_WINS_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeBestWins(v: number): void {
  try {
    localStorage.setItem(BEST_WINS_KEY, String(v));
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export const useGomokuStore = defineStore("gomoku", () => {
  const state = ref<GameState>(newGameState("medium"));
  const bestWins = ref<number>(readBestWins());
  /** 本局是否破纪录（玩家胜时计算，newGame 清空） */
  const isNewBest = ref<boolean>(false);
  /** AI 是否在思考中（用于禁用棋盘点击） */
  const isAIThinking = ref<boolean>(false);
  /** AI 累计胜场（用于侧栏显示） */
  const aiWins = ref<number>(0);
  /** 平局累计（用于侧栏显示） */
  const draws = ref<number>(0);
  /** 5 连高亮线（终局时显示） */
  const winningLine = ref<Move[] | null>(null);

  /* === Computed === */
  const board = computed(() => state.value.board);
  const currentPlayer = computed(() => state.value.currentPlayer);
  const status = computed(() => state.value.status);
  const winner = computed(() => state.value.winner);
  const lastMove = computed(() => state.value.lastMove);
  const difficulty = computed(() => state.value.difficulty);
  const isPlaying = computed(() => state.value.status === "playing");
  const isOver = computed(() => state.value.status === "over");
  const moves = computed(() => state.value.moves);
  const isPlayerTurn = computed(
    () => state.value.status === "playing" && state.value.currentPlayer === 1,
  );

  /* === Actions === */

  /**
   * 新游戏（清空状态，保留难度）
   */
  function newGame(): void {
    const diff = state.value.difficulty;
    state.value = newGameState(diff);
    isNewBest.value = false;
    isAIThinking.value = false;
    winningLine.value = null;
  }

  /**
   * 切换难度（任何时候切，newGame 后生效）
   * 切换时重开局 + 清 winningLine
   */
  function setDifficulty(d: Difficulty): void {
    if (state.value.difficulty === d) return;
    state.value = newGameState(d);
    isNewBest.value = false;
    isAIThinking.value = false;
    winningLine.value = null;
  }

  /**
   * 玩家落子（黑棋，1）
   * - 验证 status + 玩家轮次 + AI 不在思考 + 合法落子
   * - 落子 + 判定胜负/平局 + 切到 AI（如果未结束）
   * - 玩家胜利 → 累加 bestWins + 破纪录检测
   */
  function place(row: number, col: number): void {
    if (state.value.status !== "playing") return;
    if (isAIThinking.value) return;
    if (state.value.currentPlayer !== 1) return;
    if (state.value.board[row][col] !== 0) return;

    // 玩家落子
    const next = engineMakeMove(state.value.board, row, col, 1);
    const win = checkWinAt(next, row, col, 1);

    const newMoves = [...state.value.moves, { row, col }];

    if (win === 1) {
      // 玩家胜利
      const nextBestWins = bestWins.value + 1;
      bestWins.value = nextBestWins;
      writeBestWins(nextBestWins);
      isNewBest.value = true; // 任何胜局都视为记录（累加型 best）
      winningLine.value = findWinningLine(next, row, col, 1);
      state.value = {
        ...state.value,
        board: next,
        currentPlayer: 1,
        status: "over",
        winner: 1,
        lastMove: { row, col },
        moves: newMoves,
      };
      playSfx("clear4");
    } else if (isBoardFull(next)) {
      // 平局
      draws.value++;
      state.value = {
        ...state.value,
        board: next,
        currentPlayer: 1,
        status: "over",
        winner: 0,
        lastMove: { row, col },
        moves: newMoves,
      };
      playSfx("clear1");
    } else {
      // 切换到 AI
      state.value = {
        ...state.value,
        board: next,
        currentPlayer: 2,
        lastMove: { row, col },
        moves: newMoves,
      };
      playSfx("place");
      // 触发 AI 思考
      aiMove();
    }
  }

  /**
   * AI 思考 + 落子（白棋，2）
   * - 异步：setTimeout 0 让 UI 先重绘"AI 思考中"
   * - 调 getBestMove 计算最佳点
   * - 落子 + 判定胜负/平局
   * - 玩家失败 → aiWins++
   */
  function aiMove(): void {
    if (state.value.status !== "playing") return;
    if (state.value.currentPlayer !== 2) return;
    isAIThinking.value = true;
    // setTimeout 0 让 UI 先显示 loading
    setTimeout(() => {
      // 再次检查状态（玩家可能在等 AI 时切到了 newGame）
      if (state.value.status !== "playing" || state.value.currentPlayer !== 2) {
        isAIThinking.value = false;
        return;
      }
      const move = getBestMove(state.value.board, 2, state.value.difficulty);
      if (!move) {
        // AI 找不到候选点（理论不会发生） → 平局
        draws.value++;
        state.value = {
          ...state.value,
          status: "over",
          winner: 0,
        };
        isAIThinking.value = false;
        playSfx("clear1");
        return;
      }
      const next = engineMakeMove(state.value.board, move.row, move.col, 2);
      const win = checkWinAt(next, move.row, move.col, 2);
      const newMoves = [...state.value.moves, move];
      if (win === 2) {
        // 玩家失败
        aiWins.value++;
        winningLine.value = findWinningLine(next, move.row, move.col, 2);
        state.value = {
          ...state.value,
          board: next,
          currentPlayer: 1,
          status: "over",
          winner: 2,
          lastMove: move,
          moves: newMoves,
        };
        playSfx("gameover");
      } else if (isBoardFull(next)) {
        // 平局
        draws.value++;
        state.value = {
          ...state.value,
          board: next,
          currentPlayer: 1,
          status: "over",
          winner: 0,
          lastMove: move,
          moves: newMoves,
        };
        playSfx("clear1");
      } else {
        // 切回玩家
        state.value = {
          ...state.value,
          board: next,
          currentPlayer: 1,
          lastMove: move,
          moves: newMoves,
        };
        playSfx("clear1");
      }
      isAIThinking.value = false;
    }, 0);
  }

  return {
    // state (refs)
    state,
    bestWins,
    isNewBest,
    isAIThinking,
    aiWins,
    draws,
    winningLine,
    // computed
    board,
    currentPlayer,
    status,
    winner,
    lastMove,
    difficulty,
    isPlaying,
    isOver,
    moves,
    isPlayerTurn,
    // actions
    newGame,
    setDifficulty,
    place,
  };
});
