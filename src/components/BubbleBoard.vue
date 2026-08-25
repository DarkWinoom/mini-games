<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  BOARD_W,
  BOARD_H,
  CELL_W,
  CELL_H,
  SHOOTER_X,
  SHOOTER_Y,
  clampAngle,
} from "@/games/bubble/engine";
import { colsOfRow } from "@/games/bubble/engine";
import type { Board, BubbleColor, ShootingBubble } from "@/games/bubble/types";
import { ROWS, MIN_ANGLE } from "@/games/bubble/types";

/**
 * 泡泡龙棋盘
 *
 * 视觉（v1.0.2 升级）：
 * - 12 行 brick layout（长行 15 / 短行 14 cells，clip-path 六边形）
 * - 球面高光（box-shadow inset + .bubble-highlight）+ 外部光晕（box-shadow 0 0 6px）
 * - 飞行泡泡：absolutely positioned 圆形（带阴影 + 内部高光）
 * - 发射器：底部居中圆弧 + 瞄准线（虚线）+ 落点指示（虚线小圆，pulse 动画）
 * - 吸附弹跳（cell 短暂 scale 1.25→1，240ms）+ 消除粒子（4-6 个放射状淡出）
 *
 * 交互：
 * - mousemove（aiming 状态）→ emit setAngle 调整角度
 * - click → emit shoot 发射
 */

const props = defineProps<{
  board: Board;
  shootingBubble: ShootingBubble | null;
  currentColor: BubbleColor;
  angle: number;
  isAiming: boolean;
  isPaused: boolean;
  isLost: boolean;
  isWon: boolean;
}>();

const emit = defineEmits<{
  setAngle: [deg: number];
  shoot: [];
  resume: [];
}>();

const boardEl = ref<HTMLElement | null>(null);

/** 6 色 CSS 背景：radial-gradient 模拟左上球面光照（v1.0.2） */
const BUBBLE_COLORS_CSS: Record<BubbleColor, string> = {
  red: "radial-gradient(circle at 30% 28%, #fda4af 0%, #fb7185 35%, #ef4444 100%)",
  blue: "radial-gradient(circle at 30% 28%, #93c5fd 0%, #60a5fa 35%, #3b82f6 100%)",
  green: "radial-gradient(circle at 30% 28%, #6ee7b7 0%, #34d399 35%, #10b981 100%)",
  yellow: "radial-gradient(circle at 30% 28%, #fde68a 0%, #fcd34d 35%, #fbbf24 100%)",
  purple: "radial-gradient(circle at 30% 28%, #d8b4fe 0%, #c084fc 35%, #a855f7 100%)",
  orange: "radial-gradient(circle at 30% 28%, #fdba74 0%, #fb923c 35%, #f97316 100%)",
};

/* === 飞行泡泡 style === */
const flyingStyle = computed(() => {
  const b = props.shootingBubble;
  if (!b) return { display: "none" };
  return {
    left: `${b.x - CELL_W / 2}px`,
    top: `${b.y - CELL_H / 2}px`,
    background: BUBBLE_COLORS_CSS[b.color],
  };
});

/* === 发射器 style === */
const shooterStyle = computed(() => ({
  left: `${SHOOTER_X - CELL_W / 2}px`,
  top: `${SHOOTER_Y - CELL_H / 2}px`,
  background: BUBBLE_COLORS_CSS[props.currentColor],
}));

/* === 瞄准线 style + 落点 style（v1.0.2 加落点指示） === */
const aimLineStyle = computed(() => {
  const rad = (props.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  // 从 SHOOTER 出射到 board 顶/左/右 边界的最大长度
  let len = 0;
  if (Math.abs(dy) > 0.01) len = Math.max(len, SHOOTER_Y / Math.abs(dy));
  if (Math.abs(dx) > 0.01) {
    len = Math.max(len, SHOOTER_X / Math.abs(dx));
    len = Math.max(len, (BOARD_W - SHOOTER_X) / Math.abs(dx));
  }
  return {
    left: `${SHOOTER_X}px`,
    top: `${SHOOTER_Y}px`,
    width: `${len}px`,
    // 瞄线 div 默认从起点向右延伸（+X 方向），要让它指向 angle 方向
    // → 旋转 -angle（CSS 中 y 向下为正，atan2 已用 -dy 修正方向）
    transform: `rotate(${-props.angle}deg)`,
  };
});

/** 瞄线落点（小圆）位置：沿瞄线方向延伸 60px */
const aimDotStyle = computed(() => {
  const rad = (props.angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);
  const dist = 60;
  return {
    left: `${SHOOTER_X + dx * dist}px`,
    top: `${SHOOTER_Y + dy * dist}px`,
  };
});

/* === 棋盘 cell 列表（v-for） === */
const allCells = computed(() => {
  const cells: Array<{
    row: number;
    col: number;
    color: BubbleColor;
    style: Record<string, string>;
  }> = [];
  for (let r = 0; r < ROWS; r++) {
    const isShort = r % 2 === 1;
    const cols = colsOfRow(r);
    for (let c = 0; c < cols; c++) {
      const color = props.board[r][c];
      if (!color) continue;
      const left = c * CELL_W + (isShort ? CELL_W / 2 : 0);
      const top = r * CELL_H;
      cells.push({
        row: r,
        col: c,
        color,
        style: {
          left: `${left}px`,
          top: `${top}px`,
          background: BUBBLE_COLORS_CSS[color],
        },
      });
    }
  }
  return cells;
});

/* === 吸附弹跳（v1.0.2）：cell 短暂 .is-snap class，240ms 后移除 === */
const snappingCells = ref<Set<string>>(new Set());
function triggerSnap(row: number, col: number): void {
  const key = `${row},${col}`;
  snappingCells.value.add(key);
  setTimeout(() => {
    snappingCells.value.delete(key);
    // 触发响应式（Set mutation 不自动）
    snappingCells.value = new Set(snappingCells.value);
  }, 260);
  // 触发响应式
  snappingCells.value = new Set(snappingCells.value);
}

/* === 消除粒子（v1.0.2）：监听 board，找出"从非 null 变 null"的 cell，spawn 4-6 粒子 === */
interface Particle {
  id: number;
  left: number;
  top: number;
  color: BubbleColor;
  flyTo: string;
}
const particles = ref<Particle[]>([]);
let particleIdCounter = 0;

/* === 飞行尾迹（v1.0.2）：watch shootingBubble 变化，保留过去 2 帧位置，opacity 渐变 === */
interface TrailBubble {
  x: number;
  y: number;
  color: BubbleColor;
  opacity: number;
}
const trailBubbles = ref<TrailBubble[]>([]);
watch(
  () => props.shootingBubble,
  (b) => {
    if (!b) {
      // bubble 消失（hit 触发 resolve）→ 清尾迹
      trailBubbles.value = [];
      return;
    }
    // 推入当前帧（保留最近 2 帧）
    const newTrail = [...trailBubbles.value, { x: b.x, y: b.y, color: b.color, opacity: 1 }];
    if (newTrail.length > 2) newTrail.shift();
    // 渐变 opacity：最新 1.0, 之前 0.5
    trailBubbles.value = newTrail.map((t, i) => ({
      ...t,
      opacity: i === newTrail.length - 1 ? 1 : 0.5,
    }));
  },
  { deep: true },
);

watch(
  () => props.board.map((row) => row.join("|")).join("\n"),
  (newSnap, oldSnap) => {
    if (!oldSnap) return;
    const newLines = newSnap.split("\n");
    const oldLines = oldSnap.split("\n");
    const newParticles: Particle[] = [];
    for (let r = 0; r < ROWS; r++) {
      const newCells = newLines[r]?.split("|") ?? [];
      const oldCells = oldLines[r]?.split("|") ?? [];
      for (let c = 0; c < Math.max(newCells.length, oldCells.length); c++) {
        const oldColor = oldCells[c] && oldCells[c] !== "null" ? (oldCells[c] as BubbleColor) : null;
        const newColor = newCells[c] && newCells[c] !== "null" ? (newCells[c] as BubbleColor) : null;
        // 从有变空 → 消除 → spawn 粒子
        if (oldColor && !newColor) {
          const isShort = r % 2 === 1;
          const left = c * CELL_W + (isShort ? CELL_W / 2 : 0) + CELL_W / 2;
          const top = r * CELL_H + CELL_H / 2;
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 + (Math.random() - 0.5) * 0.6;
            const dist = 14 + Math.random() * 10;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            newParticles.push({
              id: ++particleIdCounter,
              left: left - 5,
              top: top - 5,
              color: oldColor,
              flyTo: `translate(${dx}px, ${dy}px)`,
            });
          }
        }
        // 从空变有 → 吸附 → trigger 弹跳
        if (!oldColor && newColor) {
          triggerSnap(r, c);
        }
      }
    }
    if (newParticles.length > 0) {
      particles.value = [...particles.value, ...newParticles];
      // 480ms 后清掉（match CSS animation duration）
      setTimeout(() => {
        const minId = particleIdCounter - newParticles.length + 1;
        particles.value = particles.value.filter((p) => p.id >= minId + newParticles.length);
      }, 500);
    }
  },
);

/* === 鼠标交互 === */
function onMouseMove(e: MouseEvent) {
  if (!props.isAiming || props.isPaused) return;
  const el = boardEl.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  // boardEl 是 wrap（带 12px padding），board 实际渲染区域 = wrap 内部减去 padding
  // 从 getComputedStyle 读 padding，避免 hardcode
  const style = window.getComputedStyle(el);
  const padX = parseFloat(style.paddingLeft) || 0;
  const padY = parseFloat(style.paddingTop) || 0;
  const innerW = rect.width - 2 * padX;
  const innerH = rect.height - 2 * padY;
  if (innerW <= 0 || innerH <= 0) return;
  const scaleX = BOARD_W / innerW;
  const scaleY = BOARD_H / innerH;
  const mouseX = (e.clientX - rect.left - padX) * scaleX;
  const mouseY = (e.clientY - rect.top - padY) * scaleY;
  // 角度：发射器 (SHOOTER_X, SHOOTER_Y) → 鼠标
  // 屏幕 y 向下为正，需要翻转
  const dx = mouseX - SHOOTER_X;
  const dy = mouseY - SHOOTER_Y;
  let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
  // 限制在 MIN_ANGLE / MAX_ANGLE 范围
  angle = clampAngle(angle);
  if (angle < 0) angle = MIN_ANGLE; // atan2 返回 (-180, 180)，clamp 到 [5, 175]
  emit("setAngle", angle);
}

function onClick() {
  // 暂停状态：点击 = 继续（不发射）
  if (props.isPaused) {
    emit("resume");
    return;
  }
  if (!props.isAiming) return;
  emit("shoot");
}

/* === 粒子 style helper === */
function particleStyle(p: Particle): Record<string, string> {
  return {
    left: `${p.left}px`,
    top: `${p.top}px`,
    background: BUBBLE_COLORS_CSS[p.color],
    ["--fly-to" as string]: p.flyTo,
  };
}
</script>

<template>
  <div
    ref="boardEl"
    class="bubble-board-wrap"
    @mousemove="onMouseMove"
    @click="onClick"
  >
    <div
      :class="['bubble-board', { 'is-lost': isLost, 'is-won': isWon, 'is-paused': isPaused }]"
      :style="{ width: `${BOARD_W}px`, height: `${BOARD_H}px` }"
    >
      <!-- 棋盘 cell -->
      <div
        v-for="cell in allCells"
        :key="`${cell.row}-${cell.col}`"
        :class="['bubble-cell', `is-${cell.color}`, { 'is-snap': snappingCells.has(`${cell.row},${cell.col}`) }]"
        :style="cell.style"
        :aria-label="`bubble ${cell.row} ${cell.col} ${cell.color}`"
      >
        <span class="bubble-highlight" />
      </div>

      <!-- 飞行泡泡 -->
      <div
        v-if="shootingBubble"
        class="bubble-cell bubble-flying"
        :style="flyingStyle"
        :aria-label="`flying ${shootingBubble.color}`"
      >
        <span class="bubble-highlight" />
      </div>

      <!-- 飞行尾迹（v1.0.2）：过去 2 帧位置，opacity 渐变 -->
      <div
        v-for="(t, i) in trailBubbles"
        :key="`trail-${i}`"
        class="bubble-trail"
        :style="{
          left: `${t.x - CELL_W / 2}px`,
          top: `${t.y - CELL_H / 2}px`,
          background: BUBBLE_COLORS_CSS[t.color],
          opacity: t.opacity,
        }"
        aria-hidden="true"
      />

      <!-- 瞄准线 + 落点（aiming 状态） -->
      <template v-if="isAiming && !isPaused && !shootingBubble">
        <div class="bubble-aim-line" :style="aimLineStyle" aria-hidden="true" />
        <div class="bubble-aim-dot" :style="aimDotStyle" aria-hidden="true" />
      </template>

      <!-- 发射器当前颜色（aiming 状态） -->
      <div
        v-if="isAiming && !shootingBubble"
        class="bubble-shooter"
        :style="shooterStyle"
        :aria-label="`shooter ${currentColor}`"
      >
        <span class="bubble-highlight" />
      </div>

      <!-- 消除粒子 -->
      <div
        v-for="p in particles"
        :key="p.id"
        class="bubble-particle"
        :style="particleStyle(p)"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
