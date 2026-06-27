import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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
  createdAt: number;
  deal?: Deal;
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
  created_at: string;
  deal_store: string | null;
  deal_price: number | null;
  deal_expiry: string | null;
};

const toItem = (r: DbItem): Item => ({
  id: r.id,
  name: r.name,
  preferredStore: r.preferred_store as StoreId,
  isLocked: r.is_locked,
  notes: r.notes ?? undefined,
  favorite: r.favorite,
  checked: r.checked,
  createdAt: new Date(r.created_at).getTime(),
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
  addItem: (i: { name: string; preferredStore: StoreId; isLocked: boolean; notes?: string; favorite?: boolean }) => Promise<void>;
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

  addItem: async ({ name, preferredStore, isLocked, notes }) => {
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

  toggleCheck: async (id) => {
    const it = get().items.find((i) => i.id === id);
    if (!it) return;
    set({ items: get().items.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)) });
    await supabase.from("items").update({ checked: !it.checked }).eq("id", id);
  },

  removeItem: async (id) => {
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
    set({ items: get().items.filter((x) => !x.checked) });
    await supabase.from("items").delete().eq("household_id", householdId).eq("checked", true);
  },
}));

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
    (it) => it.preferredStore !== store && it.preferredStore !== "any" && !it.isLocked,
  );
  return { preferredHere, anyStore, canBuyHere };
};
