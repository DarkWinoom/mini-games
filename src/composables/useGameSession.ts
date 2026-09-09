import { onMounted, onUnmounted, shallowRef, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import type { GameSession } from "@/games/contracts";
import { inputIsBlocked, matchesAction } from "@/games/actions";
import { createLeaveGuard } from "@/games/leaveGuard";
import { settingsOpen } from "@/stores/overlays";
export function useGameSession(session: GameSession) {
  const leaving = shallowRef(false);
  const guard = createLeaveGuard({
    hasProgress: session.hasProgress,
    isRunning: () => session.status.value === "running",
    pause: session.pause,
    resume: session.resume,
    setOpen: (value) => {
      leaving.value = value;
    },
  });
  onBeforeRouteLeave(guard.request);
  watch(settingsOpen, (open) => {
    if (open) session.pause?.();
  });
  function onKey(event: KeyboardEvent) {
    if (event.defaultPrevented || leaving.value || inputIsBlocked(event.target))
      return;
    if (
      (event.key === " " || event.key === "Enter") &&
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    )
      return;
    const item = session.actions.value.find((item) =>
      matchesAction(event, item),
    );
    if (item && !(session.ownsMovementKeys && !item.toolbar)) {
      event.preventDefault();
      if ((!event.repeat || item.repeat) && !item.disabled) item.run();
    } else if (session.input?.(event)) event.preventDefault();
  }
  function background() {
    if (document.hidden) session.pause?.();
  }
  function blur() {
    session.pause?.();
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (session.hasProgress()) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  onMounted(() => {
    session.mount?.();
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", blur);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", background);
  });
  onUnmounted(() => {
    guard.dispose();
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("blur", blur);
    window.removeEventListener("beforeunload", beforeUnload);
    document.removeEventListener("visibilitychange", background);
    session.dispose?.();
  });
  return { leaving, confirmLeave: guard.confirm, cancelLeave: guard.cancel };
}
