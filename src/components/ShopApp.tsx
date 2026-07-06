import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Toaster, toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Home,
  Plus,
  Check,
  Lock,
  ChevronRight,
  X,
  ArrowLeft,
  Star,
  
  ShoppingBasket,
  ListChecks,
  Store as StoreIcon,
  Settings2,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import {
  useShop,
  storeName,
  activeDeal,
  type Item,
  type StoreId,
} from "@/lib/shop-store";
import { useShops, FREE_SHOP_LIMIT, SHOP_COLOR_PRESETS, FALLBACK_SHOPS, type Shop } from "@/lib/shops-store";
import { useUserShops } from "@/lib/user-shops";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Sparkles } from "lucide-react";
import { StoreLogo } from "@/lib/store-logos";

type Screen =
  | { name: "home" }
  | { name: "goShopping" }
  | { name: "store"; storeId: Exclude<StoreId, "any"> }
  | { name: "addItem" }
  | { name: "favourites" }
  | { name: "storeFavourites"; storeId: StoreId }
  | { name: "manageShops" }
  | { name: "masterList" };


export function ShopApp() {
  const { profile } = useAuth();
  const initStore = useShop((s) => s.init);
  const ready = useShop((s) => s.ready);
  const initShops = useShops((s) => s.init);
  const shopsReady = useShops((s) => s.ready);
  const shopsList = useShops((s) => s.shops);
  const ensureShopDefaults = useShops((s) => s.ensureDefaults);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [editingDealFor, setEditingDealFor] = useState<Item | null>(null);
  const [spinnerExpired, setSpinnerExpired] = useState(false);

  useEffect(() => {
    if (profile) {
      initStore(profile.household_id, profile.name);
      initShops(profile.household_id);
    }
  }, [profile?.household_id, profile?.name, initStore, initShops]);

  // Fail-safe: if we ever end up with an empty shop list, re-seed defaults.
  useEffect(() => {
    if (profile && shopsReady && shopsList.length === 0) {
      ensureShopDefaults();
    }
  }, [profile?.household_id, shopsReady, shopsList.length, ensureShopDefaults]);

  useEffect(() => {
    const t = setTimeout(() => setSpinnerExpired(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const loaded = !!profile && ready && shopsReady;
  if (!loaded && !spinnerExpired) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your list…
      </div>
    );
  }

  const go = (s: Screen) => setScreen(s);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background text-foreground">
      <Toaster position="top-center" richColors={false} toastOptions={{ className: "rounded-2xl" }} />

      <main className="flex-1 overflow-y-auto pb-28">
        {screen.name === "home" && <HomeScreen go={go} />}
        {screen.name === "goShopping" && <GoShoppingScreen go={go} />}
        {screen.name === "store" && (
          <StoreScreen storeId={screen.storeId} go={go} onEditDeal={setEditingDealFor} />
        )}
        {screen.name === "addItem" && <AddItemScreen go={go} />}
        {screen.name === "favourites" && <FavouritesScreen go={go} />}
        {screen.name === "storeFavourites" && <StoreFavouritesScreen storeId={screen.storeId} go={go} />}
        {screen.name === "manageShops" && <ManageShopsScreen go={go} />}
        {screen.name === "masterList" && <MasterListScreen go={go} onEditDeal={setEditingDealFor} />}
      </main>

      <BottomBar current={screen} go={go} />

      {editingDealFor && <DealSheet item={editingDealFor} onClose={() => setEditingDealFor(null)} />}
    </div>
  );
}

/* ---------- HOME ---------- */

function HomeScreen({ go }: { go: (s: Screen) => void }) {
  const { profile } = useAuth();
  const firstName = profile?.name?.split(" ")[0] || "there";

  type Action = {
    id: Screen["name"];
    title: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    cardBg: string;
    iconBg: string;
    iconFg: string;
    titleColor: string;
    subColor: string;
    chevronColor: string;
  };

  const actions: Action[] = [
    {
      id: "goShopping",
      title: "Go shopping",
      sub: "Pick a store and start ticking off items",
      icon: ShoppingBasket,
      cardBg: "bg-[#1f3d2b] shadow-card",
      iconBg: "bg-white/10",
      iconFg: "text-white",
      titleColor: "text-white",
      subColor: "text-white/75",
      chevronColor: "text-white/70",
    },
    {
      id: "addItem",
      title: "Add to list",
      sub: "Type or pick from your favourites",
      icon: Plus,
      cardBg: "bg-[#e6efe4]",
      iconBg: "bg-[#2f6b3f]",
      iconFg: "text-white",
      titleColor: "text-foreground",
      subColor: "text-muted-foreground",
      chevronColor: "text-muted-foreground",
    },
    {
      id: "masterList",
      title: "View shopping list",
      sub: "Everything you need to buy",
      icon: ListChecks,
      cardBg: "bg-[#efe7f7]",
      iconBg: "bg-[#7c5cc4]/15",
      iconFg: "text-[#6a48b8]",
      titleColor: "text-foreground",
      subColor: "text-muted-foreground",
      chevronColor: "text-muted-foreground",
    },
    {
      id: "favourites",
      title: "Add favourites",
      sub: "Save items you buy often",
      icon: Star,
      cardBg: "bg-[#fbecc9]",
      iconBg: "bg-[#e0a94a]/25",
      iconFg: "text-[#b57e1c]",
      titleColor: "text-foreground",
      subColor: "text-muted-foreground",
      chevronColor: "text-muted-foreground",
    },
    {
      id: "manageShops",
      title: "Manage shops",
      sub: "Reorder or add new stores",
      icon: StoreIcon,
      cardBg: "bg-[#e2ecf7]",
      iconBg: "bg-[#4a76b8]/15",
      iconFg: "text-[#3a68b0]",
      titleColor: "text-foreground",
      subColor: "text-muted-foreground",
      chevronColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="px-6 pt-16">
      <header>
        <p className="text-sm font-medium text-[#2f6b3f]">Hi {firstName} <span className="ml-0.5">👋</span></p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
          What do you want to do today?
        </h1>
      </header>

      <div className="mt-6 space-y-3">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => go({ name: a.id } as Screen)}
            className={`flex w-full items-center gap-4 rounded-3xl px-5 py-5 text-left transition active:scale-[0.99] ${a.cardBg}`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${a.iconBg}`}>
              <a.icon className={`h-5 w-5 ${a.iconFg}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-[17px] font-semibold leading-tight ${a.titleColor}`}>{a.title}</p>
              <p className={`mt-1 text-sm leading-snug ${a.subColor}`}>{a.sub}</p>
            </div>
            <ChevronRight className={`h-5 w-5 shrink-0 ${a.chevronColor}`} />
          </button>
        ))}
      </div>
    </div>
  );
}


/* ---------- GO SHOPPING ---------- */

/**
 * Render-time guarantee that shop screens never see an empty list.
 * - Calls ensureDefaults() as soon as the screen mounts with 0 shops.
 * - Returns FALLBACK_SHOPS while the DB round-trip is in flight so the UI
 *   is never blank.
 */
function useGuaranteedShops(): Shop[] {
  const shops = useShops((s) => s.shops);
  const ensureDefaults = useShops((s) => s.ensureDefaults);
  const householdId = useShops((s) => s.householdId);
  useEffect(() => {
    if (householdId && shops.length === 0) {
      ensureDefaults();
    }
  }, [householdId, shops.length, ensureDefaults]);
  return shops.length > 0 ? shops : FALLBACK_SHOPS;
}

function GoShoppingScreen({ go }: { go: (s: Screen) => void }) {
  const shops = useGuaranteedShops();
  const items = useShop((s) => s.items);

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Where are you shopping?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tap a shop to see what to buy there.</p>

      <div className="mt-8 space-y-3">
        {shops.map((store) => {
          const id = store.id;
          const visible = items.filter((it) => !it.checked && (it.preferredStore === id || (!it.isLocked && it.preferredStore !== "any") || it.preferredStore === "any"));
          const deals = visible.filter((it) => activeDeal(it) && activeDeal(it)!.store === id).length;
          return (
            <button
              key={id}
              onClick={() => go({ name: "store", storeId: id })}
              className="flex w-full items-center gap-3 rounded-3xl bg-card border border-border shadow-card px-5 py-5 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              <StoreLogo storeName={store.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-[19px] font-semibold leading-tight">{store.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {visible.length} {visible.length === 1 ? "item" : "items"}
                  {deals > 0 && <span className="text-deal"> · 🔥 {deals} on offer</span>}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- STORE ---------- */

function StoreScreen({
  storeId,
  go,
  onEditDeal,
}: {
  storeId: Exclude<StoreId, "any">;
  go: (s: Screen) => void;
  onEditDeal: (it: Item) => void;
}) {
  const items = useShop((s) => s.items);
  const shops = useShops((s) => s.shops);
  const store = shops.find((s) => s.id === storeId) ?? { id: storeId, name: storeName(storeId), color: "#94a3b8" };

  const visible = items.filter((it) => !it.checked).filter((it) => {
    if (it.isLocked) return it.preferredStore === storeId;
    return true;
  });

  const preferredHere = visible.filter((it) => it.preferredStore === storeId);
  const dealsHere = visible.filter((it) => {
    const d = activeDeal(it);
    return d && d.store === storeId && it.preferredStore !== storeId;
  });
  const otherIds = new Set([...preferredHere, ...dealsHere].map((i) => i.id));
  const other = visible.filter((it) => !otherIds.has(it.id));

  const dealsCount = visible.filter((it) => activeDeal(it)?.store === storeId).length;

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} to={{ name: "goShopping" }} label="Shops" />
      <div className="mt-3 flex items-center gap-3">
        <StoreLogo storeName={store.name} size={44} />
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold tracking-tight">{store.name}</h1>
          <p className="text-sm text-muted-foreground">{visible.length} items available</p>
        </div>
      </div>

      {dealsCount > 0 && (
        <div className="mt-5 rounded-2xl bg-deal-soft px-5 py-4 text-sm text-deal">
          🔥 {dealsCount} {dealsCount === 1 ? "item" : "items"} on offer here today
        </div>
      )}

      <StoreSection title="⭐ Preferred here" items={preferredHere} storeId={storeId} onEditDeal={onEditDeal} />
      <StoreSection title="🔥 Deals in this store" items={dealsHere} storeId={storeId} onEditDeal={onEditDeal} />
      <StoreSection title="Other available items" items={other} storeId={storeId} onEditDeal={onEditDeal} muted />

      {visible.length === 0 && (
        <div className="mt-8 rounded-3xl bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing on your list for {store.name}.
        </div>
      )}
    </div>
  );
}

function StoreSection({
  title,
  items,
  storeId,
  onEditDeal,
  muted,
}: {
  title: string;
  items: Item[];
  storeId: Exclude<StoreId, "any">;
  onEditDeal: (it: Item) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-7">
      <h2 className={`mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((it) => (
          <ItemRow key={it.id} item={it} viewingStore={storeId} onEditDeal={onEditDeal} />
        ))}
      </div>
    </section>
  );
}

/* ---------- ADD ITEM (quick add w/ favourite suggestions) ---------- */

function AddItemScreen({ go }: { go: (s: Screen) => void }) {
  const items = useShop((s) => s.items);
  const addItem = useShop((s) => s.addItem);
  const [name, setName] = useState("");

  const favourites = useMemo(() => items.filter((i) => i.favorite), [items]);
  const onListNames = new Set(items.filter((i) => !i.checked).map((i) => i.name.toLowerCase()));

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    const pool = favourites.filter((f) => !onListNames.has(f.name.toLowerCase()));
    if (!q) return pool.slice(0, 8);
    return pool.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [favourites, name, onListNames]);

  const addFromFavourite = async (fav: Item) => {
    await addItem({
      name: fav.name,
      preferredStore: fav.preferredStore,
      isLocked: fav.isLocked,
      notes: fav.notes,
      favorite: false,
    });
    toast.success(`Added ${fav.name}`);
    setName("");
  };

  const addTyped = async () => {
    const v = name.trim();
    if (!v) return;
    await addItem({ name: v, preferredStore: "any", isLocked: false });
    toast.success(`Added ${v}`);
    setName("");
  };

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Add to list</h1>
      <p className="mt-1 text-sm text-muted-foreground">Start typing — tap a suggestion to add instantly.</p>

      <div className="mt-6 flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTyped()}
          placeholder="e.g. Bananas"
          className="flex-1 rounded-2xl bg-secondary px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addTyped}
          disabled={!name.trim()}
          className="rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <h2 className="mt-8 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        From your favourites
      </h2>
      <div className="space-y-2 pb-6">
        {suggestions.length === 0 && (
          <div className="rounded-3xl bg-card border border-border px-5 py-8 text-center text-sm text-muted-foreground">
            {favourites.length === 0 ? (
              <>
                No favourites yet.{" "}
                <button onClick={() => go({ name: "favourites" })} className="font-medium text-primary">
                  Add one
                </button>
                .
              </>
            ) : (
              "Nothing matches."
            )}
          </div>
        )}
        {suggestions.map((f) => (
          <button
            key={f.id}
            onClick={() => addFromFavourite(f)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 text-left transition active:scale-[0.99]"
          >
            <Star className="h-4 w-4 fill-favorite text-favorite" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {storeName(f.preferredStore)} {f.isLocked && "· 🔒"}
              </p>
            </div>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- FAVOURITES ---------- */

const FAV_ONBOARDING_KEY = "favouritesOnboardingDismissed_v1";

function FavouritesScreen({ go }: { go: (s: Screen) => void }) {
  const shops = useGuaranteedShops();
  const items = useShop((s) => s.items);
  const addItem = useShop((s) => s.addItem);
  const favs = items.filter((i) => i.favorite);

  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [store, setStore] = useState<StoreId>("any");
  const [locked, setLocked] = useState(false);
  const [lockPrompt, setLockPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(FAV_ONBOARDING_KEY)) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem(FAV_ONBOARDING_KEY, "1");
    }
    setShowOnboarding(false);
  };

  const submit = async () => {
    const combined = [brand.trim(), product.trim()].filter(Boolean).join(" ");
    if (!combined) return;
    await addItem({
      name: combined,
      preferredStore: store,
      isLocked: locked && store !== "any",
      favorite: true,
    });
    toast.success(`Saved ${combined} as favourite`);
    setBrand("");
    setProduct("");
    setStore("any");
    setLocked(false);
  };

  const requestLockToggle = (next: boolean) => {
    if (!next) {
      setLocked(false);
      return;
    }
    if (store === "any") {
      toast.error("Select a store first to lock this favourite.");
      return;
    }
    setLockPrompt(true);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { any: favs.length };
    for (const sh of shops) {
      counts[sh.id] = favs.filter((f) => f.preferredStore === sh.id).length;
    }
    return counts;
  }, [favs, shops]);

  const canSubmit = (brand.trim() + product.trim()).length > 0;
  const lockActive = locked && store !== "any";

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Add favourites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Save items you buy often — they'll suggest as you type.
      </p>

      {/* Add form */}
      <div className="mt-6 space-y-3 rounded-3xl bg-card border border-border shadow-card p-5">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Brand</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Heinz"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Product</label>
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
            placeholder="e.g. Baked Beans"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Select store</label>
          <select
            value={store}
            onChange={(e) => {
              const v = e.target.value as StoreId;
              setStore(v);
              if (v === "any") setLocked(false);
            }}
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="any">Any store</option>
            {shops.map((sh) => (
              <option key={sh.id} value={sh.id}>
                {sh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lock to store toggle row */}
        <button
          type="button"
          onClick={() => requestLockToggle(!lockActive)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
            lockActive
              ? "bg-accent border-primary/40"
              : "bg-secondary border-transparent"
          }`}
        >
          <span className={`flex items-center gap-2 text-sm ${lockActive ? "font-semibold text-primary" : "font-medium text-foreground"}`}>
            {lockActive && <Lock className="h-3.5 w-3.5" />}
            Lock to store
          </span>
          <span
            role="switch"
            aria-checked={lockActive}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              lockActive ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition ${
                lockActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Save favourite
        </button>
      </div>

      {/* Store selector list */}
      <h2 className="mt-8 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        View favourites by store
      </h2>

      <div className="space-y-3 pb-6">
        <FavStoreRow
          onClick={() => go({ name: "storeFavourites", storeId: "any" })}
          label="All stores"
          count={tabCounts.any ?? 0}
        />
        {shops.map((sh) => (
          <FavStoreRow
            key={sh.id}
            onClick={() => go({ name: "storeFavourites", storeId: sh.id })}
            label={sh.name}
            count={tabCounts[sh.id] ?? 0}
            color={sh.color}
          />
        ))}
      </div>

      {/* Lock confirmation */}
      {lockPrompt && (
        <ModalShell onClose={() => setLockPrompt(false)}>
          <h3 className="text-lg font-semibold">Lock to {storeName(store)}?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This item will only appear in the selected store's shopping list.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setLockPrompt(false)}
              className="flex-1 rounded-full bg-secondary py-3 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setLocked(true);
                setLockPrompt(false);
              }}
              className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              Confirm
            </button>
          </div>
        </ModalShell>
      )}

      {/* Onboarding */}
      {showOnboarding && (
        <ModalShell onClose={dismissOnboarding}>
          <h3 className="text-lg font-semibold">How favourites work</h3>
          <div className="mt-4 space-y-4">
            <OnboardingRow icon="🌍" title="Add to Any Store" body="Item appears on all shopping lists." />
            <OnboardingRow icon="🏬" title="Choose a Store" body="Item appears on all lists, with a reminder of where you usually buy it." />
            <OnboardingRow icon="🔒" title="Lock to Store" body="Item will only appear in that store's list." />
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Don't show again
          </label>
          <button
            onClick={dismissOnboarding}
            className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
          >
            Got it
          </button>
        </ModalShell>
      )}
    </div>
  );
}

/* ---------- STORE FAVOURITES (dedicated screen) ---------- */

function StoreFavouritesScreen({ storeId, go }: { storeId: StoreId; go: (s: Screen) => void }) {
  const items = useShop((s) => s.items);
  const toggleFav = useShop((s) => s.toggleFav);
  const removeItem = useShop((s) => s.removeItem);
  const favs = items.filter((i) => i.favorite);
  const list = storeId === "any" ? favs : favs.filter((f) => f.preferredStore === storeId);
  const title = storeId === "any" ? "All favourites" : `${storeName(storeId)} favourites`;

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} to={{ name: "favourites" }} label="Favourites" />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {list.length} {list.length === 1 ? "item" : "items"}
      </p>

      <div className="mt-6 space-y-2 pb-6">
        {list.length === 0 && (
          <div className="rounded-3xl bg-card border border-border px-5 py-8 text-center text-sm text-muted-foreground">
            {favs.length === 0 ? "No favourites yet." : "Nothing saved for this store yet."}
          </div>
        )}
        {list.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5">
            <Star className="h-4 w-4 fill-favorite text-favorite" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {storeName(f.preferredStore)} {f.isLocked && "· 🔒"}
              </p>
            </div>
            <button
              onClick={() => {
                toggleFav(f.id);
                if (f.checked) removeItem(f.id);
                toast.success("Removed from favourites");
              }}
              aria-label="Remove favourite"
              className="rounded-full p-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavStoreRow({
  onClick,
  label,
  count,
  color,
}: {
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-3xl bg-card border border-border shadow-card px-5 py-5 text-left transition active:scale-[0.99]"
    >
      <span
        className="h-12 w-12 shrink-0 rounded-2xl"
        style={{ backgroundColor: color ?? "hsl(var(--secondary))" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold leading-tight truncate">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}


function StoreRow({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99] ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border"
      }`}
    >
      <span
        className="h-8 w-8 shrink-0 rounded-xl"
        style={{ backgroundColor: color ?? (active ? "rgba(255,255,255,0.25)" : "hsl(var(--secondary))") }}
      />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
      <span className={`text-sm font-medium ${active ? "opacity-90" : "text-muted-foreground"}`}>
        ({count})
      </span>
      <ChevronRight className={`h-4 w-4 ${active ? "opacity-90" : "text-muted-foreground"}`} />
    </button>
  );
}

function OnboardingRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lg">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- MANAGE SHOPS ---------- */

// Flip to true to re-enable the free-plan cap + upgrade UI.
const PREMIUM_RESTRICTIONS_ENABLED = false;

function ManageShopsScreen({ go }: { go: (s: Screen) => void }) {
  const { profile, setProfile } = useAuth();
  const shops = useGuaranteedShops();
  const move = useShops((s) => s.move);
  const remove = useShops((s) => s.remove);
  const [editing, setEditing] = useState<Shop | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Shop | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPremium = !!profile?.is_premium;
  const atLimit =
    PREMIUM_RESTRICTIONS_ENABLED && !isPremium && shops.length >= FREE_SHOP_LIMIT;
  const showUpgradeUi = PREMIUM_RESTRICTIONS_ENABLED && !isPremium;

  const upgrade = async () => {
    if (!profile) return;
    await supabase.from("profiles").update({ is_premium: true }).eq("id", profile.id);
    setProfile({ ...profile, is_premium: true });
    toast.success("You're on Premium — add as many shops as you like.");
    setShowUpgrade(false);
  };

  const onAddClick = () => {
    if (atLimit) {
      setShowUpgrade(true);
      return;
    }
    setEditing("new");
  };

  return (
    <div className="px-6 pt-14">
      <div className="flex items-start justify-between gap-3">
        <BackHeader go={go} />
        {showUpgradeUi && (
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            <Sparkles className="h-3.5 w-3.5" /> Upgrade
          </button>
        )}
      </div>

      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Manage shops</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reorder, rename, or add new stores.
      </p>

      <div className="mt-7 space-y-2.5">
        {shops.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-3xl bg-card border border-border shadow-card px-4 py-4"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
              style={{ backgroundColor: s.color }}
              aria-hidden
            >
              {s.name.charAt(0).toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{s.name}</p>
            <div className="flex items-center">
              <IconBtn aria-label="Move up" disabled={i === 0} onClick={() => move(s.id, -1)}>
                <ArrowUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                aria-label="Move down"
                disabled={i === shops.length - 1}
                onClick={() => move(s.id, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </IconBtn>
              <IconBtn aria-label="Edit" onClick={() => setEditing(s)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn aria-label="Delete" onClick={() => setConfirmDelete(s)}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddClick}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-5 text-[15px] font-semibold text-primary-foreground shadow-card transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" /> Add shop
      </button>

      <div className="pb-6" />

      {editing && (
        <ShopEditorSheet
          shop={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmSheet
          title="Remove this shop?"
          body={`${confirmDelete.name} will be removed from your list.`}
          confirmLabel="Remove"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            const name = confirmDelete.name;
            await remove(confirmDelete.id);
            setConfirmDelete(null);
            toast.success(`${name} removed`);
          }}
        />
      )}

      {showUpgrade && showUpgradeUi && (
        <Sheet onClose={() => setShowUpgrade(false)} title="Go Premium">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Premium unlocks unlimited shops, plus future perks like price comparison and deal
              alerts.
            </p>
            <button
              onClick={upgrade}
              className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
            >
              Upgrade now
            </button>
            <button
              onClick={() => setShowUpgrade(false)}
              className="w-full rounded-full bg-secondary py-3 text-sm font-medium text-secondary-foreground"
            >
              Maybe later
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function IconBtn({
  children,
  disabled,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ShopEditorSheet({ shop, onClose }: { shop: Shop | null; onClose: () => void }) {
  const add = useShops((s) => s.add);
  const update = useShops((s) => s.update);
  const isEdit = !!shop;
  const [name, setName] = useState(shop?.name ?? "");
  const [color, setColor] = useState(shop?.color ?? SHOP_COLOR_PRESETS[0].value);

  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    const v = name.trim();
    if (!v) {
      toast.error("Please enter a shop name");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && shop) {
        await update(shop.id, { name: v, color });
        toast.success(`Updated ${v}`);
        onClose();
      } else {
        await add({ name: v, color });
        toast.success(`Added ${v}`);
        onClose();
      }
    } catch (err) {
      console.error("[AddShop] failed:", err);
      toast.error(err instanceof Error ? err.message : "Couldn't add shop");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet onClose={onClose} title={isEdit ? "Edit shop" : "Add shop"}>
      <div className="space-y-5">
        <Field label="Shop name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Waitrose"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Colour">
          <div className="grid grid-cols-5 gap-2.5">
            {SHOP_COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                className={`flex h-12 items-center justify-center rounded-2xl transition ${
                  color === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: c.value }}
              >
                {color === c.value && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Logo">
          <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
            Logo upload coming soon
          </div>
        </Field>

        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add shop"}
        </button>
      </div>
    </Sheet>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-secondary py-3 text-sm font-medium text-secondary-foreground"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-destructive py-3 text-sm font-medium text-destructive-foreground"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- MASTER LIST ---------- */

function MasterListScreen({ go, onEditDeal }: { go: (s: Screen) => void; onEditDeal: (it: Item) => void }) {
  const items = useShop((s) => s.items);
  const visible = items.filter((i) => !i.checked);
  const recent = useShop((s) => s.activity).slice(0, 3);

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Shopping list</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "item" : "items"} to buy
      </p>

      <div className="mt-6 space-y-2">
        {visible.length === 0 && (
          <div className="rounded-3xl bg-card border border-border shadow-card px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">Your list is empty.</p>
            <button
              onClick={() => go({ name: "addItem" })}
              className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Add your first item
            </button>
          </div>
        )}
        {visible.map((it) => (
          <ItemRow key={it.id} item={it} viewingStore={null} onEditDeal={onEditDeal} />
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Recent activity
          </h2>
          <div className="space-y-1.5 pb-6">
            {recent.map((a) => (
              <div key={a.id} className="rounded-2xl bg-card border border-border px-4 py-3 text-sm">
                <p>{a.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(a.at, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- ITEM ROW ---------- */

function ItemRow({
  item,
  viewingStore,
  onEditDeal,
}: {
  item: Item;
  viewingStore: Exclude<StoreId, "any"> | null;
  onEditDeal: (it: Item) => void;
}) {
  const toggleCheck = useShop((s) => s.toggleCheck);
  const removeItem = useShop((s) => s.removeItem);

  const deal = activeDeal(item);
  const dealHere = deal && viewingStore && deal.store === viewingStore;
  const dealElsewhere = deal && viewingStore && deal.store !== viewingStore;

  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-border px-4 py-4 transition ${dealHere ? "bg-deal-soft" : "bg-card"}`}>
      <button
        onClick={() => {
          toggleCheck(item.id);
          if (!item.checked) {
            toast.success(`${item.name} ticked off`, {
              action: { label: "Undo", onClick: () => toggleCheck(item.id) },
            });
            setTimeout(() => removeItem(item.id), 1800);
          }
        }}
        aria-label="Tick off"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
          item.checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
        }`}
      >
        {item.checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <button onClick={() => onEditDeal(item)} className="min-w-0 flex-1 text-left" aria-label="Edit deal">
        <div className="flex items-center gap-1.5">
          {item.favorite && <Star className="h-3 w-3 fill-favorite text-favorite" />}
          <p className={`truncate text-[15px] font-medium ${item.checked ? "text-muted-foreground line-through" : ""}`}>
            {item.name}
          </p>
          {item.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{item.preferredStore !== "any" ? storeName(item.preferredStore) : "Any store"}</span>
          {dealElsewhere && <span className="text-deal">· Cheaper at {storeName(deal!.store)}</span>}
          {dealHere && (
            <span className="font-medium text-deal">
              · 🔥 On offer{deal!.price ? ` £${deal!.price.toFixed(2)}` : ""}
            </span>
          )}
          {deal && !viewingStore && <span className="text-deal">· 🔥 On offer</span>}
        </div>
      </button>
    </div>
  );
}

/* ---------- DEAL SHEET ---------- */

function DealSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const setDeal = useShop((s) => s.setDeal);
  const { profile } = useAuth();
  const { shops } = useUserShops(profile?.household_id);
  const existing = item.deal;
  const fallback = (shops[0]?.id ?? "tesco") as Exclude<StoreId, "any">;
  const [store, setStore] = useState<Exclude<StoreId, "any">>(
    (existing?.store as Exclude<StoreId, "any">) ??
      (item.preferredStore !== "any" ? (item.preferredStore as Exclude<StoreId, "any">) : fallback),
  );
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [expiry, setExpiry] = useState(
    existing?.expiry?.slice(0, 10) ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );

  const submit = () => {
    setDeal(item.id, {
      store,
      price: price ? Number(price) : undefined,
      expiry: new Date(expiry).toISOString(),
    });
    toast(`${item.name} is on offer at ${storeName(store)}`, { icon: "🔥" });
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={`Deal for ${item.name}`}>
      <div className="space-y-5">
        <Field label="Store">
          {(() => {
            const widthCh = Math.min(Math.max(...shops.map((sh) => sh.name.length), 6), 28);
            return (
              <div className="flex flex-col items-start gap-2">
                {shops.map((sh) => (
                  <ChoiceChip widthCh={widthCh} key={sh.id} selected={store === sh.id} onClick={() => setStore(sh.id)}>
                    {sh.name}
                  </ChoiceChip>
                ))}
              </div>
            );
          })()}
        </Field>
        <Field label="Price (£, optional)">
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="2.50"
            className="w-full rounded-2xl bg-secondary px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <Field label="Expires">
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full rounded-2xl bg-secondary px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <div className="flex gap-2">
          {existing && (
            <button
              onClick={() => {
                setDeal(item.id, undefined);
                toast.success("Deal removed");
                onClose();
              }}
              className="flex-1 rounded-full bg-secondary py-3 text-sm font-medium text-secondary-foreground"
            >
              Remove
            </button>
          )}
          <button onClick={submit} className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground">
            Save deal
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- BOTTOM BAR ---------- */

function BottomBar({ current, go }: { current: Screen; go: (s: Screen) => void }) {
  const navItems: { id: Screen["name"]; label: string; icon: React.ComponentType<{ className?: string }>; screen: Screen }[] = [
    { id: "home", label: "Home", icon: Home, screen: { name: "home" } },
    { id: "goShopping", label: "Shop", icon: ShoppingBasket, screen: { name: "goShopping" } },
    { id: "addItem", label: "Add", icon: Plus, screen: { name: "addItem" } },
    { id: "masterList", label: "List", icon: ListChecks, screen: { name: "masterList" } },
    { id: "manageShops", label: "Shops", icon: Settings2, screen: { name: "manageShops" } },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 bg-background/90 px-2 pb-5 pt-2 backdrop-blur-xl">
      <div className="flex items-center justify-around">
        {navItems.map((it) => {
          const active = current.name === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => go(it.screen)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- PRIMITIVES ---------- */

function BackHeader({ go, to, label }: { go: (s: Screen) => void; to?: Screen; label?: string }) {
  return (
    <button
      onClick={() => go(to ?? { name: "home" })}
      className="flex items-center gap-1 text-sm text-muted-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label ?? "Home"}
    </button>
  );
}

function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-[2rem] bg-background p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
  widthCh,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  widthCh?: number;
}) {
  const style = widthCh
    ? { width: `min(calc(${widthCh}ch + 1.5rem), 70vw)`, minWidth: "5rem" }
    : undefined;
  return (
    <button
      onClick={onClick}
      style={style}
      title={typeof children === "string" ? children : undefined}
      className={`block truncate whitespace-nowrap rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${
        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}

