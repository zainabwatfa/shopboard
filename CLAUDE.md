# ShopBoard

A small online shop built with HTML, CSS and TypeScript (ES modules) on Vite.
It is a demo for a course: no real orders or payments, and the register form sends nothing.
Run it with `npm run dev` and open http://localhost:5173/. Opening `index.html` as a file does not work (module scripts are blocked on `file://`).
Live on GitHub Pages: https://zainabwatfa.github.io/shopboard/. `.github/workflows/deploy.yml` builds and publishes it on every push to `main`; `.github/workflows/ci.yml` runs `typecheck` and `build` on every push and pull request.

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
│       └── page.ts         getCurrentPage(), getQueryParam()
├── modules/                one folder per feature, with everything it needs
│   ├── products/
│   │   ├── products.types.ts
│   │   ├── products.api.ts
│   │   ├── products.logic.ts
│   │   └── products.ui.ts
│   ├── cart/
│   │   ├── cart.types.ts
│   │   ├── cart.state.ts
│   │   ├── cart.logic.ts
│   │   └── cart.ui.ts
│   ├── checkout/
│   │   ├── checkout.types.ts
│   │   ├── checkout.logic.ts
│   │   └── checkout.ui.ts
│   ├── contact/
│   │   ├── contact.types.ts
│   │   └── contact.ui.ts
│   ├── register/
│   │   ├── register.types.ts
│   │   └── register.ui.ts
│   └── theme/
│       ├── theme.types.ts
│       ├── theme.state.ts
│       ├── theme.logic.ts
│       └── theme.ui.ts
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
| `*.state.ts` | Owns data that changes and is saved (the cart, the theme choice), with `localStorage`. | DOM, network |
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
| `index.html` | `home` | Hero, features, demo register form (sends nothing: a valid submit shows a toast and resets the form) |
| `shop.html` | `shop` | Search, filter, sort, product cards; after "Add to cart", a toast with a **View cart** button |
| `cart.html` | `cart` | Cart rows (+ / − / Remove), summary with a demo note, **Checkout (demo)**, Clear cart |
| `product.html` | `product` | One product from `?id=N` (picture, category, name, price, Add to cart) and "More in <category>"; a clear message for a missing or unknown id |
| `checkout.html` | `checkout` | Demo checkout: order summary and a delivery form, no payment fields. A valid submit shows a confirmation and clears the cart; nothing is charged or shipped |
| `contact.html` | `contact` | Demo contact form (sends nothing: toast and reset); real questions go to GitHub Issues |
| `about.html` | `about` | What the demo is, how it's built, link to the code |
| `faq.html` | `faq` | Questions about the demo, as `<details>` |
| `shipping-returns.html` | `shipping` | Nothing ships; what a real shop would explain here |
| `privacy.html` | `privacy` | What the site really stores (the two `localStorage` keys) and the third parties (Google Fonts, GitHub Pages) |
| `terms.html` | `terms` | Demo terms: nothing for sale, MIT code, Pexels photos |
| `credits.html` | `credits` | Photo credits for the Pexels photos (also in `CREDITS.md`) |
| `404.html` | `notfound` | Not-found page GitHub Pages shows for a missing URL |

- Every page loads `src/styles.css` and `src/main.ts`. `main.ts` reads `data-page` and only starts what that page has; a missing or unknown `data-page` starts only the theme and the cart badge.
- The site is a demo for a course. Page content must stay true about that: no invented company, address, phone, people or policies presented as real.
- `*.ui.ts` files look elements up inside each function, because each page has different elements.
- Shop, product, cart and checkout pages show "Loading…" while products load, and a clear message if loading fails.
- The header (logo, nav, cart badge, theme switch) is repeated in each HTML file. Change every page together, and move `aria-current="page"` to the right link (pages that aren't in the main nav have none).
- Each HTML `<head>` has a small inline script that reads the saved theme (`shopboard-theme`) and sets `<html data-theme>` before the page is drawn, so it never flashes the wrong theme. It is repeated in each HTML file and must use the same key as `theme.state.ts`. It is the only code outside `src/`.
- The footer (Shop, Help and About links, and "Demo shop for a course: no real orders or payments.") is repeated in each HTML file too. Change every page together.
- A new page must also be added to `vite.config.ts`, or `npm run build` won't include it.

### Paths: no leading `/`

GitHub Pages serves the site under `/shopboard/`, not at the domain root, so a path that starts with `/` points outside the site.

- Links and paths written by hand never start with `/`: `./`, `shop.html`, `cart.html`, `./#register` (HTML links and the toast's **View cart**), `api/products.json` (`products.api.ts`), `products/x.webp` or `products/x.svg` (image paths in `products.json`), `product.html?id=N`, `checkout.html`.
- `vite.config.ts` sets `base: "./"`, so the built files point to each other with relative paths.
- Exception: the `<script>`, `<link>` and `<img>` paths in the HTML (`/src/main.ts`, `/src/styles.css`, `/favicon.svg`, `/products/...`) keep their `/`. Vite rewrites those to relative paths when it builds.

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
3. `*.ui.ts` files get data as arguments and report clicks through the handlers `main.ts` gives them (`ProductsHandlers`, `ProductPageHandlers`, `CartHandlers`, `CheckoutHandlers`, `ContactHandlers`, `RegisterHandlers`, `ThemeHandlers`).
4. Only `cart.state.ts` changes the cart. Everyone else calls `addToCart`, `changeQty`, `removeFromCart`, `clearCart`, `keepOnly`, `getCart`, `reloadCart`.
5. `localStorage` holds text: `JSON.stringify` before saving, `JSON.parse` inside `try/catch` when loading, then `sanitizeCart`. The one exception is the theme: it is saved as plain text (`"light"` or `"dark"`; "system" removes the key) so the `<head>` script can read it without JSON, and `parseThemeChoice` checks whatever comes back.
6. Every network call goes through `fetchJson`, and failures become an `ApiError` that `main.ts` turns into a message for the user.
7. The cart stays in sync across tabs. Every change in `cart.state.ts` calls `reloadCart()` first, so it builds on what another tab saved; if the last save failed (`lastSaveFailed`), `reloadCart()` keeps the cart in memory, because it is newer. `bindCartSync` (`cart.ui.ts`) listens to the browser `storage` event, and to `pageshow` when Back/Forward shows the page from the browser's cache. `main.ts` calls it once on every page: then `reloadCart()`, and redraw the cart page (once `cartPageReady`), the checkout summary (once `checkoutPageReady`, and not after the confirmation is showing), or only the badge.
8. The theme switch (System / Light / Dark) is on every page. `theme.ui.ts` sets `<html data-theme="light|dark">`, or removes it for System; the CSS applies the dark tokens for `data-theme="dark"`, or for the device's dark setting when `data-theme` is not `"light"`. Only `theme.state.ts` saves the choice; `bindThemeSync` brings a choice made in another tab.

### Boundary check (run after any change to `src/`)

```
grep -rlE "document|window" src --include=*.ts   # only *.ui.ts and shared/ui/*
grep -rl "localStorage" src --include=*.ts       # only *.state.ts (cart.state.ts, theme.state.ts)
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
