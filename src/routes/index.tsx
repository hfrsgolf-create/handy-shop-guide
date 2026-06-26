import { createFileRoute } from "@tanstack/react-router";
import { ShopApp } from "@/components/ShopApp";

export const Route = createFileRoute("/")({
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
  return <ShopApp />;
}
