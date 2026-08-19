import type { LocaleDict } from "@/i18n/types";

export const locale: LocaleDict = {
  // Common
  "common.appName": "Mini Games Collection",
  "common.play": "Play",
  "common.back": "Back",
  "common.restart": "Restart",
  "common.pause": "Pause",
  "common.resume": "Resume",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.close": "Close",
  "common.save": "Save",

  // Header
  "header.language": "Language",
  "header.theme": "Theme",
  "header.themeLight": "Light",
  "header.themeDark": "Dark",
  "header.themeSystem": "System",

  // Home
  "home.title": "Simple. Fun.",
  "home.subtitle":
    "A collection of small games in your browser. No install, play anytime.",
  "home.tetris.title": "Tetris",
  "home.tetris.description": "Classic blocks. Clear lines, beat the score.",
  "home.sudoku.title": "Sudoku",
  "home.sudoku.description": "Numbers. Logic. Three difficulty levels.",

  // Footer
  "footer.copyright": "© 2026 Mini Games Collection",
  "footer.github": "GitHub",
  "footer.customLanguage": "Custom Language",
  "footer.license": "MIT",

  // Custom language modal
  "customLang.title": "Custom Language Pack",
  "customLang.description":
    "Paste a JSON blob (same structure as built-in packs). Saves and takes effect immediately.",
  "customLang.placeholder":
    '{ "common.appName": "Mini Games Collection", ... }',
  "customLang.import": "Import",
  "customLang.invalidJson": "Invalid JSON",
  "customLang.missingKeys": "Missing required keys",
  "customLang.success": "Custom language pack loaded",

  // Tetris
  "tetris.title": "Tetris",
  "tetris.score": "Score",
  "tetris.level": "Level",
  "tetris.lines": "Lines",
  "tetris.hold": "Hold",
  "tetris.next": "Next",
  "tetris.paused": "Paused",
  "tetris.resume": "Resume",
  "tetris.gameOver": "Game Over",
  "tetris.b2b": "B2B",
  "tetris.combo": "Combo",
  "tetris.mute": "Mute",
  "tetris.unmute": "Unmute",
  "tetris.best": "Best",
  "tetris.newBest": "New Best!",
  "tetris.controls.title": "Controls",
  "tetris.controls.move": "Move",
  "tetris.controls.soft": "Soft drop",
  "tetris.controls.hard": "Hard drop",
  "tetris.controls.rotate": "Rotate",
  "tetris.controls.hold": "Hold",
  "tetris.controls.pause": "Pause",
  "tetris.controls.restart": "Restart",
  "tetris.controls.resumeHint": "Press P or click below to resume",

  // Sudoku
  "sudoku.title": "Sudoku",
  "sudoku.difficulty": "Difficulty",
  "sudoku.difficulty.easy": "Easy",
  "sudoku.difficulty.medium": "Medium",
  "sudoku.difficulty.hard": "Hard",
  "sudoku.errors": "Errors",
  "sudoku.time": "Time",
  "sudoku.notes": "Notes",
  "sudoku.newGame": "New Game",
  "sudoku.completed": "Completed!",
  "sudoku.failed": "Failed",
};
