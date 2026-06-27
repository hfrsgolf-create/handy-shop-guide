import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ShopApp } from "@/components/ShopApp";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Trolly — smart shopping lists" },
      { name: "description", content: "A clean, minimal shopping list app that organises items across your favourite stores and tracks the best deals." },
      { property: "og:title", content: "Trolly — smart shopping lists" },
      { property: "og:description", content: "Smart, store-aware shopping lists with live deals." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center bg-background text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" />;
  return <ShopApp />;
}
