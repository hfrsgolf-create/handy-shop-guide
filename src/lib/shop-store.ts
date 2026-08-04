import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useShops, shopName } from "./shops-store";

// StoreId stays as a free-form string — user-defined shops live alongside built-ins.
export type StoreId = string;

export const storeName = (id: StoreId | null | undefined) => shopName(id);

export type Deal = {
  store: Exclude<StoreId, "any">;
  price?: number;
  expiry: string;
};

export type Item = {
  id: string;
  name: string;
  preferredStore: StoreId;
  isLocked: boolean;
  notes?: string;
  favorite: boolean;
  checked: boolean;
  onList: boolean;
  createdAt: number;
  deal?: Deal;
  image?: string;
};

export type Activity = { id: string; text: string; at: number };

type DbItem = {
  id: string;
  name: string;
  preferred_store: string;
  is_locked: boolean;
  notes: string | null;
  favorite: boolean;
  checked: boolean;
  on_list: boolean;
  created_at: string;
  deal_store: string | null;
  deal_price: number | null;
  deal_expiry: string | null;
  image_url: string | null;
};

const toItem = (r: DbItem): Item => ({
  id: r.id,
  name: r.name,
  preferredStore: r.preferred_store as StoreId,
  isLocked: r.is_locked,
  notes: r.notes ?? undefined,
  favorite: r.favorite,
  checked: r.checked,
  onList: r.on_list ?? true,
  createdAt: new Date(r.created_at).getTime(),
  image: r.image_url ?? undefined,
  deal: r.deal_store && r.deal_expiry
    ? {
        store: r.deal_store as Exclude<StoreId, "any">,
        price: r.deal_price ?? undefined,
        expiry: r.deal_expiry,
      }
    : undefined,
});

type State = {
  items: Item[];
  activity: Activity[];
  ready: boolean;
  householdId: string | null;
  userName: string;
  init: (householdId: string, userName: string) => Promise<void>;
  reset: () => void;
  addItem: (i: {
    name: string;
    preferredStore: StoreId;
    isLocked: boolean;
    notes?: string;
    favorite?: boolean;
    onList?: boolean;
    image?: string;
  }) => Promise<void>;
  addFavourite: (i: { name: string; preferredStore: StoreId; isLocked: boolean; notes?: string; image?: string }) => Promise<void>;
  updateItem: (
    id: string,
    patch: { name?: string; preferredStore?: StoreId; isLocked?: boolean; image?: string | null },
  ) => Promise<void>;
  addFavouriteToList: (favId: string) => Promise<void>;
  removeFavourite: (id: string) => Promise<void>;
  toggleCheck: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  toggleFav: (id: string) => Promise<void>;
  setDeal: (id: string, deal: Deal | undefined) => Promise<void>;
  quickAddFromFavorite: (id: string) => Promise<void>;
  clearChecked: () => Promise<void>;
};

async function logActivity(householdId: string, text: string) {
  await supabase.from("activity").insert({ household_id: householdId, text });
}

export const useShop = create<State>((set, get) => ({
  items: [],
  activity: [],
  ready: false,
  householdId: null,
  userName: "",

  reset: () => set({ items: [], activity: [], ready: false, householdId: null, userName: "" }),

  init: async (householdId, userName) => {
    set({ householdId, userName, ready: false });
    const [itemsRes, activityRes] = await Promise.all([
      supabase
        .from("items")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity")
        .select("id, text, created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    set({
      items: (itemsRes.data ?? []).map((r) => toItem(r as DbItem)),
      activity: (activityRes.data ?? []).map((a) => ({
        id: a.id,
        text: a.text,
        at: new Date(a.created_at).getTime(),
      })),
      ready: true,
    });
  },

  addItem: async ({ name, preferredStore, isLocked, notes, favorite, onList, image }) => {
    const { householdId, userName } = get();
    if (!householdId) return;
    const { data, error } = await supabase
      .from("items")
      .insert({
        household_id: householdId,
        name: name.trim(),
        preferred_store: preferredStore,
        is_locked: isLocked,
        notes: notes || null,
        favorite: !!favorite,
        on_list: onList ?? !favorite,
        image_url: image || null,
        created_by_name: userName,
      })
      .select("*")
      .single();
    if (error || !data) return;
    const item = toItem(data as DbItem);
    set({ items: [item, ...get().items] });
    await logActivity(householdId, `${userName || "Someone"} added ${item.name}`);
    const { data: a } = await supabase
      .from("activity")
      .select("id, text, created_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(30);
    set({
      activity: (a ?? []).map((row) => ({
        id: row.id,
        text: row.text,
        at: new Date(row.created_at).getTime(),
      })),
    });
  },

  // Favourites are stored as their own rows that never sit on the shopping list.
  addFavourite: async ({ name, preferredStore, isLocked, notes, image }) => {
    await get().addItem({ name, preferredStore, isLocked, notes, image, favorite: true, onList: false });
  },

  // Edits an existing row in place (used by the favourites management screen).
  updateItem: async (id, patch) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    const next: Item = {
      ...it,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.preferredStore !== undefined ? { preferredStore: patch.preferredStore } : {}),
      ...(patch.isLocked !== undefined ? { isLocked: patch.isLocked } : {}),
      ...(patch.image !== undefined ? { image: patch.image || undefined } : {}),
    };
    set({ items: get().items.map((x) => (x.id === id ? next : x)) });
    const db: Record<string, unknown> = {};
    if (patch.name !== undefined) db.name = patch.name;
    if (patch.preferredStore !== undefined) db.preferred_store = patch.preferredStore;
    if (patch.isLocked !== undefined) db.is_locked = patch.isLocked;
    if (patch.image !== undefined) db.image_url = patch.image || null;
    const { error } = await supabase.from("items").update(db).eq("id", id);
    if (error) throw new Error(error.message);
  },

  // Adding a favourite to the list creates an independent clone — no shared row/reference.
  addFavouriteToList: async (favId) => {
    const fav = get().items.find((i) => i.id === favId);
    if (!fav) return;
    await get().addItem({
      name: fav.name,
      preferredStore: fav.preferredStore,
      isLocked: fav.isLocked,
      notes: fav.notes,
      image: fav.image,
      favorite: false,
      onList: true,
    });
  },

  removeFavourite: async (id) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    if (it.onList) {
      // legacy row that is also on the list: keep the list entry, drop the favourite flag
      set({ items: get().items.map((x) => (x.id === id ? { ...x, favorite: false } : x)) });
      await supabase.from("items").update({ favorite: false }).eq("id", id);
      return;
    }
    set({ items: get().items.filter((x) => x.id !== id) });
    await supabase.from("items").delete().eq("id", id);
  },

  toggleCheck: async (id) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    set({ items: get().items.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)) });
    await supabase.from("items").update({ checked: !it.checked }).eq("id", id);
  },

  // Removes an item from the shopping list only. Favourites are separate rows and stay untouched.
  removeItem: async (id) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    if (it.favorite) {
      // legacy row that doubles as a favourite: take it off the list, keep the favourite
      set({ items: get().items.map((x) => (x.id === id ? { ...x, onList: false, checked: false } : x)) });
      await supabase.from("items").update({ on_list: false, checked: false }).eq("id", id);
      return;
    }
    set({ items: get().items.filter((x) => x.id !== id) });
    await supabase.from("items").delete().eq("id", id);
  },

  toggleFav: async (id) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    set({ items: get().items.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)) });
    await supabase.from("items").update({ favorite: !it.favorite }).eq("id", id);
  },

  setDeal: async (id, deal) => {
    const { householdId, userName } = get();
    const it = get().items.find((i) => i.id === id);
    set({
      items: get().items.map((x) => (x.id === id ? { ...x, deal } : x)),
    });
    await supabase
      .from("items")
      .update({
        deal_store: deal?.store ?? null,
        deal_price: deal?.price ?? null,
        deal_expiry: deal?.expiry ?? null,
      })
      .eq("id", id);
    if (deal && it && householdId) {
      await logActivity(
        householdId,
        `${userName || "Someone"} tagged ${it.name} on offer at ${storeName(deal.store)}`,
      );
    }
  },

  quickAddFromFavorite: async (id) => {
    const { householdId, userName } = get();
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    set({ items: get().items.map((x) => (x.id === id ? { ...x, checked: false } : x)) });
    await supabase.from("items").update({ checked: false }).eq("id", id);
    if (householdId) await logActivity(householdId, `${userName || "Someone"} added ${it.name}`);
  },

  clearChecked: async () => {
    const { householdId } = get();
    if (!householdId) return;
    set({ items: get().items.filter((x) => !(x.checked && !x.favorite)) });
    await supabase
      .from("items")
      .delete()
      .eq("household_id", householdId)
      .eq("checked", true)
      .eq("favorite", false);
  },
}));

export const activeDeal = (item: Item) => {
  if (!item.deal) return undefined;
  return new Date(item.deal.expiry).getTime() >= Date.now() ? item.deal : undefined;
};

export const listItems = (items: Item[]) => items.filter((i) => i.onList);
export const favouriteItems = (items: Item[]) => items.filter((i) => i.favorite);

export const itemsForStore = (items: Item[], store: Exclude<StoreId, "any">) => {
  const visible = listItems(items).filter((it) => !it.checked).filter((it) => {
    if (it.isLocked) return it.preferredStore === store;
    return true;
  });
  const preferredHere = visible.filter((it) => it.preferredStore === store);
  const anyStore = visible.filter((it) => it.preferredStore === "any");
  const canBuyHere = visible.filter(
    (it) => it.preferredStore !== store && it.preferredStore !== "any" && !it.isLocked,
  );
  return { preferredHere, anyStore, canBuyHere };
};
