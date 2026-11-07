# Smart Cart

Build a mobile-first shopping list app with a clean, minimal UI inspired by the Cheddar app. The app should focus on simplicity, speed, and smart shopping behaviour.

CORE CONCEPT: Users can create shopping items that are either tied to a preferred store, flexible across stores, or locked to a specific store. The app should intelligently organise items into store-specific lists while maintaining a master list of all items.

KEY FEATURES:

MASTER LIST (ALL ITEMS)

A single list showing every item the user needs

Each item displays:

Name

Preferred store (if any)

Indicator if it is on offer elsewhere

Items can be ticked off and removed

STORE LISTS

Separate lists for each store (e.g. Tesco, Sainsbury’s, Aldi, M&S)

Each store view shows:

“Preferred here” items (items where this is the preferred store)

“Can buy here” items (items preferred at other stores but still visible)

“Any store” items (no preference)

Locked items only appear in their assigned store

ITEM TYPES Each item must support:

preferred_store (nullable)

is_locked (boolean)

Item behaviour:

Preferred store → shows at top of that store list but also appears in others

Locked → only shows in that specific store

No preference → shows in all stores equally

ADD ITEM FLOW

Simple “Add Item” screen with:

Item name input

Store selection (Tesco, Sainsbury’s, Aldi, M&S, or “Any store”)

Toggle: “Lock to this store only”

Optional notes

Default behaviour: preferred but flexible (not locked)

FAVOURITES

Users can mark items as favourites

Quick add from favourites list

SMART DEALS LAYER Users can manually add deals to items:

deal_store

deal_price (optional)

deal_expiry (date)

Behaviour:

Items with deals show a subtle “on offer” indicator

If viewing the store where the deal exists → highlight item

If viewing another store → show subtle note “Cheaper at [store]”

DEALS TAB A dedicated “Deals” screen showing:

All active deals

Sorted by expiry date (soonest first)

Each deal shows:

Item name

Store

Price (if provided)

Expiry

At the top:

“Best store today” section

Calculates which store has the most deals from the user’s list

Tapping it opens that store’s list

Expired deals should automatically disappear.

NOTIFICATIONS (basic simulation)

When a deal is added, show a notification: “Item X is on offer at [store]”

When a deal is close to expiry: “Deal ending soon for Item X”

SHARED ACCOUNT (basic simulation)

Assume a single shared account used across devices

When an item or deal is added, simulate: “Sarah added Milk to the list”

UI / DESIGN REQUIREMENTS

Clean, minimal, modern design (Cheddar-style)

Soft colours, rounded cards, lots of white space

Subtle icons only (no clutter)

Use:

⭐ for preferred

🔥 for deals

🔒 for locked items

Bottom navigation:

Home

Favourites

Lists

Deals

More

HOME SCREEN

Greeting (e.g. “Good morning”)

Summary card: “X items on offer today”

Quick access to:

All items

Store lists

LOGIC RULES

All items appear in Master List

Store views filter items based on preference + lock status

Deals enhance items but do not replace store logic

GOAL: Create a fast, intuitive shopping app that reflects real-life shopping habits: “I usually buy it here, but I’ll grab it elsewhere if it’s cheaper.”

Focus on usability over complexity.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://handy-shop-guide.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad788439-db1c-4a5c-8b02-88185a159bcf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
