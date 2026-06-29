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
  STORES,
  storeName,
  activeDeal,
  type Item,
  type StoreId,
} from "@/lib/shop-store";
import { useUserShops } from "@/lib/user-shops";

type Screen =
  | { name: "home" }
  | { name: "goShopping" }
  | { name: "store"; storeId: Exclude<StoreId, "any"> }
  | { name: "addItem" }
  | { name: "favourites" }
  | { name: "manageShops" }
  | { name: "masterList" };

export function ShopApp() {
  const { profile } = useAuth();
  const initStore = useShop((s) => s.init);
  const ready = useShop((s) => s.ready);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [editingDealFor, setEditingDealFor] = useState<Item | null>(null);
  const [spinnerExpired, setSpinnerExpired] = useState(false);

  useEffect(() => {
    if (profile) initStore(profile.household_id, profile.name);
  }, [profile?.household_id, profile?.name, initStore]);

  useEffect(() => {
    const t = setTimeout(() => setSpinnerExpired(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const loaded = !!profile && ready;
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

  const actions: { id: Screen["name"]; title: string; sub: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
    { id: "goShopping", title: "Go shopping", sub: "Pick a store and start ticking off", icon: ShoppingBasket, tone: "bg-primary text-primary-foreground" },
    { id: "addItem", title: "Add to list", sub: "Type or pick from favourites", icon: Plus, tone: "bg-card border border-border shadow-card" },
    { id: "favourites", title: "Add favourites", sub: "Save items you buy often", icon: Star, tone: "bg-card border border-border shadow-card" },
    { id: "manageShops", title: "Manage shops", sub: "Reorder or add new stores", icon: StoreIcon, tone: "bg-card border border-border shadow-card" },
    { id: "masterList", title: "View shopping list", sub: "Everything to buy in one place", icon: ListChecks, tone: "bg-card border border-border shadow-card" },
  ];

  return (
    <div className="px-6 pt-16">
      <header>
        <p className="text-sm text-muted-foreground">Hi {firstName},</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
          What do you want to do today?
        </h1>
      </header>

      <div className="mt-8 space-y-3">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => go({ name: a.id } as Screen)}
            className={`flex w-full items-center justify-between rounded-3xl px-6 py-6 text-left transition active:scale-[0.99] ${a.tone}`}
          >
            <div className="min-w-0 pr-3">
              <p className="text-[19px] font-semibold leading-tight">{a.title}</p>
              <p className={`mt-1 text-sm ${a.tone.includes("primary-foreground") ? "opacity-80" : "text-muted-foreground"}`}>
                {a.sub}
              </p>
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              a.tone.includes("primary-foreground") ? "bg-primary-foreground/15" : "bg-secondary"
            }`}>
              <a.icon className="h-5 w-5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- GO SHOPPING ---------- */

function GoShoppingScreen({ go }: { go: (s: Screen) => void }) {
  const { profile } = useAuth();
  const { shops } = useUserShops(profile?.household_id);
  const items = useShop((s) => s.items);

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Where are you shopping?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tap a shop to see what to buy there.</p>

      <div className="mt-8 space-y-3">
        {shops.length === 0 && (
          <div className="rounded-3xl bg-card px-5 py-10 text-center text-sm text-muted-foreground">
            No shops yet.{" "}
            <button onClick={() => go({ name: "manageShops" })} className="font-medium text-primary">
              Add one
            </button>
            .
          </div>
        )}
        {shops.map((id) => {
          const store = STORES.find((s) => s.id === id)!;
          const visible = items.filter((it) => !it.checked && (it.preferredStore === id || (!it.isLocked && it.preferredStore !== "any") || it.preferredStore === "any"));
          const deals = visible.filter((it) => activeDeal(it) && activeDeal(it)!.store === id).length;
          return (
            <button
              key={id}
              onClick={() => go({ name: "store", storeId: id })}
              className="flex w-full items-center gap-4 rounded-3xl bg-card px-5 py-6 text-left transition active:scale-[0.99]"
            >
              <span className="h-14 w-14 shrink-0 rounded-2xl" style={{ backgroundColor: store.color }} />
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
  const store = STORES.find((s) => s.id === storeId)!;

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
      <div className="mt-3 flex items-center gap-4">
        <span className="h-14 w-14 shrink-0 rounded-2xl" style={{ backgroundColor: store.color }} />
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
          <div className="rounded-3xl bg-card px-5 py-8 text-center text-sm text-muted-foreground">
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
            className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left transition active:scale-[0.99]"
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

function FavouritesScreen({ go }: { go: (s: Screen) => void }) {
  const { profile } = useAuth();
  const { shops } = useUserShops(profile?.household_id);
  const items = useShop((s) => s.items);
  const addItem = useShop((s) => s.addItem);
  const toggleFav = useShop((s) => s.toggleFav);
  const removeItem = useShop((s) => s.removeItem);
  const favs = items.filter((i) => i.favorite);

  const [name, setName] = useState("");
  const [store, setStore] = useState<StoreId>("any");
  const [locked, setLocked] = useState(false);

  const submit = async () => {
    const v = name.trim();
    if (!v) return;
    await addItem({
      name: v,
      preferredStore: store,
      isLocked: locked && store !== "any",
      favorite: true,
    });
    toast.success(`Saved ${v} as favourite`);
    setName("");
    setStore("any");
    setLocked(false);
  };

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Favourites</h1>
      <p className="mt-1 text-sm text-muted-foreground">Save items you buy often — they'll suggest as you type.</p>

      <div className="mt-6 space-y-3 rounded-3xl bg-card p-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Semi-skimmed milk"
          className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-wrap gap-2">
          <ChoiceChip selected={store === "any"} onClick={() => setStore("any")}>Any store</ChoiceChip>
          {shops.map((id) => {
            const s = STORES.find((x) => x.id === id)!;
            return (
              <ChoiceChip key={id} selected={store === id} onClick={() => setStore(id)}>
                {s.name}
              </ChoiceChip>
            );
          })}
        </div>

        <button
          onClick={() => setLocked((v) => !v)}
          disabled={store === "any"}
          className="flex w-full items-center justify-between rounded-2xl bg-secondary px-4 py-3 disabled:opacity-50"
        >
          <div className="flex items-center gap-2 text-sm">
            {locked ? <Lock className="h-4 w-4" /> : <span className="text-xs text-muted-foreground">Flexible</span>}
            {locked ? `Locked to ${storeName(store)}` : "Tap to lock to store"}
          </div>
          <div className={`h-6 w-10 rounded-full p-0.5 transition ${locked ? "bg-primary" : "bg-border"}`}>
            <div className={`h-5 w-5 rounded-full bg-background transition ${locked ? "translate-x-4" : ""}`} />
          </div>
        </button>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          Save favourite
        </button>
      </div>

      <h2 className="mt-8 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Your favourites
      </h2>
      <div className="space-y-2 pb-6">
        {favs.length === 0 && (
          <div className="rounded-3xl bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            No favourites yet.
          </div>
        )}
        {favs.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5">
            <Star className="h-4 w-4 fill-favorite text-favorite" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.name}</p>
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

/* ---------- MANAGE SHOPS ---------- */

function ManageShopsScreen({ go }: { go: (s: Screen) => void }) {
  const { profile } = useAuth();
  const { shops, add, remove, move } = useUserShops(profile?.household_id);
  const available = STORES.filter((s) => !shops.includes(s.id));

  return (
    <div className="px-6 pt-14">
      <BackHeader go={go} />
      <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Manage shops</h1>
      <p className="mt-1 text-sm text-muted-foreground">Reorder or add stores you shop at.</p>

      <h2 className="mt-7 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Your shops
      </h2>
      <div className="space-y-2">
        {shops.map((id, i) => {
          const s = STORES.find((x) => x.id === id)!;
          return (
            <div key={id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5">
              <span className="h-9 w-9 shrink-0 rounded-xl" style={{ backgroundColor: s.color }} />
              <p className="min-w-0 flex-1 font-medium">{s.name}</p>
              <button
                onClick={() => move(id, -1)}
                disabled={i === 0}
                className="rounded-full p-2 text-muted-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(id, 1)}
                disabled={i === shops.length - 1}
                className="rounded-full p-2 text-muted-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(id)}
                className="rounded-full p-2 text-muted-foreground"
                aria-label="Remove shop"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Add a shop
          </h2>
          <div className="space-y-2 pb-6">
            {available.map((s) => (
              <button
                key={s.id}
                onClick={() => add(s.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left transition active:scale-[0.99]"
              >
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ backgroundColor: s.color }} />
                <p className="min-w-0 flex-1 font-medium">{s.name}</p>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
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
          <div className="rounded-3xl bg-card px-5 py-10 text-center">
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
              <div key={a.id} className="rounded-2xl bg-card px-4 py-3 text-sm">
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
    <div className={`flex items-center gap-4 rounded-2xl px-4 py-4 transition ${dealHere ? "bg-deal-soft" : "bg-card"}`}>
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
  const fallback = (shops[0] ?? "tesco") as Exclude<StoreId, "any">;
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
          <div className="grid grid-cols-2 gap-2">
            {(shops.length ? shops : STORES.map((s) => s.id)).map((id) => {
              const s = STORES.find((x) => x.id === id)!;
              return (
                <ChoiceChip key={id} selected={store === id} onClick={() => setStore(id)}>
                  {s.name}
                </ChoiceChip>
              );
            })}
          </div>
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

function ChoiceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}

