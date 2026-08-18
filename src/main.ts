/**
 * mini-games 入口（Vue 3 版本）
 *
 * 启动顺序：
 * 1. 创建 Vue app
 * 2. 安装 pinia（状态管理）
 * 3. 安装 router（路由）
 * 4. 初始化 stores（i18n 恢复自定义 + theme 应用 data-theme）
 * 5. 挂载
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import { useI18nStore } from "./stores/i18n";
import { useThemeStore } from "./stores/theme";
import "./style.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 初始化 stores（必须在 mount 之前）
useI18nStore().init();
useThemeStore().init();

app.mount("#app");
