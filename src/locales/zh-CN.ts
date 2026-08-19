import type { LocaleDict } from "@/i18n/types";

export const locale: LocaleDict = {
  // 通用
  "common.appName": "小游戏合集",
  "common.play": "开始",
  "common.back": "返回",
  "common.restart": "重开",
  "common.pause": "暂停",
  "common.resume": "继续",
  "common.cancel": "取消",
  "common.confirm": "确认",
  "common.close": "关闭",
  "common.save": "保存",

  // Header
  "header.language": "语言",
  "header.theme": "主题",
  "header.themeLight": "浅色",
  "header.themeDark": "深色",
  "header.themeSystem": "跟随系统",

  // 主页
  "home.title": "简单。有趣。",
  "home.subtitle": "浏览器里的小游戏合集。无需安装随时开玩。",
  "home.tetris.title": "俄罗斯方块",
  "home.tetris.description": "经典方块。消除行，刷新高分。",
  "home.sudoku.title": "数独",
  "home.sudoku.description": "数字与逻辑，三种难度。",

  // Footer
  "footer.copyright": "© 2026 小游戏合集",
  "footer.github": "GitHub",
  "footer.customLanguage": "自定义语言",
  "footer.license": "MIT",

  // 自定义语言包 modal
  "customLang.title": "自定义语言包",
  "customLang.description":
    "粘贴 JSON（结构与内置语言包一致），保存后立即生效。",
  "customLang.placeholder": '{ "common.appName": "小游戏合集", ... }',
  "customLang.import": "导入",
  "customLang.invalidJson": "JSON 格式错误",
  "customLang.missingKeys": "缺少必要 key",
  "customLang.success": "自定义语言包已加载",

  // 俄罗斯方块
  "tetris.title": "俄罗斯方块",
  "tetris.score": "分数",
  "tetris.level": "等级",
  "tetris.lines": "行数",
  "tetris.hold": "暂存",
  "tetris.next": "下一块",
  "tetris.paused": "已暂停",
  "tetris.resume": "继续",
  "tetris.gameOver": "游戏结束",
  "tetris.b2b": "连击",
  "tetris.combo": "连消",
  "tetris.mute": "静音",
  "tetris.unmute": "取消静音",
  "tetris.best": "最高",
  "tetris.newBest": "新纪录！",
  "tetris.controls.title": "按键说明",
  "tetris.controls.move": "移动",
  "tetris.controls.soft": "软降",
  "tetris.controls.hard": "硬降",
  "tetris.controls.rotate": "旋转",
  "tetris.controls.hold": "暂存",
  "tetris.controls.pause": "暂停",
  "tetris.controls.restart": "重开",
  "tetris.controls.resumeHint": "按 P 继续 / 点击下方按钮",

  // 数独
  "sudoku.title": "数独",
  "sudoku.difficulty": "难度",
  "sudoku.difficulty.easy": "简单",
  "sudoku.difficulty.medium": "中等",
  "sudoku.difficulty.hard": "困难",
  "sudoku.errors": "错误",
  "sudoku.time": "时间",
  "sudoku.notes": "笔记",
  "sudoku.newGame": "新游戏",
  "sudoku.completed": "完成！",
  "sudoku.failed": "失败",
};
