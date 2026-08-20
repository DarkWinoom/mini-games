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

  // 主页
  "home.title": string;
  "home.subtitle": string;
  "home.tetris.title": string;
  "home.tetris.description": string;
  "home.sudoku.title": string;
  "home.sudoku.description": string;
  "home.twenty48.title": string;
  "home.twenty48.description": string;

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
  "tetris.mute": string;
  "tetris.unmute": string;
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
}

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  isBuiltin: boolean;
}
