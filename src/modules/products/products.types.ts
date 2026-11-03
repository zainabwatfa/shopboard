// The shapes of the products feature. Types only: nothing here runs.

export type Category = "Bags" | "Shoes" | "Accessories";

export type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  image: string; // path inside public/, no leading "/", e.g. "products/sunglasses.webp"
};

export type SortKey = "default" | "price-asc" | "price-desc" | "name-asc";

// The category select also has "all", which means no filter
export type CategoryFilter = Category | "all";

// The three controls exactly as the page gives them: plain text
export type RawFilters = {
  query: string;
  category: string;
  sortKey: string;
};

// What products.ui.ts calls when the user does something on the shop page
export type ProductsHandlers = {
  onFiltersChange: () => void;
  onAdd: (id: number) => void;
};

// What the product page shows: one product, and others from its category
export type ProductPageView = {
  product: Product;
  related: Product[];
};

// What products.ui.ts calls when the user does something on the product page
// (its own "Add to cart" button, or one on a "More in …" card)
export type ProductPageHandlers = {
  onAdd: (id: number) => void;
};
