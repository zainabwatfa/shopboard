import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Turns "./shop.html" into a full file path that works on Windows too
const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// Vite builds only index.html by default. List every page so
// `npm run build` also outputs shop.html and cart.html.
export default defineConfig({
  // "./" makes the built files point to each other with relative paths, so
  // the site works at any address: GitHub Pages serves it under /shopboard/.
  // Links written by hand (in the HTML and the TypeScript) have no leading "/"
  // for the same reason.
  base: "./",
  build: {
    rollupOptions: {
      input: {
        home: page("./index.html"),
        shop: page("./shop.html"),
        cart: page("./cart.html"),
      },
    },
  },
});
