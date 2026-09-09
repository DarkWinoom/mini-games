import { onMounted, onUnmounted, type ComputedRef } from "vue";
import { useTetrisStore } from "@/stores/tetris";
import { inputIsBlocked, matchesAction } from "@/games/actions";
import type { GameAction } from "@/games/contracts";
export function useTetrisKeys(actions: ComputedRef<GameAction[]>) {
  const store = useTetrisStore();
  const held = new Map<string, { timer: number; keys: string[] }>();
  function release(id: string) {
    const value = held.get(id);
    if (value) window.clearTimeout(value.timer);
    held.delete(id);
  }
  function releaseAll() {
    for (const id of held.keys()) release(id);
  }
  function keydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    if (
      inputIsBlocked(event.target) ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    if (
      event.key === " " &&
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    )
      return;
    const item = actions.value.find(
      (item) => !item.toolbar && matchesAction(event, item),
    );
    if (!item) return;
    event.preventDefault();
    if (event.repeat || held.has(item.id) || item.disabled) return;
    if (store.state.status === "paused") store.resume();
    item.run();
    if (!["left", "right", "soft"].includes(item.id)) return;
    const repeat = () => {
      if (
        store.state.status !== "playing" ||
        inputIsBlocked(document.activeElement)
      ) {
        release(item.id);
        return;
      }
      item.run();
      held.set(item.id, {
        keys: item.keys,
        timer: window.setTimeout(repeat, 33),
      });
    };
    held.set(item.id, {
      keys: item.keys,
      timer: window.setTimeout(repeat, (item.id === "soft" ? 50 : 167) + 33),
    });
  }
  function keyup(event: KeyboardEvent) {
    for (const [id, item] of held)
      if (
        item.keys.some((key) => key.toLowerCase() === event.key.toLowerCase())
      )
        release(id);
  }
  onMounted(() => {
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", releaseAll);
  });
  onUnmounted(() => {
    releaseAll();
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("keyup", keyup);
    window.removeEventListener("blur", releaseAll);
    document.removeEventListener("visibilitychange", releaseAll);
  });
}
