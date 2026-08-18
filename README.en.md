# Mini Games Collection

A small collection of classic games you can play in your browser.
No install, no backend, no tracking.

[中文介绍](./README.md)

## Quick Start

Requires [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
pnpm build
```

Output goes to `dist/` and can be deployed to any static host
(GitHub Pages, Cloudflare Pages, Vercel, etc.).

## Games

| Game | Status | Description |
| ---- | ------ | ----------- |
| Tetris | ✅ Released | Classic 10×20 grid, SRS rotation, 7-bag randomizer, Hold / Next 3 |
| Sudoku | ✅ Released | 9×9 grid, 3 difficulty levels, error limit, notes mode |
| More | 🚧 Planned | — |

## Custom Language Packs

Built-in languages: Chinese (zh-CN) and English (en-US). Browser language is
auto-detected; the header has a manual switcher.

To add a custom language pack:

1. Click "Custom Language" in the footer
2. Paste a JSON blob (same structure as the built-in packs)
3. Save — it takes effect immediately and shows up in the language list

See the language pack source for the full key list and a JSON example.

## Theme

Three modes:

- Light (default)
- Dark
- System (follow OS)

Click the theme icon in the header to cycle. Your choice is persisted
in the browser.

## Contributing

Issues, pull requests, and new game ideas are welcome.
Please keep game rules consistent with the classic versions.

## License

[MIT](./LICENSE)
