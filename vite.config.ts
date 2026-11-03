import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Turns "./shop.html" into a full file path that works on Windows too
const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// Vite builds only index.html by default. List every page so
// `npm run build` also outputs shop.html and cart.html.
export default defineConfig({
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
