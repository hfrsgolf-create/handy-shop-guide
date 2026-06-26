import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StoreId = "tesco" | "sainsburys" | "aldi" | "ms" | "any";

export const STORES: { id: Exclude<StoreId, "any">; name: string; color: string }[] = [
  { id: "tesco", name: "Tesco", color: "oklch(0.55 0.18 255)" },
  { id: "sainsburys", name: "Sainsbury's", color: "oklch(0.62 0.20 35)" },
  { id: "aldi", name: "Aldi", color: "oklch(0.55 0.16 230)" },
  { id: "ms", name: "M&S", color: "oklch(0.30 0.04 165)" },
];

export const storeName = (id: StoreId | null | undefined) =>
  id && id !== "any" ? STORES.find((s) => s.id === id)?.name ?? "Any store" : "Any store";

export type Deal = {
  store: Exclude<StoreId, "any">;
  price?: number;
  expiry: string; // ISO date
};

export type Item = {
  id: string;
  name: string;
  preferredStore: StoreId; // "any" if no pref
  isLocked: boolean;
  notes?: string;
  favorite: boolean;
  checked: boolean;
  createdAt: number;
  deal?: Deal;
};

export type Activity = { id: string; text: string; at: number };

type State = {
  items: Item[];
  activity: Activity[];
  addItem: (i: Omit<Item, "id" | "createdAt" | "favorite" | "checked"> & { favorite?: boolean }) => void;
  toggleCheck: (id: string) => void;
  removeItem: (id: string) => void;
  toggleFav: (id: string) => void;
  setDeal: (id: string, deal: Deal | undefined) => void;
  quickAddFromFavorite: (id: string) => void;
  clearChecked: () => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useShop = create<State>()(
  persist(
    (set, get) => ({
      items: seed(),
      activity: [],
      addItem: (i) => {
        const item: Item = {
          id: uid(),
          name: i.name.trim(),
          preferredStore: i.preferredStore,
          isLocked: i.isLocked,
          notes: i.notes,
          favorite: i.favorite ?? false,
          checked: false,
          createdAt: Date.now(),
          deal: i.deal,
        };
        set({
          items: [item, ...get().items],
          activity: [
            { id: uid(), text: `Sarah added ${item.name} to the list`, at: Date.now() },
            ...get().activity,
          ].slice(0, 30),
        });
      },
      toggleCheck: (id) =>
        set({
          items: get().items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
        }),
      removeItem: (id) => set({ items: get().items.filter((it) => it.id !== id) }),
      toggleFav: (id) =>
        set({
          items: get().items.map((it) => (it.id === id ? { ...it, favorite: !it.favorite } : it)),
        }),
      setDeal: (id, deal) => {
        const item = get().items.find((i) => i.id === id);
        set({
          items: get().items.map((it) => (it.id === id ? { ...it, deal } : it)),
          activity: deal && item
            ? [
                { id: uid(), text: `${item.name} is on offer at ${storeName(deal.store)}`, at: Date.now() },
                ...get().activity,
              ].slice(0, 30)
            : get().activity,
        });
      },
      quickAddFromFavorite: (id) => {
        const fav = get().items.find((i) => i.id === id);
        if (!fav) return;
        set({
          items: get().items.map((it) => (it.id === id ? { ...it, checked: false } : it)),
          activity: [
            { id: uid(), text: `Sarah added ${fav.name} to the list`, at: Date.now() },
            ...get().activity,
          ].slice(0, 30),
        });
      },
      clearChecked: () => set({ items: get().items.filter((it) => !it.checked) }),
    }),
    { name: "shoplist-v1" }
  )
);

function seed(): Item[] {
  const now = Date.now();
  const inDays = (n: number) => new Date(now + n * 86400000).toISOString();
  return [
    { id: uid(), name: "Semi-skimmed milk", preferredStore: "tesco", isLocked: false, favorite: true, checked: false, createdAt: now, deal: { store: "aldi", price: 1.15, expiry: inDays(3) } },
    { id: uid(), name: "Sourdough bread", preferredStore: "ms", isLocked: true, favorite: true, checked: false, createdAt: now - 1000 },
    { id: uid(), name: "Bananas", preferredStore: "aldi", isLocked: false, favorite: false, checked: false, createdAt: now - 2000 },
    { id: uid(), name: "Olive oil", preferredStore: "any", isLocked: false, favorite: false, checked: false, createdAt: now - 3000, deal: { store: "sainsburys", price: 4.5, expiry: inDays(5) } },
    { id: uid(), name: "Greek yoghurt", preferredStore: "sainsburys", isLocked: false, favorite: true, checked: false, createdAt: now - 4000 },
    { id: uid(), name: "Free-range eggs", preferredStore: "tesco", isLocked: false, favorite: false, checked: false, createdAt: now - 5000, deal: { store: "tesco", price: 2.2, expiry: inDays(2) } },
  ];
}

// Derived helpers
export const activeDeal = (item: Item) => {
  if (!item.deal) return undefined;
  return new Date(item.deal.expiry).getTime() >= Date.now() ? item.deal : undefined;
};

export const itemsForStore = (items: Item[], store: Exclude<StoreId, "any">) => {
  const visible = items.filter((it) => !it.checked).filter((it) => {
    if (it.isLocked) return it.preferredStore === store;
    return true;
  });
  const preferredHere = visible.filter((it) => it.preferredStore === store);
  const anyStore = visible.filter((it) => it.preferredStore === "any");
  const canBuyHere = visible.filter(
    (it) => it.preferredStore !== store && it.preferredStore !== "any" && !it.isLocked
  );
  return { preferredHere, anyStore, canBuyHere };
};
