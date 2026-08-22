/**
 * Locale 类型定义
 *
 * 工程规则：所有新增 i18n key 必须同步加到 LocaleDict interface + 所有 locale 文件。
 * TypeScript 编译会捕获漏加的 key。
 */

export type LocaleCode = string;

export interface LocaleDict {
  // 通用
  "common.appName": string;
  "common.play": string;
  "common.back": string;
  "common.restart": string;
  "common.pause": string;
  "common.resume": string;
  "common.cancel": string;
  "common.confirm": string;
  "common.close": string;
  "common.save": string;

  // Header
  "header.language": string;
  "header.theme": string;
  "header.themeLight": string;
  "header.themeDark": string;
  "header.themeSystem": string;
  "header.soundOn": string;
  "header.soundOff": string;

  // 主页
  "home.title": string;
  "home.subtitle": string;
  "home.tetris.title": string;
  "home.tetris.description": string;
  "home.sudoku.title": string;
  "home.sudoku.description": string;
  "home.twenty48.title": string;
  "home.twenty48.description": string;
  "home.snake.title": string;
  "home.snake.description": string;
  "home.gomoku.title": string;
  "home.gomoku.description": string;
  "home.npuzzle.title": string;
  "home.npuzzle.description": string;

  // Footer
  "footer.copyright": string;
  "footer.github": string;
  "footer.customLanguage": string;
  "footer.license": string;

  // 自定义语言包 modal
  "customLang.title": string;
  "customLang.description": string;
  "customLang.placeholder": string;
  "customLang.import": string;
  "customLang.invalidJson": string;
  "customLang.missingKeys": string;
  "customLang.success": string;

  // 俄罗斯方块
  "tetris.title": string;
  "tetris.score": string;
  "tetris.level": string;
  "tetris.lines": string;
  "tetris.hold": string;
  "tetris.next": string;
  "tetris.paused": string;
  "tetris.resume": string;
  "tetris.gameOver": string;
  "tetris.b2b": string;
  "tetris.combo": string;
  "tetris.best": string;
  "tetris.newBest": string;
  "tetris.controls.title": string;
  "tetris.controls.move": string;
  "tetris.controls.soft": string;
  "tetris.controls.hard": string;
  "tetris.controls.rotate": string;
  "tetris.controls.hold": string;
  "tetris.controls.pause": string;
  "tetris.controls.restart": string;
  "tetris.controls.resumeHint": string;
  "tetris.backHome": string;
  "tetris.modal.leave.title": string;
  "tetris.modal.leave.body": string;
  "tetris.modal.leave.confirm": string;
  "tetris.modal.leave.cancel": string;
  "tetris.startHint": string;

  // 数独
  "sudoku.title": string;
  "sudoku.difficulty": string;
  "sudoku.difficulty.easy": string;
  "sudoku.difficulty.medium": string;
  "sudoku.difficulty.hard": string;
  "sudoku.difficulty.expert": string;
  "sudoku.errors": string;
  "sudoku.time": string;
  "sudoku.notes": string;
  "sudoku.newGame": string;
  "sudoku.completed": string;
  "sudoku.failed": string;
  "sudoku.best": string;
  "sudoku.newBest": string;
  "sudoku.paused": string;
  "sudoku.erase": string;
  "sudoku.rules.title": string;
  "sudoku.rules.goal": string;
  "sudoku.rules.play": string;
  "sudoku.rules.win": string;
  "sudoku.failed.message": string;
  "sudoku.backHome": string;
  "sudoku.modal.leave.title": string;
  "sudoku.modal.leave.body": string;
  "sudoku.modal.leave.confirm": string;
  "sudoku.modal.leave.cancel": string;
  "sudoku.pauseHint": string;

  // 2048
  "twenty48.newGame": string;
  "twenty48.undo": string;
  "twenty48.score": string;
  "twenty48.best": string;
  "twenty48.moves": string;
  "twenty48.maxTile": string;
  "twenty48.rules.title": string;
  "twenty48.rules.goalTitle": string;
  "twenty48.rules.goalBody": string;
  "twenty48.rules.playTitle": string;
  "twenty48.rules.playBody": string;
  "twenty48.rules.winTitle": string;
  "twenty48.rules.winBody": string;
  "twenty48.rules.cautionTitle": string;
  "twenty48.rules.cautionBody": string;
  "twenty48.modal.win.title": string;
  "twenty48.modal.win.body": string;
  "twenty48.modal.win.continue": string;
  "twenty48.modal.win.newBest": string;
  "twenty48.modal.over.title": string;
  "twenty48.modal.over.body": string;
  "twenty48.modal.leave.title": string;
  "twenty48.modal.leave.body": string;
  "twenty48.modal.leave.confirm": string;
  "twenty48.modal.leave.cancel": string;
  "twenty48.backHome": string;

  // 贪吃蛇
  "snake.newGame": string;
  "snake.pause": string;
  "snake.resume": string;
  "snake.score": string;
  "snake.best": string;
  "snake.length": string;
  "snake.startHint": string;
  "snake.rules.title": string;
  "snake.rules.goalTitle": string;
  "snake.rules.goalBody": string;
  "snake.rules.playTitle": string;
  "snake.rules.playBody": string;
  "snake.rules.dieTitle": string;
  "snake.rules.dieBody": string;
  "snake.rules.cautionTitle": string;
  "snake.rules.cautionBody": string;
  "snake.modal.over.title": string;
  "snake.modal.over.body": string;
  "snake.modal.leave.title": string;
  "snake.modal.leave.body": string;
  "snake.modal.leave.confirm": string;
  "snake.modal.leave.cancel": string;
  "snake.backHome": string;
  "snake.paused": string;
  "snake.pauseHint": string;

  // 五子棋
  "gomoku.newGame": string;
  "gomoku.difficulty": string;
  "gomoku.difficulty.easy": string;
  "gomoku.difficulty.medium": string;
  "gomoku.difficulty.hard": string;
  "gomoku.status": string;
  "gomoku.turn.your": string;
  "gomoku.turn.ai": string;
  "gomoku.thinking": string;
  "gomoku.won": string;
  "gomoku.lost": string;
  "gomoku.draw": string;
  "gomoku.you": string;
  "gomoku.ai": string;
  "gomoku.rules.title": string;
  "gomoku.rules.goalTitle": string;
  "gomoku.rules.goalBody": string;
  "gomoku.rules.playTitle": string;
  "gomoku.rules.playBody": string;
  "gomoku.rules.winTitle": string;
  "gomoku.rules.winBody": string;
  "gomoku.rules.cautionTitle": string;
  "gomoku.rules.cautionBody": string;
  "gomoku.modal.over.title": string;
  "gomoku.modal.over.body": string;
  "gomoku.modal.leave.title": string;
  "gomoku.modal.leave.body": string;
  "gomoku.modal.leave.confirm": string;
  "gomoku.modal.leave.cancel": string;
  "gomoku.backHome": string;

  // 数字华容道
  "npuzzle.newGame": string;
  "npuzzle.undo": string;
  "npuzzle.difficulty": string;
  "npuzzle.moves": string;
  "npuzzle.time": string;
  "npuzzle.best": string;
  "npuzzle.bestMoves": string;
  "npuzzle.bestTime": string;
  "npuzzle.playing": string;
  "npuzzle.solved": string;
  "npuzzle.rules.title": string;
  "npuzzle.rules.goalTitle": string;
  "npuzzle.rules.goalBody": string;
  "npuzzle.rules.playTitle": string;
  "npuzzle.rules.playBody": string;
  "npuzzle.rules.winTitle": string;
  "npuzzle.rules.winBody": string;
  "npuzzle.rules.cautionTitle": string;
  "npuzzle.rules.cautionBody": string;
  "npuzzle.modal.over.title": string;
  "npuzzle.modal.over.body": string;
  "npuzzle.modal.newBest": string;
  "npuzzle.modal.leave.title": string;
  "npuzzle.modal.leave.body": string;
  "npuzzle.modal.leave.confirm": string;
  "npuzzle.modal.leave.cancel": string;
  "npuzzle.backHome": string;
}

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  isBuiltin: boolean;
}
