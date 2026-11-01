# ShopBoard

A small online shop built with plain HTML, CSS and JavaScript (ES modules) on Vite.
Run it with `npm run dev` and open http://localhost:5173/. Opening `index.html` as a file does not work (module scripts are blocked on `file://`).

## Architecture: five files, one job each

All JavaScript lives in `src/`. `index.html` loads `src/main.js` only. Diagrams are in `ARCHITECTURE.md`.

| File | Its job, in one sentence | May import | Must NOT use |
|---|---|---|---|
| `data.js` | Holds the product list (`id`, `name`, `category`, `price`) and nothing else. | nothing | functions, DOM, `localStorage` |
| `logic.js` | Pure functions that search, filter, sort and calculate cart totals. | nothing | DOM, `localStorage`, changing its inputs |
| `state.js` | Owns the cart `[{ id, qty }]`, changes it and saves/loads it with `localStorage`. | `data.js`, `logic.js` | DOM |
| `ui.js` | The only file that touches the page: reads controls, draws products and cart, reports clicks. | nothing | `localStorage`, search/filter/sort/total logic |
| `main.js` | Connects them: on every event it asks state and logic for values and hands them to ui. | all four | DOM, `localStorage` |

Where a new feature goes: its data in `data.js`, its calculations in `logic.js`, anything saved in `state.js` (or a new `wishlist.js` next to it), its HTML and clicks in `ui.js`, and the wiring in `main.js`.

## Rules

### Mistakes I don't want the AI to make

> DRAFT written by Claude from what went wrong on Day 2. Rewrite these in your own words before you submit.

1. **Never sort the original array.** `sort()` changes the array it runs on. Always sort a copy (`[...list].sort(...)`), so "Default" can bring the original order back.
2. **Never add event listeners inside a render function.** Every render would add another listener, and one click would add several items. Add listeners once, in `bindEvents`.
3. **Save only `{ id, qty }` in `localStorage`.** Not whole product objects, not prices. Prices always come from `data.js`.
4. **A quantity can never be 0 or negative.** Decreasing a quantity of 1 removes the product.
5. **Don't say "it works" without checking it in the browser:** the Console has no red errors, and Application > Local Storage shows what you expect.
6. **Don't invent content or decisions.** If something is not specified (a product name, a file location), ask or say clearly what was assumed.

### Structure rules

1. Put code where its job lives (see the table). If it needs the DOM it goes in `ui.js`; if it needs `localStorage` it goes in `state.js`; if it only transforms data it goes in `logic.js`.
2. `logic.js` functions are pure: everything comes in as arguments, a new value goes out.
3. `ui.js` imports nothing. It gets data as arguments and reports clicks through the handlers `main.js` gives it.
4. Only `state.js` changes the cart. Everyone else calls `addToCart`, `changeQty`, `removeFromCart`, `clearCart`, `getCart`.
5. `localStorage` holds text: `JSON.stringify` before saving, `JSON.parse` inside `try/catch` when loading, then `sanitizeCart`.

### Boundary check (run after any change to `src/`)

```
grep -lE "document|window" src/*.js   # must print only src/ui.js
grep -l "localStorage" src/*.js       # must print only src/state.js
```

Comments count too, so don't write those words in comments of other files.

## Code style

- Semantic HTML first.
- Every input has a label.
- Mobile-first CSS: base styles for phones, `min-width` media queries for larger screens.
- No `!important`.
- Explain every change: what changed, where, and why.
- Plan before coding: for a new feature, say which file each piece goes in before writing it.
