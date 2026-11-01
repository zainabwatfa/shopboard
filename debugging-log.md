# Debugging log

> Bugs 1-3 were drafted by Claude from what actually happened while building ShopBoard.
> Re-read each one, rewrite it in your own words, and add every bug you hit yourself below them.
> Rule: spend 10 minutes with the Console and breakpoints before asking AI.

## Bug 1

- **What I saw:** The products section was empty. No product cards on the page.
- **Type:** runtime
- **How I found it:** The code looked right. Checked that the Vite dev server returned `index.html` and `src/products.js`, then rendered the page in a real browser: all 12 cards were there. So the code worked, and the problem was how the page was opened.
- **Cause:** The page loads its JavaScript with `<script type="module">`. Browsers block module scripts when a file is opened directly (`file://...`), and Live Server can serve the project from a different folder so `/src/...` is not found. The page then shows no products. (The exact way I had opened it was never confirmed.)
- **Fix:** Always run `npm run dev` inside `shopboard` and open http://localhost:5173/.
- **Did I use AI? For what?** Yes. Claude checked the server and rendered the page in a browser to prove the code worked.

## Bug 2

- **What I saw:** VS Code underlined `status` in `src/products.js` with the hint `'status' is deprecated`.
- **Type:** runtime
- **How I found it:** Editor diagnostic (hint) right after adding the "Showing X of Y products" line.
- **Cause:** `const status = ...` used the same name as the old browser global `window.status`. It worked, but the name is confusing and easy to clash with.
- **Fix:** Renamed the variable to `resultCount`.
- **Did I use AI? For what?** Yes. Claude saw the hint and renamed it.

## Bug 3

- **What I saw:** After splitting the code into modules, the "only `state.js` uses `localStorage`" search also listed `logic.js` and `main.js`.
- **Type:** logic
- **How I found it:** Searching all of `src/` for `localStorage` (the Part 2 check).
- **Cause:** Not real code. The comments at the top of `logic.js` and `main.js` said "no localStorage", and the search counts comments too.
- **Fix:** Reworded those comments ("no saving", "never touches storage"). Added a note to `CLAUDE.md` that comments count in the boundary check.
- **Did I use AI? For what?** Yes. Claude ran the search and fixed the comments.

## Bug 4

- **What I saw:**
- **Type:** runtime / logic / state
- **How I found it:**
- **Cause:**
- **Fix:**
- **Did I use AI? For what?**
