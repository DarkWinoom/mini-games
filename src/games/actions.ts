import type { GameAction, TextKey } from "./contracts";
export function action(
  id: string,
  label: TextKey,
  key: string,
  keys: string[],
  run: () => void,
  extra: Partial<GameAction> = {},
): GameAction {
  return { id, label, key, keys, run, toolbar: true, ...extra };
}
export function directionActions(
  move: (direction: "up" | "down" | "left" | "right") => void,
): GameAction[] {
  return (["up", "left", "down", "right"] as const).map((direction, i) =>
    action(
      direction,
      `arcade.${direction}`,
      ["↑ / W", "← / A", "↓ / S", "→ / D"][i],
      [
        ["ArrowUp", "w"],
        ["ArrowLeft", "a"],
        ["ArrowDown", "s"],
        ["ArrowRight", "d"],
      ][i],
      () => move(direction),
      { toolbar: false, touch: true, repeat: true },
    ),
  );
}
export function matchesAction(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey">,
  item: GameAction,
): boolean {
  if (event.altKey || event.metaKey) return false;
  const key = `${event.ctrlKey ? "ctrl+" : ""}${event.key.toLowerCase()}`;
  return item.keys.some((binding) => binding.toLowerCase() === key);
}
export function inputIsBlocked(target: EventTarget | null): boolean {
  return (
    !!document.querySelector("[data-input-blocker]") ||
    (target instanceof HTMLElement &&
      !!target.closest(
        "input,textarea,select,[contenteditable=true],[role=menu]",
      ))
  );
}
