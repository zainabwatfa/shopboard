# ShopBoard: architecture

**The idea:** every feature (module) has its own folder with all of its files. Code that more than one feature needs goes in `shared/`. `main.ts` starts the app and connects the features.

ShopBoard is a demo shop for a course: there are no real orders or payments, and the forms send and save nothing.

```
src/
├── shared/                 code any module can use
│   ├── api/client.ts       fetchJson<T> and ApiError
│   └── ui/
│       ├── toast.ts        showToast()
│       ├── dom.ts          getElement, formatMoney, createImage
│       ├── page.ts         getCurrentPage(), getQueryParam(), getQueryString(), replaceQueryString()
│       └── status.ts       status lines (data-state), "Try again" / "Clear filters" buttons
├── modules/                one folder per feature
│   ├── products/
│   │   ├── products.types.ts   the shape of a product
│   │   ├── products.api.ts     loads the products from api/products.json
│   │   ├── products.logic.ts   search, filter, sort, product ids, checking data
│   │   └── products.ui.ts      product cards, filters, the product page
│   ├── cart/
│   │   ├── cart.types.ts       the shape of a cart item
│   │   ├── cart.state.ts       the cart itself + localStorage + reloadCart
│   │   ├── cart.logic.ts       count, total, cleaning saved data
│   │   └── cart.ui.ts          the cart page and the header badge + bindCartSync
│   ├── checkout/
│   │   ├── checkout.types.ts   CheckoutFormValues and CheckoutHandlers
│   │   ├── checkout.logic.ts   getFirstName and buildConfirmation (pure functions)
│   │   └── checkout.ui.ts      order summary, delivery form, confirmation (demo, no payment)
│   ├── contact/
│   │   ├── contact.types.ts    the shape of ContactHandlers
│   │   └── contact.ui.ts       the contact form (demo): reports the submit to main.ts
│   ├── register/
│   │   ├── register.types.ts   the shape of RegisterHandlers
│   │   └── register.ui.ts      the register form (demo): reports the submit to main.ts
│   └── theme/
│       ├── theme.types.ts      ThemeChoice and ThemeHandlers
│       ├── theme.state.ts      the theme choice + localStorage (plain text, not JSON)
│       ├── theme.logic.ts      parseThemeChoice: checks the value
│       └── theme.ui.ts         the System / Light / Dark switch and <html data-theme>
├── main.ts                 starts the app and connects the modules
└── styles.css              styles for every page
```

The product data is a real JSON file: `public/api/products.json`. The code requests it with the relative path `api/products.json` (no leading `/`; see "Paths" below).

## Each file type has one job

| File         | Its job                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `*.types.ts` | Data shapes only. Nothing in it runs                                                                               |
| `*.api.ts`   | Loads data from the network through `fetchJson`, then checks it                                                    |
| `*.logic.ts` | Pure functions: the same inputs always give the same result, and they never touch the page, storage or the network |
| `*.state.ts` | Saves data that changes (the cart, the theme choice) in `localStorage`                                             |
| `*.ui.ts`    | Draws on the page and reports clicks to `main.ts`                                                                  |
| `shared/`    | Tools that more than one feature needs                                                                             |
| `main.ts`    | Decides **when** everything happens: loads products, wires events, draws                                           |

## Who imports whom

```
                                        main.ts
     ┌─────────────────────┬──────────────┼──────────────┬──────────────┬─────────────┬──────────┐
     ▼                     ▼              ▼              ▼              ▼             ▼          ▼
modules/products ◄── modules/cart   modules/checkout  modules/contact  modules/register  modules/theme  shared/
     │  import type Product    │  import type CartView │              │              │             ▲
     └─────────────────────────┴───────────────────────┴──────────────┴──────────────┴─────────────┘
                                     every module uses shared/
```

1. `main.ts` imports from the modules and from `shared/`.
2. A module imports only from its own folder and from `shared/`.
3. **A module never imports another module's code.** Only `import type` is allowed, e.g. the cart uses the `Product` type and checkout uses cart types. Connecting features is `main.ts`'s job.
4. `shared/` never imports from `modules/`.

## How data flows

**Opening the shop page**

```
main.startShop()
  ─► products.ui: "Loading products…"
  ─► products.api.getProducts()
        ─► shared/api/client.fetchJson("api/products.json")
        ─► products.logic.isProduct   (keeps only valid entries)
  ─► cart.state.keepOnly(ids)         (removes cart items whose product no longer exists)
  ─► products.ui.bindProductEvents + renderProducts
  (if loading fails: ApiError ─► main ─► a clear message instead of "Loading")
```

- Filters live in the URL: on load, `products.logic.parseFilterQuery(page.getQueryString())` fills the controls; every change writes `toFilterQuery(filters)` back with `replaceQueryString` (no extra Back steps). Unknown values fall back to `DEFAULT_FILTERS`.
- Search: `filterProducts` splits the query into words (`getSearchWords`); every word must appear in the name or the category, ignoring case, word order and simple plurals.
- No results: `shared/ui/status` shows **Clear filters** ─► `main.clearFilters` ─► default filters, then the search box gets focus.
- Load error (shop, product, cart, checkout): the status line shows the message with **Try again** ─► `main.loadPage` loads again without a page reload.

**Adding a product**

```
click ─► products.ui ─► main.onAdd
  ─► cart.state.addToCart
        ─► reloadCart                 (reads the saved cart again; another tab may have changed it)
        ─► localStorage
  ─► cart.ui.renderCartCount          (the header badge)
  ─► shared/ui/toast.showToast("… added", { View cart ─► cart.html })
```

**The cart page**

```
main.startCart() ─► load the products (same path as above)
  ─► cart.state.getCart ─► cart.logic.getCartLines / getCartCount / getCartTotal
  ─► cart.ui.renderCart
  ─► cartPageReady = true
click + / − / Remove / Clear ─► cart.ui ─► main ─► cart.state ─► draw again
  ─► cart.ui.renderCartChange   (a polite live region says what changed, e.g. "Silver Watch removed from your cart. Cart total $89.00.")
```

- **Clear cart** asks for confirmation first (`confirm()` in `cart.ui.ts`); `main.onClear` only runs after OK.

**Home page: the register form (demo)**

```
main.startHome()
  ─► register.ui.bindRegisterEvents({ onSubmit })
submit ─► register.ui                 (the browser only fires it when every required field is valid)
  ─► preventDefault                   (nothing is sent, no reload)
  ─► main.onSubmit ─► shared/ui/toast.showToast("Thanks! This is a demo, so nothing was sent or saved.")
  ─► form.reset()
```

The contact form on `contact.html` works the same way through `contact.ui.bindContactEvents`.

**Cart sync across tabs**

```
another tab saves a change ─► the browser fires a "storage" event in the site's other tabs
  ─► cart.ui.bindCartSync ─► main     (bound once, on every page)
  ─► cart.state.reloadCart            (reads the cart from localStorage again)
  ─► if cartPageReady:     refreshCart      (the whole cart page + the header badge)
     if checkoutPageReady: the checkout summary (not after the confirmation is showing)
     otherwise:            refreshCount     (only the header badge)
```

- `cart.ui` doesn't know which key is the cart, so it reports every storage change.
- `bindCartSync` also listens to `pageshow`: when Back or Forward brings the page back from the browser's cache, the same sync runs, because the cart may have changed since.
- Every change in `cart.state` (`addToCart`, `changeQty`, `removeFromCart`, `clearCart`, `keepOnly`) calls `reloadCart` first, so a save never wipes out what another tab saved.
- If the last save failed (`lastSaveFailed`), `reloadCart` does nothing: the copy in memory is newer than the saved one.

**Product page: `product.html?id=N`**

```
main.startProduct()
  ─► shared/ui/page.getQueryParam("id") ─► products.logic.parseProductId   (a whole number, or null)
  ─► null: products.ui.renderProductNotFound()                             (doesn't load the products at all)
  ─► products.api.getProducts ─► findProduct ─► products.logic.getRelatedProducts (up to 4 from the same category)
  ─► products.ui.renderProductPage({ product, related })
Add to cart ─► same as on the shop page (cart.state.addToCart + a toast with View cart)
```

**Checkout (demo, no payment)**

```
main.startCheckout()
  ─► cart.logic ─► checkout.ui.renderCheckout(summary)        (empty cart: a message and a link to the shop)
submit ─► checkout.ui (preventDefault) ─► main.onSubmit(values)
  ─► checkout.logic.buildConfirmation ─► cart.state.clearCart ─► checkout.ui.renderCheckoutConfirmation
```

- `checkout` doesn't import code from `cart`, only `import type`. Connecting them is `main.ts`'s job.
- Once the confirmation is showing (`checkoutPageReady`), cart changes from another tab don't erase it.

**Theme: System / Light / Dark (on every page)**

```
before the page is drawn ─► a small script in <head>   (reads "shopboard-theme" and sets <html data-theme>)
main.startTheme()
  ─► theme.state.getThemeChoice ─► theme.ui.applyTheme + renderThemeChoice
new choice ─► theme.ui.bindThemeEvents ─► main.onChange
  ─► theme.logic.parseThemeChoice ─► theme.state.saveThemeChoice ─► theme.ui.applyTheme
another tab changed the theme, or Back/Forward showed the page (pageshow) ─► theme.ui.bindThemeSync ─► show it again
```

- `data-theme="dark"` or `"light"` overrides the device setting. Without `data-theme` (System) the site follows the device setting.
- The theme is saved as plain text (`"light"` or `"dark"`), and System removes the key. That way the `<head>` script reads it without JSON, and the colours never flash.

## Pages

`main.ts` reads `<body data-page>` and only starts what that page has. A missing or unknown `data-page` starts only the theme and the cart badge.

| Page                                                                                                        | `data-page`                                                           | Started by `main.ts`                 |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `index.html`                                                                                                | `home`                                                                | register form                        |
| `shop.html`                                                                                                 | `shop`                                                                | products, filters, Add to cart       |
| `product.html`                                                                                              | `product`                                                             | one product and "More in <category>" |
| `cart.html`                                                                                                 | `cart`                                                                | the cart                             |
| `checkout.html`                                                                                             | `checkout`                                                            | summary, form, confirmation          |
| `contact.html`                                                                                              | `contact`                                                             | contact form                         |
| `about.html`, `faq.html`, `shipping-returns.html`, `privacy.html`, `terms.html`, `credits.html`, `404.html` | `about`, `faq`, `shipping`, `privacy`, `terms`, `credits`, `notfound` | nothing extra (content only)         |

## Paths: no leading `/`

The site is published on GitHub Pages under `/shopboard/` (https://zainabwatfa.github.io/shopboard/), not at the root of the domain. Any path that starts with `/` points outside the site.

- `vite.config.ts` sets `base: "./"`, so the built files point to each other with relative paths.
- Links and paths we write by hand have no leading `/`: `./`, `shop.html`, `cart.html`, `./#register` in the HTML and the toast, `api/products.json` in `products.api.ts`, `products/x.webp` (or `x.svg`) in `products.json`, `product.html?id=N` and `checkout.html`.
- Exception: the `<script>`, `<link>` and `<img>` paths in the HTML (like `/src/main.ts` and `/favicon.svg`) keep their `/`, because Vite turns them into relative paths at build time.

## Where does a new feature go? (example: wishlist)

A new folder `modules/wishlist/` with only the files it needs:

| Piece                                        | File                |
| -------------------------------------------- | ------------------- |
| The `WishlistItem` type                      | `wishlist.types.ts` |
| Saving in `localStorage`                     | `wishlist.state.ts` |
| Any calculation                              | `wishlist.logic.ts` |
| The heart button and drawing the list        | `wishlist.ui.ts`    |
| Connecting the click to saving, then drawing | `main.ts`           |

If the wishlist and the cart need the same tool, it goes in `shared/`.

A small real example: `modules/register/` has only `register.types.ts` and `register.ui.ts`, because it saves nothing and calculates nothing.

## Boundary check

```
grep -rlE "document|window" src --include=*.ts   # only *.ui.ts and shared/ui/*
grep -rl "localStorage" src --include=*.ts       # only *.state.ts (cart.state.ts, theme.state.ts)
grep -rlE "\bfetch\(" src --include=*.ts         # only shared/api/client.ts
```

## Type check and tests

```
npm run typecheck   # must print nothing
npm test            # Node's built-in test runner, no extra packages
```
