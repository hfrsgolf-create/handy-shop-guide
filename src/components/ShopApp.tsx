import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useScreenStack, useBackClose } from "@/lib/back-nav";
import { Toaster, toast } from "sonner";

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
  ScanLine,
} from "lucide-react";
import {
  useShop,
  storeName,
  activeDeal,
  listItems,
  favouriteItems,
  type Item,
  type StoreId,
} from "@/lib/shop-store";
import { useShops, FREE_SHOP_LIMIT, SHOP_COLOR_PRESETS, FALLBACK_SHOPS, type Shop } from "@/lib/shops-store";
import { useUserShops } from "@/lib/user-shops";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Sparkles, ChevronDown } from "lucide-react";
import { StoreLogo, StoreTab, StoreCard, brandColor, tint } from "@/lib/store-logos";
import { ITEM_CATALOGUE } from "@/lib/item-catalogue";
import { ScanProductSheet } from "@/components/ScanProductSheet";
import { ProductImageBox } from "@/components/ProductImageBox";

type Screen =
  | { name: "home" }
  | { name: "goShopping" }
  | { name: "store"; storeId: Exclude<StoreId, "any"> }
  | { name: "addItem" }
  | { name: "favourites" }
  | { name: "favouritesByShop" }
  | { name: "selectStore" }
  | { name: "storeFavourites"; storeId: StoreId }
  | { name: "manageShops" }
  | { name: "masterList" };

type FavDraft = { brand: string; product: string; store: StoreId; locked: boolean; image?: string };
const EMPTY_FAV_DRAFT: FavDraft = { brand: "", product: "", store: "any", locked: false, image: "" };


export function ShopApp() {
  const { profile } = useAuth();
  const initStore = useShop((s) => s.init);
  const ready = useShop((s) => s.ready);
  const initShops = useShops((s) => s.init);
  const shopsReady = useShops((s) => s.ready);
  const shopsList = useShops((s) => s.shops);
  const ensureShopDefaults = useShops((s) => s.ensureDefaults);
  const { screen, push: pushScreen, reset: resetScreen } = useScreenStack<Screen>({ name: "home" });
  const [favDraft, setFavDraft] = useState<FavDraft>(EMPTY_FAV_DRAFT);
  const [editingDealFor, setEditingDealFor] = useState<Item | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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

  const go = (s: Screen) => {
    if (s.name === screen.name && JSON.stringify(s) === JSON.stringify(screen)) return;
    if (s.name === "home") resetScreen(s);
    else pushScreen(s);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background text-foreground">
      <Toaster position="top-center" richColors={false} toastOptions={{ className: "rounded-2xl" }} />

      <main className="flex-1 overflow-y-auto pb-28">
        {screen.name === "home" && <HomeScreen go={go} />}
        {screen.name === "goShopping" && <GoShoppingScreen go={go} />}
        {screen.name === "store" && (
          <StoreScreen storeId={screen.storeId} go={go} onEditDeal={setEditingDealFor} onPreviewImage={setPreviewImage} />
        )}
        {screen.name === "addItem" && <AddItemScreen go={go} />}
        {screen.name === "favourites" && (
          <FavouritesScreen go={go} draft={favDraft} setDraft={setFavDraft} />
        )}
        {screen.name === "selectStore" && (
          <SelectStoreScreen
            go={go}
            value={favDraft.store}
            onSelect={(id) => {
              setFavDraft((d) => ({ ...d, store: id, locked: id === "any" ? false : d.locked }));
              go({ name: "favourites" });
            }}
          />
        )}
        {screen.name === "favouritesByShop" && <FavouritesByShopScreen go={go} />}
        {screen.name === "storeFavourites" && <StoreFavouritesScreen storeId={screen.storeId} go={go} />}
        {screen.name === "manageShops" && <ManageShopsScreen go={go} />}
        {screen.name === "masterList" && <MasterListScreen go={go} onEditDeal={setEditingDealFor} onPreviewImage={setPreviewImage} />}
      </main>

      <BottomBar current={screen} go={go} />

      {editingDealFor && <DealSheet item={editingDealFor} onClose={() => setEditingDealFor(null)} />}

      <Lightbox src={previewImage} onClose={() => setPreviewImage(null)} />
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
      title: "Add to Shopping List",
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
      id: "favouritesByShop",
      title: "View & Manage Favourites",
      sub: "Organise favourites and add them to your list",
      icon: StoreIcon,
      cardBg: "bg-[#fdeadf]",
      iconBg: "bg-[#e07a4a]/20",
      iconFg: "text-[#c15c2c]",
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
    <div className="px-6 pt-14">
      <PageHeader>
        <header>
          <p className="text-sm font-medium text-primary-foreground/85">Hi {firstName} <span className="ml-0.5">👋</span></p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
            What do you want to do today?
          </h1>
        </header>
      </PageHeader>

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
      <PageHeader>
        <BackHeader go={go} />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Where are you shopping?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a shop to see what to buy there.</p>
      </PageHeader>

      <div className="mt-8 space-y-3.5">
        {shops.map((store) => {
          const id = store.id;
          const visible = listItems(items).filter((it) => !it.checked && (it.preferredStore === id || (!it.isLocked && it.preferredStore !== "any") || it.preferredStore === "any"));
          const deals = visible.filter((it) => activeDeal(it) && activeDeal(it)!.store === id).length;
          return (
            <StoreCard
              key={id}
              id={id}
              name={store.name}
              color={store.color}
              onClick={() => go({ name: "store", storeId: id })}
              subtitle={
                <>
                  {visible.length} {visible.length === 1 ? "item" : "items"}
                  {deals > 0 && <span className="text-deal"> · 🔥 {deals} on offer</span>}
                </>
              }
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- SHARED CHECKOUT ---------- */

// One completion flow shared by the main shopping list and the per-store view.
async function runCheckout(
  checked: Item[],
  clearChecked: () => Promise<void>,
  addItem: (i: { name: string; preferredStore: StoreId; isLocked: boolean; notes?: string }) => Promise<void>,
) {
  if (checked.length === 0) {
    toast("Nothing ticked off yet");
    return;
  }
  const cleared = checked;
  await clearChecked();
  toast.success("Shop complete — items cleared", {
    action: {
      label: "Undo",
      onClick: () => {
        cleared.forEach((it) => {
          addItem({
            name: it.name,
            preferredStore: it.preferredStore,
            isLocked: it.isLocked,
            notes: it.notes,
          });
        });
      },
    },
  });
}

/* ---------- STORE ---------- */

function StoreScreen({
  storeId,
  go,
  onEditDeal,
  onPreviewImage,
}: {
  storeId: Exclude<StoreId, "any">;
  go: (s: Screen) => void;
  onEditDeal: (it: Item) => void;
  onPreviewImage: (src: string) => void;
}) {
  const items = useShop((s) => s.items);
  const shops = useShops((s) => s.shops);
  const toggleCheck = useShop((s) => s.toggleCheck);
  const clearChecked = useShop((s) => s.clearChecked);
  const addItem = useShop((s) => s.addItem);
  const store = shops.find((s) => s.id === storeId) ?? { id: storeId, name: storeName(storeId), color: "#94a3b8" };

  // Same single list as the main shopping list — just filtered to this store.
  const visible = listItems(items).filter((it) => {
    if (it.isLocked) return it.preferredStore === storeId;
    return true;
  });

  const remaining = visible.filter((it) => !it.checked);
  const checked = visible.filter((it) => it.checked);

  const preferredHere = visible.filter((it) => it.preferredStore === storeId);
  const dealsHere = visible.filter((it) => {
    const d = activeDeal(it);
    return d && d.store === storeId && it.preferredStore !== storeId;
  });
  const otherIds = new Set([...preferredHere, ...dealsHere].map((i) => i.id));
  const other = visible.filter((it) => !otherIds.has(it.id));

  const dealsCount = visible.filter((it) => activeDeal(it)?.store === storeId).length;

  const checkout = () => runCheckout(checked, clearChecked, addItem);

  return (
    <div className="px-6 pt-14">
      <PageHeader brand tint={tint(brandColor(store.id, store.name, store.color), 0.14)}>
        <BackHeader go={go} to={{ name: "goShopping" }} label="Shops" />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <StoreLogo
              storeId={store.id}
              storeName={store.name}
              color={brandColor(store.id, store.name, store.color)}
              size={54}
              radius="50%"
              style={{ background: "#ffffff", boxShadow: "0 1px 2px rgba(16,24,40,0.08)" }}
            />
            <div className="min-w-0">
              <h1 className="truncate text-[28px] font-semibold tracking-tight">{store.name}</h1>
              <p className="text-sm text-muted-foreground">
                {remaining.length} left · {checked.length} in basket
              </p>
            </div>
          </div>
          <button
            onClick={checkout}
            className="mt-1 shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.97]"
          >
            Checkout
          </button>
        </div>
      </PageHeader>

      {dealsCount > 0 && (
        <div className="mt-5 rounded-2xl bg-deal-soft px-5 py-4 text-sm text-deal">
          🔥 {dealsCount} {dealsCount === 1 ? "item" : "items"} on offer here today
        </div>
      )}

      <StoreSection
        title="⭐ Preferred here"
        items={preferredHere}
        onToggle={toggleCheck}
        badge="Preferred"
        onPreviewImage={onPreviewImage}
      />
      <StoreSection title="🔥 Deals in this store" items={dealsHere} onToggle={toggleCheck} onPreviewImage={onPreviewImage} />
      <StoreSection title="Other available items" items={other} onToggle={toggleCheck} muted soft onPreviewImage={onPreviewImage} />

      {visible.length === 0 && (
        <div className="mt-8 rounded-3xl bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing on your list for {store.name}.
        </div>
      )}
      <div className="h-8" />
    </div>
  );
}

function StoreSection({
  title,
  items,
  onToggle,
  muted,
  soft,
  badge,
  onPreviewImage,
}: {
  title: string;
  items: Item[];
  onToggle: (id: string) => void;
  muted?: boolean;
  soft?: boolean;
  badge?: string;
  onPreviewImage: (src: string) => void;
}) {
  if (items.length === 0) return null;
  const remaining = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  return (
    <section className="mt-7">
      <h2 className={`mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      <ul className="space-y-2.5">
        {[...remaining, ...done].map((it) => (
          <ShoppingRow
            key={it.id}
            item={it}
            onToggle={() => onToggle(it.id)}
            soft={soft}
            badge={badge}
            onImageClick={onPreviewImage}
          />
        ))}
      </ul>
    </section>
  );
}

/* ---------- ADD ITEM (smart search: favourites first) ---------- */

function AddItemScreen({ go }: { go: (s: Screen) => void }) {
  const items = useShop((s) => s.items);
  const addItem = useShop((s) => s.addItem);
  const addFavouriteToList = useShop((s) => s.addFavouriteToList);
  const [name, setName] = useState("");

  const favourites = useMemo(() => favouriteItems(items), [items]);
  const onListNames = useMemo(
    () => new Set(listItems(items).filter((i) => !i.checked).map((i) => i.name.toLowerCase())),
    [items],
  );

  const q = name.trim().toLowerCase();

  // 1. Favourites matching the query always come first.
  const favResults = useMemo(() => {
    if (!q) return favourites.slice(0, 8);
    return favourites.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [favourites, q]);

  // 2. General catalogue results, minus anything already shown as a favourite.
  const otherResults = useMemo(() => {
    if (!q) return [];
    const favNames = new Set(favourites.map((f) => f.name.toLowerCase()));
    return ITEM_CATALOGUE.filter(
      (c) => c.toLowerCase().includes(q) && !favNames.has(c.toLowerCase()),
    ).slice(0, 8);
  }, [q, favourites]);

  const alreadyOnList = (n: string) => onListNames.has(n.trim().toLowerCase());

  const addFromFavourite = async (fav: Item) => {
    if (alreadyOnList(fav.name)) {
      toast(`${fav.name} is already on your list`);
      return;
    }
    await addFavouriteToList(fav.id);
    toast.success("Added to shopping list");
    setName("");
  };

  const addPlain = async (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (alreadyOnList(v)) {
      toast(`${v} is already on your list`);
      return;
    }
    await addItem({ name: v, preferredStore: "any", isLocked: false });
    toast.success("Added to shopping list");
    setName("");
  };

  const noResults = q.length > 0 && favResults.length === 0 && otherResults.length === 0;

  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Add to Shopping List</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search — tap any result to add instantly.</p>
      </PageHeader>

      <div className="mt-6 flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlain(name)}
          placeholder="Search items, e.g. beans"
          className="flex-1 rounded-2xl bg-secondary px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => addPlain(name)}
          disabled={!name.trim()}
          className="rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <div className="mt-8 space-y-6 pb-6">
        {favResults.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Your favourites
            </h2>
            <div className="space-y-2">
              {favResults.map((f) => {
                const already = alreadyOnList(f.name);
                return (
                  <button
                    key={f.id}
                    onClick={() => addFromFavourite(f)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 text-left transition active:scale-[0.99]"
                  >
                    <Star className="h-4 w-4 shrink-0 fill-favorite text-favorite" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Favourite · {storeName(f.preferredStore)} {f.isLocked && "· 🔒"}
                      </p>
                    </div>
                    {already ? (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {otherResults.length > 0 && (
          <section>
            <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Other results
            </h2>
            <div className="space-y-2">
              {otherResults.map((c) => {
                const already = alreadyOnList(c);
                return (
                  <button
                    key={c}
                    onClick={() => addPlain(c)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3.5 text-left transition active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c}</p>
                    </div>
                    {already ? (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {noResults && (
          <button
            onClick={() => addPlain(name)}
            className="w-full rounded-3xl bg-card border border-border px-5 py-6 text-center text-sm text-muted-foreground transition active:scale-[0.99]"
          >
            Add “{name.trim()}” to your list
          </button>
        )}

        {!q && favResults.length === 0 && (
          <div className="rounded-3xl bg-card border border-border px-5 py-8 text-center text-sm text-muted-foreground">
            No favourites yet.{" "}
            <button onClick={() => go({ name: "favourites" })} className="font-medium text-primary">
              Add one
            </button>
            .
          </div>
        )}
      </div>
    </div>
  );
}


/* ---------- FAVOURITES ---------- */

const FAV_ONBOARDING_KEY = "favouritesOnboardingDismissed_v1";

function FavouritesScreen({
  go,
  draft,
  setDraft,
}: {
  go: (s: Screen) => void;
  draft: FavDraft;
  setDraft: React.Dispatch<React.SetStateAction<FavDraft>>;
}) {
  const shops = useGuaranteedShops();
  const addFavourite = useShop((s) => s.addFavourite);

  const { brand, product, store, locked } = draft;
  const image = draft.image ?? "";
  const [lockPrompt, setLockPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [storeHint, setStoreHint] = useState(false);

  const selectedShop = shops.find((s) => s.id === store);

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
    await addFavourite({
      name: combined,
      preferredStore: store,
      isLocked: locked && store !== "any",
      image: image || undefined,
    });
    toast.success(`Saved ${combined} as favourite`);
    setDraft(EMPTY_FAV_DRAFT);
    setStoreHint(false);
  };

  const requestLockToggle = (next: boolean) => {
    if (!next) {
      setDraft((d) => ({ ...d, locked: false }));
      return;
    }
    if (store === "any") {
      toast.error("Select a store first to lock this favourite.");
      return;
    }
    setLockPrompt(true);
  };

  const canSubmit = (brand.trim() + product.trim()).length > 0;
  const lockActive = locked && store !== "any";


  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Add favourites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save items you buy often — they'll suggest as you type.
        </p>
      </PageHeader>

      {/* Scan a product barcode */}
      <button
        type="button"
        onClick={() => setScanning(true)}
        className="mt-6 flex w-full items-center gap-3 rounded-3xl bg-primary px-4 py-3.5 text-left text-primary-foreground shadow-card transition active:scale-[0.99]"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
          <ScanLine className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Scan item</span>
          <span className="block text-xs opacity-80">Use your camera to fill in name & photo</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
      </button>

      {storeHint && (
        <button
          type="button"
          onClick={() => go({ name: "selectStore" })}
          className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-left text-sm font-medium text-primary"
        >
          Choose which store this is for
          <ChevronRight className="ml-auto h-4 w-4" />
        </button>
      )}

      {scanning && (
        <ScanProductSheet
          onClose={() => setScanning(false)}
          onUse={(r) => {
            setDraft((d) => ({
              ...d,
              brand: r.brand,
              product: r.product,
              image: r.image,
            }));
            setScanning(false);
            // Store can't be inferred from a barcode — nudge the user if none is picked yet.
            setStoreHint(store === "any");
            toast.success(
              [r.brand, r.product].filter(Boolean).join(" ") + " scanned — review and save",
            );
          }}
        />
      )}



      {/* Store selector — opens a dedicated screen */}
      <button
        type="button"
        onClick={() => go({ name: "selectStore" })}
        className="mt-6 flex w-full items-center gap-3 rounded-3xl bg-card border border-border shadow-card px-4 py-3.5 text-left transition active:scale-[0.99]"
      >
        {store === "any" ? (
          <span
            aria-hidden
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-base text-muted-foreground"
          >
            ★
          </span>
        ) : (
          <StoreLogo
            storeId={store}
            storeName={selectedShop?.name ?? storeName(store)}
            color={brandColor(store, selectedShop?.name, selectedShop?.color)}
            size={44}
            radius="50%"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-muted-foreground">Store</span>
          <span className="block truncate text-[15px] font-semibold">
            {store === "any" ? "Any store" : selectedShop?.name ?? storeName(store)}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {/* Add form */}
      <div className="mt-3 space-y-3 rounded-3xl bg-card border border-border shadow-card p-5">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Brand</label>
          <input
            value={brand}
            onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
            placeholder="e.g. Heinz"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground">Product</label>
          <input
            value={product}
            onChange={(e) => setDraft((d) => ({ ...d, product: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
            placeholder="e.g. Baked Beans"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Product image — scanned, or tap to take a photo */}
        <ProductImageBox
          image={image}
          alt={product || "Product"}
          onCapture={(url) => setDraft((d) => ({ ...d, image: url }))}
        />




        {/* Lock to store toggle row */}
        <button
          type="button"
          onClick={() => requestLockToggle(!lockActive)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
            lockActive ? "bg-accent border-primary/40" : "bg-secondary border-transparent"
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

      <button
        onClick={() => go({ name: "favouritesByShop" })}
        className="mt-4 mb-6 flex w-full items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-medium"
      >
        View & manage favourites
        <ChevronRight className="h-4 w-4" />
      </button>

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
                setDraft((d) => ({ ...d, locked: true }));
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

/* ---------- SELECT STORE (dedicated step) ---------- */

function SelectStoreScreen({
  go,
  value,
  onSelect,
}: {
  go: (s: Screen) => void;
  value: StoreId;
  onSelect: (id: StoreId) => void;
}) {
  const shops = useGuaranteedShops();

  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} to={{ name: "favourites" }} label="Add favourites" />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Select store</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a store to use it for this favourite.</p>
      </PageHeader>

      <div className="mt-6 space-y-3 pb-6">
        <StoreCard
          name="Any store"
          selected={value === "any"}
          showChevron={false}
          onClick={() => onSelect("any")}
          subtitle="Appears on every list"
          leading={
            <span
              aria-hidden
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-white text-lg"
              style={{
                width: 54,
                height: 54,
                color: "#6b7280",
                border: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 1px 2px rgba(16,24,40,0.08)",
              }}
            >
              ★
            </span>
          }
        />
        {shops.map((sh) => (
          <StoreTab
            key={sh.id}
            id={sh.id}
            name={sh.name}
            color={sh.color}
            selected={value === sh.id}
            onClick={() => onSelect(sh.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- VIEW & MANAGE FAVOURITES ---------- */

/** Strict display order for the default shops. */
const DEFAULT_SHOP_ORDER = ["tesco", "sainsburys", "lidl", "aldi"];

type FavSection = { id: StoreId; name: string; color?: string };

function FavouritesByShopScreen({ go }: { go: (s: Screen) => void }) {
  const shops = useGuaranteedShops();
  const items = useShop((s) => s.items);
  const addFavouriteToList = useShop((s) => s.addFavouriteToList);
  const favs = favouriteItems(items);
  const [editing, setEditing] = useState<Item | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // Expanded sections, persisted per store. Unknown/new stores start COLLAPSED.
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fav-expanded-sections");
      if (raw) setExpanded(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const toggleSection = (id: string) => {
    setExpanded((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("fav-expanded-sections", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const onList = useMemo(
    () => new Set(listItems(items).filter((i) => !i.checked).map((i) => i.name.toLowerCase())),
    [items],
  );

  // Any Store first, then the 4 defaults in strict order, then user-created shops.
  const sections = useMemo<FavSection[]>(() => {
    const defaults = DEFAULT_SHOP_ORDER
      .map((id) => shops.find((sh) => sh.id === id))
      .filter(Boolean)
      .map((sh) => ({ id: sh!.id, name: sh!.name, color: sh!.color }));
    const extras = shops
      .filter((sh) => !DEFAULT_SHOP_ORDER.includes(sh.id))
      .map((sh) => ({ id: sh.id, name: sh.name, color: sh.color }));
    return [{ id: "any" as StoreId, name: "Any Store" }, ...defaults, ...extras];
  }, [shops]);

  const add = async (f: Item) => {
    if (onList.has(f.name.toLowerCase())) {
      toast(`${f.name} is already on your list`);
      return;
    }
    setJustAdded(f.id);
    await addFavouriteToList(f.id);
    toast.success("Added to shopping list");
    setTimeout(() => setJustAdded((v) => (v === f.id ? null : v)), 900);
  };

  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">View &amp; manage favourites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap <span className="font-medium text-foreground">+</span> to add to your shopping list, or tap an item to edit it.
        </p>
      </PageHeader>

      <div className="mt-7 pb-10">
        {sections.map((sec) => {
          const list = favs.filter((f) => f.preferredStore === sec.id);
          const open = expanded.includes(sec.id);
          return (
            <section
              key={sec.id}
              className={`border-t border-border/40 first:border-t-0 first:pt-0 ${open ? "mt-10 pt-8 first:mt-0" : "mt-4 pt-4 first:mt-0"}`}
            >
              <SectionHeader sec={sec} count={list.length} open={open} onToggle={() => toggleSection(sec.id)} />

              <div
                className="grid overflow-hidden transition-all duration-300 ease-out"
                style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
              >
                <div className="min-h-0">
                  <div className="mt-4 space-y-2.5">
                    {list.length === 0 ? (
                      <p className="rounded-2xl bg-secondary/60 px-4 py-3 text-center text-[13px] text-muted-foreground">
                        No favourites yet
                      </p>
                    ) : (
                      list.map((f) => (
                        <FavManageRow
                          key={f.id}
                          item={f}
                          already={onList.has(f.name.toLowerCase())}
                          flash={justAdded === f.id}
                          onAdd={() => add(f)}
                          onEdit={() => setEditing(f)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <FavEditSheet
          item={editing}
          sections={sections}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function FavManageRow({
  item,
  already,
  flash,
  onAdd,
  onEdit,
}: {
  item: Item;
  already: boolean;
  flash: boolean;
  onAdd: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
        flash ? "border-primary/50 bg-accent" : "border-border bg-card"
      }`}
    >
      <button
        onClick={onAdd}
        disabled={already}
        aria-label={`Add ${item.name} to shopping list`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
          already ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {already || flash ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
        {item.image && (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-xl object-cover"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{item.name}</span>
        {item.isLocked && item.preferredStore !== "any" && (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      </button>
    </div>
  );
}

function SectionHeader({
  sec,
  count,
  open,
  onToggle,
}: {
  sec: FavSection;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const accent = brandColor(sec.id, sec.name, sec.color);
  const bgStyle = sec.id === "any" ? undefined : { background: tint(accent, 0.08) };
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${sec.id === "any" ? "bg-muted/60" : ""}`}
      style={bgStyle}
    >
      {sec.id === "any" ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-[14px] shadow-sm">
          🌍
        </div>
      ) : (
        <StoreLogo storeId={sec.id} storeName={sec.name} color={accent} size={36} radius="50%" />
      )}
      <h2 className="flex-1 text-[17px] font-bold tracking-tight text-foreground">
        {sec.name} <span className="font-semibold text-muted-foreground">({count})</span>
      </h2>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
      />
    </button>
  );
}

function FavEditSheet({
  item,
  sections,
  onClose,
}: {
  item: Item;
  sections: FavSection[];
  onClose: () => void;
}) {
  const updateItem = useShop((s) => s.updateItem);
  const removeFavourite = useShop((s) => s.removeFavourite);
  const [name, setName] = useState(item.name);
  const [store, setStore] = useState<StoreId>(item.preferredStore);
  const [image, setImage] = useState(item.image ?? "");
  const [locked, setLocked] = useState(item.isLocked);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateItem(item.id, {
        name: name.trim(),
        preferredStore: store,
        isLocked: store === "any" ? false : locked,
        image: image.trim() || null,
      });
      toast.success("Favourite updated");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <h3 className="text-lg font-semibold">Edit favourite</h3>

      <label className="mt-4 block text-xs font-medium text-muted-foreground">Item name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none"
        placeholder="Item name"
      />

      <label className="mt-4 block text-xs font-medium text-muted-foreground">Photo</label>
      <div className="mt-1">
        <ProductImageBox image={image} alt={name || "Product"} onCapture={(url) => setImage(url)} />
      </div>



      <label className="mt-4 block text-xs font-medium text-muted-foreground">Move to store</label>
      <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pr-1">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setStore(sec.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm ${
              store === sec.id ? "border-primary/50 bg-accent font-semibold" : "border-border bg-card"
            }`}
          >
            {sec.id === "any" ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs">🌍</span>
            ) : (
              <StoreLogo storeId={sec.id} storeName={sec.name} color={sec.color} size={28} radius="50%" />
            )}
            <span className="min-w-0 flex-1 truncate">{sec.name}</span>
            {store === sec.id && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>

      {store !== "any" && (
        <button
          type="button"
          onClick={() => setLocked((v) => !v)}
          className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
            locked ? "border-primary/40 bg-accent" : "border-transparent bg-secondary"
          }`}
        >
          <span className={`flex items-center gap-2 text-sm ${locked ? "font-semibold text-primary" : "font-medium"}`}>
            {locked && <Lock className="h-3.5 w-3.5" />}
            Lock to store
          </span>
          <span
            role="switch"
            aria-checked={locked}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              locked ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition ${
                locked ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => {
            removeFavourite(item.id);
            toast.success("Favourite deleted");
            onClose();
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-destructive"
          aria-label="Delete favourite"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={onClose} className="flex-1 rounded-full bg-secondary py-3 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}


/* ---------- STORE FAVOURITES (dedicated screen) ---------- */

function StoreFavouritesScreen({ storeId, go }: { storeId: StoreId; go: (s: Screen) => void }) {
  const items = useShop((s) => s.items);
  const removeFavourite = useShop((s) => s.removeFavourite);
  const favs = favouriteItems(items);
  const list = storeId === "any" ? favs : favs.filter((f) => f.preferredStore === storeId);
  const title = storeId === "any" ? "All favourites" : `${storeName(storeId)} favourites`;

  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} to={{ name: "favouritesByShop" }} label="Favourites" />
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "item" : "items"}
        </p>
      </PageHeader>

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
                removeFavourite(f.id);
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




function StoreRow({
  active,
  onClick,
  label,
  count,
  color,
  storeId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
  storeId?: string;
}) {
  return (
    <StoreCard
      id={storeId}
      name={label}
      color={color}
      selected={active}
      onClick={onClick}
      subtitle={`${count} ${count === 1 ? "item" : "items"}`}
    />
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
  useBackClose(true, onClose);
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
  const hasCustomShops = shops.some((s) => !s.isDefault);

  // Premium status is granted server-side only (verified purchase). The client
  // must never write profiles.is_premium — the database rejects it.
  const upgrade = async () => {
    toast("Premium is coming soon — purchases are verified securely on our servers.");
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
      <PageHeader>
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
          Add your own shops — not just supermarkets. Butchers, bakery, local stores, anything you
          like.
        </p>
      </PageHeader>

      <div className="mt-7 space-y-3.5">
        {shops.map((s, i) => (
          <div key={s.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          <StoreCard
            id={s.id}
            name={s.name}
            color={s.color}
            trailing={
            <div className="flex shrink-0 items-center">
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
            }
          />
          </div>
        ))}
      </div>

      {!hasCustomShops && (
        <div className="mt-5 rounded-3xl bg-secondary/70 px-5 py-5 text-center">
          <p className="text-[15px] font-semibold">Only using the big supermarkets?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your own shops to personalise your lists.
          </p>
        </div>
      )}

      <button
        onClick={onAddClick}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-5 text-[16px] font-semibold text-primary-foreground shadow-card transition active:scale-[0.99]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </span>
        Add your own shop
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
  const [color, setColor] = useState(
    (shop?.color ?? SHOP_COLOR_PRESETS[0].value).toLowerCase(),
  );
  useEffect(() => {
    setName(shop?.name ?? "");
    setColor((shop?.color ?? SHOP_COLOR_PRESETS[0].value).toLowerCase());
  }, [shop?.id]);


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
          <div className="mb-3">
            <StoreCard
              name={name || "New shop"}
              id={shop?.id}
              color={color}
              subtitle="Preview"
              showChevron={false}
            />
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-[54px] w-[54px] shrink-0 rounded-full border border-black/10 transition-colors duration-200"
              style={{ background: color }}
            />
            <label className="flex flex-1 items-center justify-between rounded-2xl bg-secondary px-4 py-3 text-sm">
              <span className="text-muted-foreground">Custom colour</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                className="h-8 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0"
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2.5">
            {SHOP_COLOR_PRESETS.map((c) => {
              const selected = color === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value.toLowerCase())}
                  aria-label={c.name}
                  aria-pressed={selected}
                  className={`flex h-12 items-center justify-center rounded-2xl transition ${
                    selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                >
                  {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </button>
              );
            })}
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

function MasterListScreen({ go, onEditDeal, onPreviewImage }: { go: (s: Screen) => void; onEditDeal: (it: Item) => void; onPreviewImage: (src: string) => void }) {
  const items = useShop((s) => s.items);
  const addItem = useShop((s) => s.addItem);
  const toggleCheck = useShop((s) => s.toggleCheck);
  const clearChecked = useShop((s) => s.clearChecked);

  const list = useMemo(() => listItems(items), [items]);
  const remaining = list.filter((i) => !i.checked);
  const checked = list.filter((i) => i.checked);

  const checkout = () => runCheckout(checked, clearChecked, addItem);


  const asText = () => list.map((it) => `${it.checked ? "✓" : "•"} ${it.name}`).join("\n");

  const share = async () => {
    const text = asText();
    if (!text) return;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ title: "Shopping list", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("List copied");
    } catch {
      /* user cancelled */
    }
  };

  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    const rows = list.map((it) => `<li>${it.name}</li>`).join("");
    w.document.write(
      `<html><head><title>Shopping list</title></head><body style="font-family:system-ui;padding:24px"><h1 style="font-size:20px">Shopping list</h1><ul style="font-size:16px;line-height:1.8">${rows}</ul></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="px-6 pt-14">
      <PageHeader>
        <BackHeader go={go} />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold tracking-tight">Shopping list</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {remaining.length} left · {checked.length} in basket
            </p>
          </div>
          <button
            onClick={checkout}
            className="mt-1 shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.97]"
          >
            Checkout
          </button>
        </div>
      </PageHeader>

      <div className="mt-4 flex gap-2">
        <button
          onClick={share}
          className="rounded-full bg-card border border-border px-4 py-2 text-xs font-medium transition active:scale-[0.97]"
        >
          Share list
        </button>
        <button
          onClick={print}
          className="rounded-full bg-card border border-border px-4 py-2 text-xs font-medium transition active:scale-[0.97]"
        >
          Print list
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-card border border-border shadow-card px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">Your list is empty.</p>
          <button
            onClick={() => go({ name: "addItem" })}
            className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Add your first item
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {[...remaining, ...checked].map((it) => (
            <ShoppingRow key={it.id} item={it} onToggle={() => toggleCheck(it.id)} onImageClick={onPreviewImage} />
          ))}
        </ul>
      )}
      <div className="h-8" />
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
  soft,
  badge,
  onImageClick,
}: {
  item: Item;
  onToggle: () => void;
  soft?: boolean;
  badge?: string;
  onImageClick?: (src: string) => void;
}) {
  const image = (item as Item & { image?: string }).image;
  const uncheckedBg = soft ? "bg-[#fdf5f5]" : "bg-[#fdeeee]";
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border border-white/60 px-4 py-3 shadow-card transition-all duration-300 ${
        item.checked ? "bg-[#eaf6ec] opacity-70" : uncheckedBg
      }`}
    >
      <button
        onClick={onToggle}
        aria-label={item.checked ? `Untick ${item.name}` : `Tick off ${item.name}`}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
          item.checked
            ? "border-[#2f6b3f] bg-[#2f6b3f] text-white"
            : "border-border bg-background"
        }`}
      >
        {item.checked && <Check className="h-4 w-4" strokeWidth={3} />}
      </button>

      {image && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick?.(image);
          }}
          aria-label={`View image of ${item.name}`}
          className="shrink-0 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-9 w-9 object-cover"
          />
        </button>
      )}

      <span
        className={`min-w-0 flex-1 truncate text-[15px] font-medium transition-colors ${
          item.checked ? "text-muted-foreground line-through" : ""
        }`}
      >
        {item.name}
      </span>

      {badge && !item.checked && (
        <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
      )}
    </li>
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

  const deal = activeDeal(item);
  const dealHere = deal && viewingStore && deal.store === viewingStore;
  const dealElsewhere = deal && viewingStore && deal.store !== viewingStore;

  return (
    <div className={`flex items-center gap-4 rounded-2xl border border-border px-4 py-4 transition ${dealHere ? "bg-deal-soft" : "bg-card"}`}>
      <button
        onClick={() => toggleCheck(item.id)}

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
            return (
              <div className="flex flex-col items-stretch gap-3">
                {shops.map((sh) => (
                  <StoreTab
                    key={sh.id}
                    id={sh.id}
                    name={sh.name}
                    color={sh.color}
                    selected={store === sh.id}
                    onClick={() => setStore(sh.id)}
                  />
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

/** Soft pastel header tints, one per page. */
export const PAGE_TINTS = {
  home: "#e9f1e6",
  goShopping: "#e4f2e6",
  addItem: "#e5f4ed",
  masterList: "#efeaf9",
  favourites: "#fdf4dc",
  favouritesByShop: "#fdefe6",
  manageShops: "#e7effa",
} as const;

/**
 * Reusable page header. Default treatment is the app-wide navy → white
 * atmospheric gradient (no card edge). Shop-branded screens pass
 * `brand` with a `tint` colour to keep their existing brand identity.
 */
function PageHeader({
  tint: tintColor,
  brand = false,
  children,
  className = "",
}: {
  tint?: string;
  brand?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  if (brand && tintColor) {
    return (
      <div
        className={`-mx-6 -mt-14 mb-2 rounded-b-[2rem] px-6 pb-7 pt-14 sm:px-8 ${className}`}
        style={{ backgroundColor: tintColor }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`page-header-navy -mx-6 -mt-14 mb-2 px-6 pb-16 pt-[max(4rem,calc(env(safe-area-inset-top)+3.5rem))] text-primary-foreground sm:px-8 [&_h1]:text-primary-foreground [&_p]:text-primary-foreground/80 [&_button]:text-primary-foreground/85 ${className}`}
    >
      {children}
    </div>
  );
}



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
  useBackClose(true, onClose);
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

function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useBackClose(!!src, onClose);
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition active:scale-95"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Product preview"
        className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

