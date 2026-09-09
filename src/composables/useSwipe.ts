export function useSwipe(
  move: (direction: "up" | "down" | "left" | "right") => void,
) {
  let start: { x: number; y: number } | null = null;
  function touchstart(event: TouchEvent) {
    const point = event.touches[0];
    start = { x: point.clientX, y: point.clientY };
  }
  function touchend(event: TouchEvent) {
    if (!start) return;
    const point = event.changedTouches[0],
      dx = point.clientX - start.x,
      dy = point.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  }
  return { touchstart, touchend };
}
