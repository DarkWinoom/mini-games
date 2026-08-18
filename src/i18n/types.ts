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
  "tetris.gameOver": string;

  // 数独
  "sudoku.title": string;
  "sudoku.difficulty": string;
  "sudoku.difficulty.easy": string;
  "sudoku.difficulty.medium": string;
  "sudoku.difficulty.hard": string;
  "sudoku.errors": string;
  "sudoku.time": string;
  "sudoku.notes": string;
  "sudoku.newGame": string;
  "sudoku.completed": string;
  "sudoku.failed": string;
}

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  isBuiltin: boolean;
}
