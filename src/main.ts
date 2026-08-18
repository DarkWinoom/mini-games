import './styles/base.css';

/**
 * mini-games 入口
 *
 * 当前阶段：脚手架（v0.1.0）
 * - 路由 / i18n / theme / 视图 等在下一阶段实现
 * - 此文件只验证 Vite + TS + base.css 基础链路
 */

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 48px;">
      <h1 style="font-size: 64px; font-weight: 800; letter-spacing: -0.04em; margin: 0;">mini-games</h1>
      <p style="font-size: 16px; color: var(--fg-muted); margin: 0;">scaffold ready · v0.1.0</p>
      <p style="font-size: 14px; color: var(--fg-muted); margin: 0;">
        Next: router / i18n / theme / shared components
      </p>
    </main>
  `;
}
