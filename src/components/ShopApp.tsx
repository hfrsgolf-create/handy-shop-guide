import { useState } from "react";
import { Toaster, toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  Home,
  Star,
  ListChecks,
  Flame,
  MoreHorizontal,
  Plus,
  Check,
  Lock,
  ChevronRight,
  Trash2,
  X,
  Tag,
  ArrowLeft,
  Store as StoreIcon,
} from "lucide-react";
import {
  useShop,
  STORES,
  storeName,
  activeDeal,
  itemsForStore,
  type Item,
  type StoreId,
} from "@/lib/shop-store";

type Tab = "home" | "favs" | "lists" | "deals" | "more";

export function ShopApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [adding, setAdding] = useState(false);
  const [activeStore, setActiveStore] = useState<Exclude<StoreId, "any"> | null>(null);
  const [editingDealFor, setEditingDealFor] = useState<Item | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background text-foreground">
      <Toaster position="top-center" richColors={false} toastOptions={{ className: "rounded-2xl" }} />

      <main className="flex-1 overflow-y-auto pb-28">
        {tab === "home" && (
          <HomeView
            onOpenStore={(s) => {
              setActiveStore(s);
              setTab("lists");
            }}
            onOpenDeals={() => setTab("deals")}
            onOpenMaster={() => {
              setActiveStore(null);
              setTab("lists");
            }}
          />
        )}
        {tab === "favs" && <FavoritesView />}
        {tab === "lists" && (
          <ListsView
            activeStore={activeStore}
            setActiveStore={setActiveStore}
            onEditDeal={setEditingDealFor}
          />
        )}
        {tab === "deals" && (
          <DealsView
            onOpenStore={(s) => {
              setActiveStore(s);
              setTab("lists");
            }}
          />
        )}
        {tab === "more" && <MoreView />}
      </main>

      <button
        onClick={() => setAdding(true)}
        aria-label="Add item"
        className="fixed bottom-24 left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomNav tab={tab} setTab={setTab} />

      {adding && <AddItemSheet onClose={() => setAdding(false)} />}
      {editingDealFor && (
        <DealSheet item={editingDealFor} onClose={() => setEditingDealFor(null)} />
      )}
    </div>
  );
}

/* ---------- HOME ---------- */

function HomeView({
  onOpenStore,
  onOpenDeals,
  onOpenMaster,
}: {
  onOpenStore: (s: Exclude<StoreId, "any">) => void;
  onOpenDeals: () => void;
  onOpenMaster: () => void;
}) {
  const items = useShop((s) => s.items);
  const activity = useShop((s) => s.activity);
  const dealsCount = items.filter((i) => activeDeal(i)).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 px-6 pt-14">
      <header>
        <p className="text-sm text-muted-foreground">{greet}, Sarah</p>
        <h1 className="text-3xl font-semibold tracking-tight">What's on the list?</h1>
      </header>

      <button
        onClick={onOpenDeals}
        className="flex w-full items-center justify-between rounded-3xl bg-deal-soft p-5 text-left transition active:scale-[0.99]"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-deal">Today</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {dealsCount} {dealsCount === 1 ? "item" : "items"} on offer
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Tap to see all deals</p>
        </div>
        <Flame className="h-8 w-8 text-deal" />
      </button>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick access
        </h2>
        <div className="rounded-3xl bg-card">
          <RowButton
            onClick={onOpenMaster}
            left={<ListChecks className="h-5 w-5 text-primary" />}
            title="All items"
            sub={`${items.filter((i) => !i.checked).length} to buy`}
          />
          <Divider />
          {STORES.map((s, i) => {
            const count = items.filter((it) => !it.checked && (it.preferredStore === s.id || (!it.isLocked && it.preferredStore !== "any"))).length;
            return (
              <div key={s.id}>
                <RowButton
                  onClick={() => onOpenStore(s.id)}
                  left={<StoreDot color={s.color} />}
                  title={s.name}
                  sub={`${count} items`}
                />
                {i < STORES.length - 1 && <Divider />}
              </div>
            );
          })}
        </div>
      </section>

      {activity.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent activity
          </h2>
          <div className="space-y-2">
            {activity.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-2xl bg-card px-4 py-3 text-sm">
                <p className="text-foreground">{a.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(a.at, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- LISTS (master + store) ---------- */

function ListsView({
  activeStore,
  setActiveStore,
  onEditDeal,
}: {
  activeStore: Exclude<StoreId, "any"> | null;
  setActiveStore: (s: Exclude<StoreId, "any"> | null) => void;
  onEditDeal: (it: Item) => void;
}) {
  const items = useShop((s) => s.items);

  if (!activeStore) {
    const visible = items.filter((i) => !i.checked);
    return (
      <div className="px-6 pt-14">
        <h1 className="text-3xl font-semibold tracking-tight">Master list</h1>
        <p className="mt-1 text-sm text-muted-foreground">{visible.length} items to buy</p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {STORES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStore(s.id)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium"
            >
              <StoreDot color={s.color} />
              {s.name}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 pb-6">
          {visible.length === 0 && <EmptyState text="Your list is empty. Tap + to add." />}
          {visible.map((it) => (
            <ItemRow key={it.id} item={it} viewingStore={null} onEditDeal={onEditDeal} />
          ))}
        </div>
      </div>
    );
  }

  const store = STORES.find((s) => s.id === activeStore)!;
  const { preferredHere, anyStore, canBuyHere } = itemsForStore(items, activeStore);

  return (
    <div className="px-6 pt-14">
      <button
        onClick={() => setActiveStore(null)}
        className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All lists
      </button>
      <div className="flex items-center gap-3">
        <StoreDot color={store.color} large />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {preferredHere.length + anyStore.length + canBuyHere.length} items available
          </p>
        </div>
      </div>

      <Section title="⭐ Preferred here" items={preferredHere} viewingStore={activeStore} onEditDeal={onEditDeal} />
      <Section title="Any store" items={anyStore} viewingStore={activeStore} onEditDeal={onEditDeal} />
      <Section title="Can buy here" items={canBuyHere} viewingStore={activeStore} onEditDeal={onEditDeal} muted />
    </div>
  );
}

function Section({
  title,
  items,
  viewingStore,
  onEditDeal,
  muted,
}: {
  title: string;
  items: Item[];
  viewingStore: Exclude<StoreId, "any"> | null;
  onEditDeal: (it: Item) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((it) => (
          <ItemRow key={it.id} item={it} viewingStore={viewingStore} onEditDeal={onEditDeal} />
        ))}
      </div>
    </section>
  );
}

/* ---------- FAVORITES ---------- */

function FavoritesView() {
  const items = useShop((s) => s.items);
  const favs = items.filter((i) => i.favorite);
  const quickAdd = useShop((s) => s.quickAddFromFavorite);
  return (
    <div className="px-6 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">Favourites</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tap to add back to your list</p>
      <div className="mt-6 space-y-1.5 pb-6">
        {favs.length === 0 && <EmptyState text="Star items to save them here." />}
        {favs.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <Star className="h-4 w-4 fill-favorite text-favorite" />
              <div>
                <p className="font-medium text-foreground">{it.name}</p>
                <p className="text-xs text-muted-foreground">{storeName(it.preferredStore)}</p>
              </div>
            </div>
            {it.checked ? (
              <button
                onClick={() => {
                  quickAdd(it.id);
                  toast.success(`Added ${it.name}`);
                }}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Add
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">On list</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- DEALS ---------- */

function DealsView({ onOpenStore }: { onOpenStore: (s: Exclude<StoreId, "any">) => void }) {
  const items = useShop((s) => s.items);
  const withDeals = items
    .filter((i) => activeDeal(i))
    .sort((a, b) => new Date(a.deal!.expiry).getTime() - new Date(b.deal!.expiry).getTime());

  // best store today
  const counts = new Map<Exclude<StoreId, "any">, number>();
  withDeals.forEach((it) => {
    const s = it.deal!.store;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  });
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="px-6 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">Deals</h1>
      <p className="mt-1 text-sm text-muted-foreground">Active offers across your list</p>

      {best && (
        <button
          onClick={() => onOpenStore(best[0])}
          className="mt-5 flex w-full items-center justify-between rounded-3xl bg-deal p-5 text-left text-deal-foreground transition active:scale-[0.99]"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Best store today</p>
            <p className="mt-1 text-2xl font-semibold">{storeName(best[0])}</p>
            <p className="mt-1 text-sm opacity-90">{best[1]} of your items on offer</p>
          </div>
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="mt-6 space-y-1.5 pb-6">
        {withDeals.length === 0 && <EmptyState text="No active deals. Add one from any item." />}
        {withDeals.map((it) => {
          const d = it.deal!;
          const days = Math.ceil((new Date(d.expiry).getTime() - Date.now()) / 86400000);
          const soon = days <= 2;
          return (
            <div key={it.id} className="flex items-center justify-between rounded-2xl bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  {storeName(d.store)}
                  {d.price ? ` · £${d.price.toFixed(2)}` : ""}
                </p>
              </div>
              <div className="ml-3 flex flex-col items-end">
                <span className={`flex items-center gap-1 text-xs font-medium ${soon ? "text-deal" : "text-muted-foreground"}`}>
                  <Flame className="h-3 w-3" />
                  {days <= 0 ? "today" : `${days}d left`}
                </span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(d.expiry), "d MMM")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- MORE ---------- */

function MoreView() {
  const clear = useShop((s) => s.clearChecked);
  const items = useShop((s) => s.items);
  const activity = useShop((s) => s.activity);
  return (
    <div className="px-6 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">More</h1>
      <div className="mt-5 rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">Shared account</p>
        <p className="mt-1 font-medium">The Henderson household</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Sarah, Tom · 2 devices</p>
      </div>
      <div className="mt-3 rounded-3xl bg-card p-5">
        <p className="text-sm text-muted-foreground">Stats</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Stat label="Items" value={items.length} />
          <Stat label="Checked" value={items.filter((i) => i.checked).length} />
        </div>
        <button
          onClick={() => {
            clear();
            toast.success("Cleared checked items");
          }}
          className="mt-4 w-full rounded-full bg-secondary py-2.5 text-sm font-medium text-secondary-foreground"
        >
          Clear checked items
        </button>
      </div>

      {activity.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activity feed
          </h2>
          <div className="space-y-1.5 pb-6">
            {activity.map((a) => (
              <div key={a.id} className="rounded-2xl bg-card px-4 py-3 text-sm">
                <p>{a.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(a.at, { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary px-4 py-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
  const toggleFav = useShop((s) => s.toggleFav);

  const deal = activeDeal(item);
  const dealHere = deal && viewingStore && deal.store === viewingStore;
  const dealElsewhere = deal && viewingStore && deal.store !== viewingStore;

  return (
    <div
      className={`group flex items-center gap-4 rounded-2xl px-4 py-4 transition ${
        dealHere ? "bg-deal-soft" : "bg-card"
      }`}
    >
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

      <button
        onClick={() => onEditDeal(item)}
        className="min-w-0 flex-1 text-left"
        aria-label="Edit deal"
      >
        <div className="flex items-center gap-1.5">
          <p className={`truncate text-[15px] font-medium ${item.checked ? "text-muted-foreground line-through" : ""}`}>
            {item.name}
          </p>
          {item.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {item.preferredStore !== "any" ? (
            <span>{storeName(item.preferredStore)}</span>
          ) : (
            <span>Any store</span>
          )}
          {dealElsewhere && (
            <span className="text-deal">· Cheaper at {storeName(deal!.store)}</span>
          )}
          {dealHere && (
            <span className="font-medium text-deal">· On offer{deal!.price ? ` £${deal!.price.toFixed(2)}` : ""}</span>
          )}
          {deal && !viewingStore && <span className="text-deal">· On offer</span>}
        </div>
      </button>

      <button
        onClick={() => toggleFav(item.id)}
        aria-label="Favourite"
        className="p-1 text-muted-foreground"
      >
        <Star className={`h-4 w-4 ${item.favorite ? "fill-favorite text-favorite" : ""}`} />
      </button>
    </div>
  );
}


/* ---------- ADD ITEM SHEET ---------- */

function AddItemSheet({ onClose }: { onClose: () => void }) {
  const addItem = useShop((s) => s.addItem);
  const [name, setName] = useState("");
  const [store, setStore] = useState<StoreId>("any");
  const [locked, setLocked] = useState(false);
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    addItem({ name, preferredStore: store, isLocked: locked && store !== "any", notes });
    toast.success(`Added ${name.trim()}`);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Add item">
      <div className="space-y-5">
        <Field label="Item">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bananas"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Store preference">
          <div className="grid grid-cols-3 gap-2">
            <ChoiceChip selected={store === "any"} onClick={() => setStore("any")}>Any</ChoiceChip>
            {STORES.map((s) => (
              <ChoiceChip key={s.id} selected={store === s.id} onClick={() => setStore(s.id)}>
                {s.name}
              </ChoiceChip>
            ))}
          </div>
        </Field>

        {store !== "any" && (
          <button
            onClick={() => setLocked((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl bg-secondary px-4 py-3"
          >
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4" />
              Lock to {storeName(store)} only
            </div>
            <div className={`h-6 w-10 rounded-full p-0.5 transition ${locked ? "bg-primary" : "bg-border"}`}>
              <div className={`h-5 w-5 rounded-full bg-background transition ${locked ? "translate-x-4" : ""}`} />
            </div>
          </button>
        )}

        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Brand, size…"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full rounded-full bg-primary py-3.5 text-base font-medium text-primary-foreground shadow-soft disabled:opacity-50"
        >
          Add to list
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- DEAL SHEET ---------- */

function DealSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const setDeal = useShop((s) => s.setDeal);
  const existing = item.deal;
  const [store, setStore] = useState<Exclude<StoreId, "any">>(
    (existing?.store as Exclude<StoreId, "any">) ?? (item.preferredStore !== "any" ? (item.preferredStore as Exclude<StoreId, "any">) : "tesco")
  );
  const [price, setPrice] = useState(existing?.price?.toString() ?? "");
  const [expiry, setExpiry] = useState(
    existing?.expiry?.slice(0, 10) ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
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
            {STORES.map((s) => (
              <ChoiceChip key={s.id} selected={store === s.id} onClick={() => setStore(s.id)}>
                {s.name}
              </ChoiceChip>
            ))}
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
              <Trash2 className="mr-1 inline h-4 w-4" /> Remove
            </button>
          )}
          <button
            onClick={submit}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
          >
            Save deal
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------- PRIMITIVES ---------- */

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
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

function RowButton({
  onClick,
  left,
  title,
  sub,
}: {
  onClick: () => void;
  left: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-5 py-4 text-left">
      <div className="flex h-9 w-9 items-center justify-center">{left}</div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function Divider() {
  return <div className="ml-[68px] h-px bg-border" />;
}

function StoreDot({ color, large }: { color: string; large?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full ${large ? "h-10 w-10" : "h-3 w-3"}`}
      style={{ backgroundColor: color }}
    />
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-card px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/* ---------- BOTTOM NAV ---------- */

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "favs", label: "Favourites", icon: Star },
    { id: "lists", label: "Lists", icon: ListChecks },
    { id: "deals", label: "Deals", icon: Flame },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 px-2 pb-5 pt-2 backdrop-blur">
      <div className="flex items-center justify-around">
        {items.map((it) => {
          const active = tab === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
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
