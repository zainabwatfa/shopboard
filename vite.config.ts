import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Turns "./shop.html" into a full file path that works on Windows too
const page = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// Vite builds only index.html by default. List every page so
// `npm run build` outputs all of them.
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
        product: page("./product.html"),
        checkout: page("./checkout.html"),
        about: page("./about.html"),
        contact: page("./contact.html"),
        faq: page("./faq.html"),
        shipping: page("./shipping-returns.html"),
        privacy: page("./privacy.html"),
        terms: page("./terms.html"),
        credits: page("./credits.html"),
        notfound: page("./404.html"),
      },
    },
  },
});
