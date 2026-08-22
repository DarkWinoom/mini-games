<script setup lang="ts">
import BaseButton from "@/components/BaseButton.vue";
import TetrisPreview from "@/components/TetrisPreview.vue";
import { useI18n } from "@/composables/useI18n";
import type { GameState } from "@/games/tetris/types";

/**
 * 俄罗斯方块右侧 Sidebar
 *
 * 标准布局（与 Gomoku / N-Puzzle / 2048 一致）：
 *  1. Hold（暂存）预览
 *  2. Next 预览（队列）
 *  3. 统计：Score / Level / Lines + Best / B2B / Combo
 *  4. 行动按钮：重开 / 暂停
 *  5. 返回主页（最底部 ghost 按钮）
 *
 * 注意：
 *  - Tetris 无独立"状态卡"——"开始/已暂停/游戏结束"语义在弹窗 + 按钮上。
 *    强行加一个 status 卡只会重复表达，浪费首屏。
 *  - 所有 section 都用统一 `.tetris-section` 卡片样式（白/40 + rounded-2xl + 边框）
 *    保证 Hold / Next / Stats / Actions 视觉权重一致。
 *  - 响应式：`w-full max-w-xs` 移动端占满宽度，桌面端收口到 320px。
 *
 * 设计原则（plan §2.3 UI 改动）：
 *  - 不用图标按钮（统一 BaseButton 文字）
 *  - 静音按钮移除（Header 全局有，游戏页不重复）
 *  - "返回主页"放最底（与其它游戏统一）
 */
defineProps<{
  state: GameState;
  bestScore: number;
  isPaused: boolean;
  isGameOver: boolean;
  isWaiting?: boolean;
}>();

const emit = defineEmits<{
  newGame: [];
  togglePause: [];
  backHome: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="tetris-sidebar">
    <!-- 1. Hold 暂存 -->
    <div class="tetris-section">
      <div class="tetris-section-label">{{ t("tetris.hold") }}</div>
      <div class="tetris-section-body">
        <TetrisPreview :type="state.hold" align="right" />
      </div>
    </div>

    <!-- 2. Next 下一块队列 -->
    <div class="tetris-section">
      <div class="tetris-section-label">{{ t("tetris.next") }}</div>
      <div class="tetris-section-stack">
        <TetrisPreview :type="state.next[0]" align="left" />
        <TetrisPreview :type="state.next[1]" align="left" />
        <TetrisPreview :type="state.next[2]" align="left" />
      </div>
    </div>

    <!-- 3. 统计：Score / Level / Lines + Best / B2B / Combo -->
    <div class="tetris-section">
      <div class="tetris-section-body">
        <div class="tetris-stat-block tetris-stat-block-primary">
          <div class="tetris-stat-label">{{ t("tetris.score") }}</div>
          <div class="tetris-stat-value">{{ state.score.toLocaleString() }}</div>
          <div v-if="bestScore > 0" class="tetris-best-row" :title="t('tetris.best')">
            <span class="tetris-best-label">{{ t("tetris.best") }}</span>
            <span class="tetris-best-value">{{ bestScore.toLocaleString() }}</span>
          </div>
        </div>
        <div class="tetris-stat-pair">
          <div class="tetris-stat-block">
            <div class="tetris-stat-label">{{ t("tetris.level") }}</div>
            <div class="tetris-stat-value text-2xl">{{ state.level }}</div>
          </div>
          <div class="tetris-stat-block">
            <div class="tetris-stat-label">{{ t("tetris.lines") }}</div>
            <div class="tetris-stat-value text-2xl">{{ state.lines }}</div>
          </div>
        </div>
        <div v-if="state.b2b || state.combo >= 1" class="tetris-hud-badges">
          <span
            v-if="state.b2b"
            class="tetris-hud-badge tetris-hud-badge-b2b"
            :title="t('tetris.b2b')"
          >{{ t("tetris.b2b") }}</span>
          <span
            v-if="state.combo >= 1"
            class="tetris-hud-badge tetris-hud-badge-combo"
            :title="t('tetris.combo')"
          >{{ t("tetris.combo") }} ×{{ state.combo }}</span>
        </div>
      </div>
    </div>

    <!-- 4. 行动按钮 -->
    <div class="tetris-section">
      <div class="tetris-section-body tetris-section-actions">
        <BaseButton variant="primary" class="flex-1" @click="emit('newGame')">
          {{ t("tetris.controls.restart") }}
        </BaseButton>
        <BaseButton
          variant="ghost"
          class="flex-1"
          :disabled="isGameOver"
          @click="emit('togglePause')"
        >
          <!-- v0.9.4: waiting 时显示"开始"，点击触发 start() -->
          {{ isWaiting ? t("common.play") : (isPaused ? t("tetris.resume") : t("common.pause")) }}
        </BaseButton>
      </div>
    </div>

    <!-- 5. 返回主页（防误操作：F5 / 后退会丢进度，引导走这里） -->
    <BaseButton variant="ghost" class="tetris-back-home" @click="emit('backHome')">
      {{ t("tetris.backHome") }}
    </BaseButton>
  </div>
</template>
