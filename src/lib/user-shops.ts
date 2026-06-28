import { useEffect, useState, useCallback } from "react";
import { DEFAULT_USER_SHOPS, STORES, type StoreId } from "./shop-store";

type ShopId = Exclude<StoreId, "any">;

const key = (householdId: string | null | undefined) =>
  householdId ? `trolly:shops:${householdId}` : "trolly:shops:anon";

function read(householdId: string | null | undefined): ShopId[] {
  if (typeof window === "undefined") return DEFAULT_USER_SHOPS;
  try {
    const raw = localStorage.getItem(key(householdId));
    if (!raw) return DEFAULT_USER_SHOPS;
    const parsed = JSON.parse(raw) as ShopId[];
    const valid = parsed.filter((id) => STORES.some((s) => s.id === id));
    return valid.length ? valid : DEFAULT_USER_SHOPS;
  } catch {
    return DEFAULT_USER_SHOPS;
  }
}

export function useUserShops(householdId: string | null | undefined) {
  const [shops, setShops] = useState<ShopId[]>(() => read(householdId));

  useEffect(() => {
    setShops(read(householdId));
  }, [householdId]);

  const persist = useCallback(
    (next: ShopId[]) => {
      setShops(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(key(householdId), JSON.stringify(next));
      }
    },
    [householdId],
  );

  const add = useCallback((id: ShopId) => persist(shops.includes(id) ? shops : [...shops, id]), [shops, persist]);
  const remove = useCallback((id: ShopId) => persist(shops.filter((s) => s !== id)), [shops, persist]);
  const move = useCallback(
    (id: ShopId, dir: -1 | 1) => {
      const i = shops.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= shops.length) return;
      const next = [...shops];
      [next[i], next[j]] = [next[j], next[i]];
      persist(next);
    },
    [shops, persist],
  );

  return { shops, add, remove, move };
}
