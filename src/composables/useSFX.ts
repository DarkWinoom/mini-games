/**
 * 俄罗斯方块 SFX 合成器（Web Audio API）
 *
 * 决策：
 * - 不引外部音频资源（避免 license / 包体）
 * - 用 OscillatorNode + GainNode 合成简短音调
 * - AudioContext 懒初始化（必须用户交互后才能 resume，否则会被浏览器自动挂起）
 * - 静音状态持久化到 localStorage
 */

import { ref, watch } from "vue";

const MUTE_KEY = "mini-games.tetris.muted";

/** 静音状态（响应式 ref，跨组件共享） */
export const sfxMuted = ref<boolean>(readMute());

/** 全局 AudioContext（懒初始化） */
let ctx: AudioContext | null = null;

/** 读取静音状态 */
function readMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** 持久化静音状态 */
function writeMute(v: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

/** 监听 ref 变化，自动持久化 */
watch(sfxMuted, (v) => writeMute(v));

/** 懒初始化 + resume AudioContext（必须在用户交互后调用） */
function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

/**
 * 播放一个短促音调
 * @param freq 频率（Hz）
 * @param duration 时长（s）
 * @param volume 音量峰值（0-1）
 * @param type 波形
 * @param attack 起音时间（s）
 */
function tone(
  freq: number,
  duration = 0.08,
  volume = 0.15,
  type: OscillatorType = "sine",
  attack = 0.005,
): void {
  if (sfxMuted.value) return;
  const c = ensureCtx();
  if (!c) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  // ADSR 简化版：attack → sustain → exponential decay
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + attack);
  gain.gain.setValueAtTime(volume, t0 + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/**
 * 播放一个滑音（频率从 start 线性过渡到 end）
 */
function sweep(
  startFreq: number,
  endFreq: number,
  duration = 0.15,
  volume = 0.15,
  type: OscillatorType = "square",
): void {
  if (sfxMuted.value) return;
  const c = ensureCtx();
  if (!c) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/* ============================================================================
 * SFX 触发 API
 * ========================================================================== */

export type SfxName =
  | "move"
  | "rotate"
  | "lock"
  | "hold"
  | "clear1"
  | "clear2"
  | "clear3"
  | "clear4"
  | "tspin"
  | "tspin-mini"
  | "combo"
  | "gameover"
  | "pause";

export function playSfx(name: SfxName): void {
  switch (name) {
    case "move":
      tone(180, 0.03, 0.08, "square");
      break;
    case "rotate":
      tone(440, 0.05, 0.1, "sine");
      break;
    case "hold":
      tone(330, 0.06, 0.12, "triangle");
      break;
    case "lock":
      tone(120, 0.07, 0.15, "square");
      break;
    case "clear1":
      tone(523, 0.1, 0.18, "sine");
      break;
    case "clear2":
      tone(659, 0.1, 0.18, "sine");
      break;
    case "clear3":
      tone(784, 0.1, 0.18, "sine");
      break;
    case "clear4":
      // Tetris — 4 音上行琶音
      tone(523, 0.08, 0.18, "square");
      window.setTimeout(() => tone(659, 0.08, 0.18, "square"), 50);
      window.setTimeout(() => tone(784, 0.08, 0.18, "square"), 100);
      window.setTimeout(() => tone(1047, 0.12, 0.2, "square"), 150);
      break;
    case "tspin":
      sweep(600, 1200, 0.18, 0.18, "sine");
      break;
    case "tspin-mini":
      sweep(400, 800, 0.14, 0.15, "sine");
      break;
    case "combo":
      // Combo 加成音（叠加在 clear 音上）
      tone(880, 0.12, 0.12, "triangle");
      break;
    case "gameover":
      sweep(400, 80, 0.7, 0.22, "sawtooth");
      break;
    case "pause":
      tone(300, 0.06, 0.1, "sine");
      break;
  }
}

/** 切换静音状态 */
export function toggleMute(): boolean {
  sfxMuted.value = !sfxMuted.value;
  // 切换时确保 ctx resume（第一次开启时浏览器可能已挂起）
  if (!sfxMuted.value) ensureCtx();
  return sfxMuted.value;
}

/** 用户首次交互时调用 — 确保后续 SFX 能正常播放（解决 autoplay policy） */
export function unlockAudioOnFirstInteraction(): void {
  if (typeof window === "undefined") return;
  const unlock = () => {
    ensureCtx();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}
