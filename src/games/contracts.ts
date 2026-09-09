import type { Component, ComputedRef } from "vue";
import type { LocaleDict } from "@/i18n/types";
export type TextKey = keyof LocaleDict;
export interface GameDefinition {
  id: string;
  path: string;
  title: TextKey;
  description: TextKey;
  tag: string;
  load: () => Promise<{ default: Component }>;
}
export interface GameAction {
  id: string;
  label: TextKey;
  key: string;
  keys: string[];
  run: () => void;
  disabled?: boolean;
  primary?: boolean;
  touch?: boolean;
  toolbar?: boolean;
  pressed?: boolean;
  repeat?: boolean;
}
export interface GameMetric {
  label: TextKey;
  value: string | number;
  emphasis?: boolean;
}
export interface GameSetting {
  label: TextKey;
  value: string;
  options: { value: string; label: string }[];
  change: (value: string) => void;
}
export interface GameSession {
  status: ComputedRef<"ready" | "running" | "paused" | "won" | "lost" | "draw">;
  hasProgress: () => boolean;
  actions: ComputedRef<GameAction[]>;
  metrics: ComputedRef<GameMetric[]>;
  settings?: ComputedRef<GameSetting[]>;
  rule: TextKey;
  restart: () => void;
  mount?: () => void;
  dispose?: () => void;
  pause?: () => void;
  resume?: () => void;
  continue?: () => void;
  countdown?: ComputedRef<number>;
  newBest?: ComputedRef<boolean>;
  input?: (event: KeyboardEvent) => boolean;
  ownsMovementKeys?: boolean;
}
