# 小游戏合集

休闲益智类小游戏合集，打开浏览器随时开玩。
无后端、无追踪、纯静态。

[在线试玩](https://dw-mini-games.netlify.app/)

[English](./README.md) | 中文

![小游戏合集](./docs/home-zh-CN.jpg)

## 快速开始

需要 [Node.js](https://nodejs.org/) 20+ 和 [pnpm](https://pnpm.io/) 11+。

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173` 即可开始。

### 常用脚本

```bash
pnpm dev         # 启动开发服务器
pnpm build       # 类型检查 + 打包到 dist/
pnpm preview     # 本地预览构建产物
pnpm typecheck   # 仅类型检查（vue-tsc）
```

构建产物在 `dist/`，可直接部署到任何静态托管（GitHub Pages / Cloudflare Pages / Vercel 等）。

## 技术栈

- **框架**: [Vue 3](https://vuejs.org/) 3.5
- **路由**: [vue-router](https://router.vuejs.org/) 4
- **状态**: [Pinia](https://pinia.vuejs.org/) 2
- **样式**: [Tailwindcss](https://tailwindcss.com/) 3
- **构建**: [Vite](https://vitejs.dev/) 5
- **类型**: [TypeScript](https://www.typescriptlang.org/) 5
- **包管理**: [pnpm](https://pnpm.io/) 11

## 游戏清单

| 游戏 | 状态 | 简介 |
| ---- | ---- | ---- |
| 俄罗斯方块 | ✅ 已完成 | 经典 10×20 网格，SRS 旋转，7-bag 随机，Hold / Next 3，T-Spin / Back-to-Back / Combo / SFX |
| 数独 | ✅ 已完成 | 9×9 网格，3 难度，3 错失败机制，笔注模式，分难度最佳记录 |
| 2048 | ✅ 已完成 | 4×4 滑块合并，1 步撤销，挑战 2048 / 4096+ |
| 贪吃蛇 | ✅ 已完成 | 20×20 经典方向控制，吃食物长大，180° 反向防自杀 |
| 五子棋 | ✅ 已完成 | 15×15 棋盘，三档 AI 难度（Random / Heuristic / Minimax），AI 思考时高亮候选点 |
| 数字华容道 | ✅ 已完成 | 经典滑块拼图，3×3（8-puzzle）/ 4×4（15-puzzle）两档，单步撤销，分尺寸最佳记录 |

## 自定义语言包

预设支持中文（zh-CN）和英文（en-US）。自动检测浏览器语言，header 右上角可手动切换。

支持自定义语言包：

1. 打开页脚"自定义语言"链接
2. 在弹窗中粘贴 JSON（结构与内置语言包一致）
3. 保存后立即生效，显示在语言列表

## 主题

三种主题模式：

- 浅色（默认）
- 深色
- 跟随系统

header 右上角图标循环切换（☀️ / 🌙 / 🌗），选择持久化在浏览器本地。

## 声音

header 右上角有全局静音按钮，控制所有游戏的 SFX。
点击喇叭图标（🔊 / 🔇）可切换静音/恢复，选择持久化在浏览器本地。
鼠标 hover 任意 header 按钮可看到提示。

## 贡献

欢迎提 issue / PR / 新游戏想法。游戏规范请保持经典玩法一致性。

## 许可证

[MIT](./LICENSE)
