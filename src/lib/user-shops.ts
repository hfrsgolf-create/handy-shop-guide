import { useShops, type Shop } from "./shops-store";

export type { Shop };

/**
 * Thin compatibility wrapper around the household shops store.
 * Returns full shop objects (id/name/color) so callers don't need
 * to look anything up themselves.
 */
export function useUserShops(_householdId?: string | null) {
  const shops = useShops((s) => s.shops);
  const add = useShops((s) => s.add);
  const remove = useShops((s) => s.remove);
  const move = useShops((s) => s.move);
  const update = useShops((s) => s.update);
  return { shops, add, remove, move, update };
}
