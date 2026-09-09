export function orderFavorites<T extends { id: string }>(
  games: readonly T[],
  favorites: readonly string[],
): T[] {
  const selected = new Set(favorites);
  return [...games].sort(
    (left, right) =>
      Number(selected.has(right.id)) - Number(selected.has(left.id)),
  );
}
