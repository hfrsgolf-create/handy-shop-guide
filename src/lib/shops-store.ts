import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type Shop = {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isDefault: boolean;
};

export const FREE_SHOP_LIMIT = 4;

export const SHOP_COLOR_PRESETS: { name: string; value: string }[] = [
  { name: "Tesco blue", value: "#1f4ea1" },
  { name: "Sainsbury orange", value: "#e8782d" },
  { name: "Lidl red", value: "#d4202a" },
  { name: "Aldi navy", value: "#1c3a6e" },
  { name: "Forest", value: "#2f6b4a" },
  { name: "Plum", value: "#7a3473" },
  { name: "Slate", value: "#475569" },
  { name: "Sand", value: "#b08968" },
  { name: "Teal", value: "#0f766e" },
  { name: "Coral", value: "#f97066" },
];

const DEFAULT_SHOPS: Omit<Shop, "orderIndex">[] = [
  { id: "tesco", name: "Tesco", color: "#1f4ea1", isDefault: true },
  { id: "sainsburys", name: "Sainsbury's", color: "#e8782d", isDefault: true },
  { id: "lidl", name: "Lidl", color: "#d4202a", isDefault: true },
  { id: "aldi", name: "Aldi", color: "#1c3a6e", isDefault: true },
];

type DbShop = {
  id: string;
  name: string;
  color: string;
  order_index: number;
  is_default: boolean;
};

const toShop = (r: DbShop): Shop => ({
  id: r.id,
  name: r.name,
  color: r.color,
  orderIndex: r.order_index,
  isDefault: r.is_default,
});

type State = {
  shops: Shop[];
  ready: boolean;
  householdId: string | null;
  init: (householdId: string) => Promise<void>;
  ensureDefaults: () => Promise<void>;
  reset: () => void;
  add: (input: { name: string; color: string }) => Promise<Shop | null>;
  update: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  move: (id: string, dir: -1 | 1) => Promise<void>;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || `shop-${Date.now().toString(36)}`;

async function seedAndFetchDefaults(householdId: string): Promise<Shop[]> {
  const seed = DEFAULT_SHOPS.map((s, i) => ({
    household_id: householdId,
    id: s.id,
    name: s.name,
    color: s.color,
    order_index: i,
    is_default: true,
  }));
  const { error } = await supabase
    .from("shops")
    .upsert(seed, { onConflict: "household_id,id", ignoreDuplicates: true });
  if (error) console.error("[shops] seed defaults failed", error);
  const { data } = await supabase
    .from("shops")
    .select("*")
    .eq("household_id", householdId)
    .order("order_index", { ascending: true });
  return (data ?? []).map((r) => toShop(r as DbShop));
}

export const useShops = create<State>((set, get) => ({
  shops: [],
  ready: false,
  householdId: null,

  reset: () => set({ shops: [], ready: false, householdId: null }),

  init: async (householdId) => {
    set({ householdId, ready: false });
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("household_id", householdId)
      .order("order_index", { ascending: true });

    let rows = (data ?? []).map((r) => toShop(r as DbShop));
    if (rows.length === 0) {
      rows = await seedAndFetchDefaults(householdId);
    }
    set({ shops: rows, ready: true });
  },

  ensureDefaults: async () => {
    const { householdId, shops } = get();
    if (!householdId || shops.length > 0) return;
    const rows = await seedAndFetchDefaults(householdId);
    if (rows.length > 0) set({ shops: rows });
  },

  add: async ({ name, color }) => {
    const { householdId, shops } = get();
    if (!householdId) return null;
    const baseId = slugify(name);
    let id = baseId;
    let n = 2;
    while (shops.some((s) => s.id === id)) id = `${baseId}-${n++}`;
    const orderIndex = shops.length;
    const { data, error } = await supabase
      .from("shops")
      .insert({
        household_id: householdId,
        id,
        name: name.trim(),
        color,
        order_index: orderIndex,
        is_default: false,
      })
      .select("*")
      .single();
    if (error || !data) return null;
    const shop = toShop(data as DbShop);
    set({ shops: [...shops, shop] });
    return shop;
  },

  update: async (id, patch) => {
    const { householdId, shops } = get();
    if (!householdId) return;
    set({
      shops: shops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
    await supabase
      .from("shops")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      })
      .eq("household_id", householdId)
      .eq("id", id);
  },

  remove: async (id) => {
    const { householdId, shops } = get();
    if (!householdId) return;
    const next = shops.filter((s) => s.id !== id).map((s, i) => ({ ...s, orderIndex: i }));
    set({ shops: next });
    await supabase.from("shops").delete().eq("household_id", householdId).eq("id", id);
    // re-persist order
    await Promise.all(
      next.map((s) =>
        supabase
          .from("shops")
          .update({ order_index: s.orderIndex })
          .eq("household_id", householdId)
          .eq("id", s.id),
      ),
    );
  },

  move: async (id, dir) => {
    const { householdId, shops } = get();
    if (!householdId) return;
    const i = shops.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= shops.length) return;
    const next = [...shops];
    [next[i], next[j]] = [next[j], next[i]];
    const renum = next.map((s, idx) => ({ ...s, orderIndex: idx }));
    set({ shops: renum });
    await Promise.all([
      supabase
        .from("shops")
        .update({ order_index: renum[i].orderIndex })
        .eq("household_id", householdId)
        .eq("id", renum[i].id),
      supabase
        .from("shops")
        .update({ order_index: renum[j].orderIndex })
        .eq("household_id", householdId)
        .eq("id", renum[j].id),
    ]);
  },
}));

export const shopName = (id: string | null | undefined): string => {
  if (!id || id === "any") return "Any store";
  const s = useShops.getState().shops.find((x) => x.id === id);
  return s?.name ?? id;
};
