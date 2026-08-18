# 小游戏合集

休闲益智类小游戏合集，打开浏览器随时开玩

[For English readers](./README.en.md)

## 快速开始

需要 [Node.js](https://nodejs.org/) 20+ 和 [pnpm](https://pnpm.io/) 10+。

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173` 即可开始。

### 打包发布

```bash
pnpm build
```

产物在 `dist/`，可直接部署到任何静态托管（GitHub Pages / Cloudflare Pages / Vercel 等）。

## 游戏清单

| 游戏 | 状态 | 简介 |
| ---- | ---- | ---- |
| 俄罗斯方块 | ✅ 已发布 | 经典 10×20 网格，SRS 旋转，7-bag 随机，Hold / Next 3 |
| 数独 | ✅ 已发布 | 9×9 网格，3 难度，错误限制，笔记模式 |
| 更多 | 🚧 计划中 | — |

## 自定义语言包

预设支持中文（zh-CN）和英文（en-US）。自动检测浏览器语言，header 右上角可手动切换。

支持自定义语言包：

1. 打开页脚"自定义语言"链接
2. 在弹窗中粘贴 JSON（结构与内置语言包一致）
3. 保存后立即生效，显示在语言列表

完整 key 列表和 JSON 示例见语言包源代码。

## 主题

三种主题模式：

- 浅色（默认）
- 深色
- 跟随系统

header 右上角图标循环切换，选择持久化在浏览器本地。

## 贡献

欢迎提 issue / PR / 新游戏想法。游戏规范请保持经典玩法一致性。

## 许可证

[MIT](./LICENSE)
