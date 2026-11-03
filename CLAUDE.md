# ShopBoard

A small online shop built with HTML, CSS and TypeScript (ES modules) on Vite.
Run it with `npm run dev` and open http://localhost:5173/. Opening `index.html` as a file does not work (module scripts are blocked on `file://`).

## TypeScript

- Vite only strips the types when it runs the app; it does not check them. Run `npm run typecheck` (`tsc`) after every change. It must print nothing.
- `npm run build` runs `tsc` first, so a type error stops the build.
- `strict` is on. Don't silence errors with `any`, `@ts-ignore` or `!`. Fix the cause.
- Prefer checking over casting: use `instanceof`, `typeof` or a type guard instead of `as`. `as` is allowed only right after a check proves it (see `parseSortKey`).
- Data that comes from outside the code (the API, `JSON.parse`, the page) is `unknown` or `string` until it is checked (see `isProduct`, `sanitizeCart`).
- Import types with `import type`.

## Architecture: each module owns its files

All code lives in `src/`. Diagrams are in `ARCHITECTURE.md`.

```
src/
├── shared/                 code every module can use
│   ├── api/client.ts       fetchJson<T>, ApiError
│   └── ui/
│       ├── toast.ts        showToast()
│       ├── dom.ts          getElement, formatMoney, createImage
│       └── page.ts         getCurrentPage()
├── modules/                one folder per feature, with everything it needs
│   ├── products/
│   │   ├── products.types.ts
│   │   ├── products.api.ts
│   │   ├── products.logic.ts
│   │   └── products.ui.ts
│   └── cart/
│       ├── cart.types.ts
│       ├── cart.state.ts
│       ├── cart.logic.ts
│       └── cart.ui.ts
├── main.ts                 starts the app, connects the modules
└── styles.css              styles for every page
```

Product data is served as JSON from `public/api/products.json`; pictures live in `public/products/`.

### One job per file type

| File | Its job | Must NOT use |
|---|---|---|
| `*.types.ts` | The shapes of that feature's data. Types only, nothing runs. | any runtime code |
| `*.api.ts` | Loads that feature's data through `fetchJson`, then checks it. | DOM, `localStorage`, calling `fetch` directly |
| `*.logic.ts` | Pure functions: search, filter, sort, totals, checking data. | DOM, `localStorage`, network, changing its inputs |
| `*.state.ts` | Owns data that changes and is saved (the cart), with `localStorage`. | DOM, network |
| `*.ui.ts` | Draws that feature on the page and reports clicks through handlers. | `localStorage`, network, logic |
| `shared/api/client.ts` | The only file that talks to the network. | DOM, `localStorage` |
| `shared/ui/*` | Page helpers any module can use. The only DOM code outside `*.ui.ts`. | `localStorage`, network |
| `main.ts` | Decides *when* things happen: loads products, wires handlers, calls render. | DOM, `localStorage`, network |

### Who may import whom

1. `main.ts` imports from modules and `shared/`. Nothing imports `main.ts`.
2. A module imports from its own folder and from `shared/`.
3. A module never imports another module's code. Only `import type` across modules is allowed (cart uses the `Product` type). `main.ts` is what connects modules.
4. `shared/` never imports from `modules/`.

### Where a new feature goes

Make a new folder: `modules/wishlist/` with `wishlist.types.ts`, `wishlist.state.ts`, `wishlist.logic.ts`, `wishlist.ui.ts` (only the files it needs), then connect it in `main.ts`. If two modules need the same helper, it goes in `shared/`.

### Pages

| Page | `<body data-page>` | What it shows |
|---|---|---|
| `index.html` | `home` | Hero, features, register form |
| `shop.html` | `shop` | Search, filter, sort, product cards; after "Add to cart", a toast with a **View cart** button |
| `cart.html` | `cart` | Cart rows (+ / − / Remove), summary, Clear cart |

- Every page loads `src/styles.css` and `src/main.ts`. `main.ts` reads `data-page` and only starts what that page has.
- `*.ui.ts` files look elements up inside each function, because each page has different elements.
- Shop and cart pages show "Loading…" while products load, and a clear message if loading fails.
- The header (logo, nav, cart badge) is repeated in each HTML file. Change all three together, and move `aria-current="page"` to the right link.
- A new page must also be added to `vite.config.ts`, or `npm run build` won't include it.

## Rules

### Mistakes I don't want the AI to make

> DRAFT written by Claude from what went wrong on Day 2. Rewrite these in your own words before you submit.

1. **Never sort the original array.** `sort()` changes the array it runs on. Always sort a copy (`[...list].sort(...)`), so "Default" can bring the original order back.
2. **Never add event listeners inside a render function.** Every render would add another listener, and one click would add several items. Add listeners once, in the `bind...Events` functions.
3. **Save only `{ id, qty }` in `localStorage`.** Not whole product objects, not prices. Prices always come from the product data.
4. **A quantity can never be 0 or negative.** Decreasing a quantity of 1 removes the product.
5. **Don't say "it works" without checking it in the browser:** the Console has no red errors, and Application > Local Storage shows what you expect.
6. **Don't invent content or decisions.** If something is not specified (a product name, a file location), ask or say clearly what was assumed.

### Structure rules

1. Put code where its job lives (see the tables above).
2. `*.logic.ts` functions are pure: everything comes in as arguments, a new value goes out.
3. `*.ui.ts` files get data as arguments and report clicks through the handlers `main.ts` gives them (`ProductsHandlers`, `CartHandlers`).
4. Only `cart.state.ts` changes the cart. Everyone else calls `addToCart`, `changeQty`, `removeFromCart`, `clearCart`, `keepOnly`, `getCart`.
5. `localStorage` holds text: `JSON.stringify` before saving, `JSON.parse` inside `try/catch` when loading, then `sanitizeCart`.
6. Every network call goes through `fetchJson`, and failures become an `ApiError` that `main.ts` turns into a message for the user.

### Boundary check (run after any change to `src/`)

```
grep -rlE "document|window" src --include=*.ts   # only *.ui.ts and shared/ui/*
grep -rl "localStorage" src --include=*.ts       # only src/modules/cart/cart.state.ts
grep -rlE "\bfetch\(" src --include=*.ts         # only src/shared/api/client.ts
```

Comments count too, so don't write those words in comments of other files.

## Code style

- Semantic HTML first.
- Every input has a label.
- Mobile-first CSS: base styles for phones, `min-width` media queries for larger screens.
- No `!important`.
- Explain every change: what changed, where, and why.
- Plan before coding: for a new feature, say which file each piece goes in before writing it.
