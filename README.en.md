# Mini Games Collection

A small collection of casual browser games.
No backend, no tracking, no install — just static files.

[中文介绍](./README.md)

## Quick Start

Requires [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

### Common Scripts

```bash
pnpm dev         # start the dev server
pnpm build       # type-check and bundle to dist/
pnpm preview     # preview the production build locally
pnpm typecheck   # type-check only (vue-tsc)
```

Output goes to `dist/` and can be deployed to any static host
(GitHub Pages, Cloudflare Pages, Vercel, etc.).

## Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) 3.5
- **Routing**: [vue-router](https://router.vuejs.org/) 4
- **State**: [Pinia](https://pinia.vuejs.org/) 2
- **Styling**: [Tailwindcss](https://tailwindcss.com/) 3
- **Build**: [Vite](https://vitejs.dev/) 5
- **Types**: [TypeScript](https://www.typescriptlang.org/) 5
- **Package Manager**: [pnpm](https://pnpm.io/) 10

## Games

| Game | Status | Description |
| ---- | ------ | ----------- |
| Tetris | 🚧 In progress | Classic 10×20 grid, SRS rotation, 7-bag randomizer, Hold / Next 3 |
| Sudoku | 🚧 In progress | 9×9 grid, 3 difficulty levels, error limit, notes mode |
| More | 🚧 Planned | — |

## Custom Language Packs

Built-in languages: Chinese (zh-CN) and English (en-US). Browser language is
auto-detected; the header has a manual switcher.

To add a custom language pack:

1. Click "Custom Language" in the footer
2. Paste a JSON blob (same structure as the built-in packs)
3. Save — it takes effect immediately and shows up in the language list

## Theme

Three modes:

- Light (default)
- Dark
- System (follow OS)

Click the theme icon in the header to cycle (☀️ / 🌙 / 🌗).
Your choice is persisted in the browser.

## Contributing

Issues, pull requests, and new game ideas are welcome.
Please keep game rules consistent with the classic versions.

## License

[MIT](./LICENSE)
