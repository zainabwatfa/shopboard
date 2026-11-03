# ShopBoard

A demo online shop built for a course. It takes no real orders and no payments.

**Live demo:** https://zainabwatfa.github.io/shopboard/

## Features

- **Search** products by name.
- **Filter** by category (Bags, Shoes, Accessories).
- **Sort** by price (low to high, high to low) or name (A to Z). "Default" brings back the original order.
- **Cart saved in your browser** (`localStorage`): change quantities with **+** / **−**, **Remove** a product, or **Clear cart**. The cart count in the header updates as you go.
- **Product pages** (`product.html?id=N`) with the picture, price, Add to cart and "More in <category>"; the shop cards link to them.
- **Toast** after "Add to cart" with a **View cart** button.
- **Demo checkout**: order summary and a delivery form with no payment fields. A valid submit shows a confirmation and empties the cart; nothing is charged or shipped.
- **Store pages**: About, Contact (demo form), FAQ, Shipping & returns, Privacy, Terms, Photo credits and a 404 page. Their content says plainly that this is a demo.
- **Product photos** are free photos from [Pexels](https://www.pexels.com/license/), cropped and converted to WebP; see [CREDITS.md](CREDITS.md).
- **Demo register form** on the home page. Nothing you type is sent or saved.
- **Light and dark themes** with a **System / Light / Dark** switch in the header. System follows the device setting; the choice is saved in the browser and applied before the page is drawn, so it never flashes.

## Tech

- HTML, CSS and TypeScript with `strict` on. No framework.
- [Vite](https://vite.dev/) for the dev server and the build.
- No backend: the product data is a static file, `public/api/products.json`, and the pictures are in `public/products/`.

## Getting started

You need [Node.js](https://nodejs.org/) 22.18 or newer: Vite 8 needs 22.12+, and `npm test` runs the TypeScript test files directly, which needs 22.18+.

```sh
npm install
npm run dev
```

Then open http://localhost:5173/.

Opening `index.html` directly as a file does not work: browsers block module scripts on `file://`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server at http://localhost:5173/. |
| `npm run typecheck` | Runs `tsc` to check the types. It must print nothing. |
| `npm test` | Runs the tests in `tests/` with Node's built-in test runner (no extra packages). |
| `npm run build` | Runs `tsc`, then builds the site into `dist/`. A type error stops the build. |
| `npm run preview` | Serves the built `dist/` locally so you can check it before deploying. |

## Project structure

```
*.html                             the pages (shop, product, cart, checkout, content pages, 404)
src/
├── shared/      code every feature can use (network, toast, page helpers)
├── modules/     one folder per feature, with everything it needs
├── main.ts      starts the app and connects the modules
└── styles.css   styles for every page
public/
├── api/products.json   product data
└── products/           product pictures
```

- [CLAUDE.md](CLAUDE.md) has the rules: what each type of file may do, who may import whom, and the checks to run after a change.
- [ARCHITECTURE.md](ARCHITECTURE.md) has the diagrams of the structure and of how data moves (in Arabic).

## Deployment

The site is hosted on GitHub Pages.

- Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs `npm test` and `npm run build`, then publishes `dist/`. You can also start it by hand from the **Actions** tab.
- Every push and pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml), which runs `npm run typecheck`, `npm test` and `npm run build`.

**One-time setup:** in the GitHub repo, go to **Settings > Pages > Build and deployment > Source** and choose **GitHub Actions**.

GitHub Pages serves the site under `/shopboard/`, not at the root of the domain. It works because `vite.config.ts` sets `base: "./"` and the links written by hand in the HTML and the TypeScript have no leading `/`. Keep it that way when you add a link: write `shop.html`, not `/shop.html`.

## License

[MIT](LICENSE)
