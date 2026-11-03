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

// The same three, checked: what the shop page searches, filters and sorts by.
// Also what the address bar holds: shop.html?q=tote&category=Bags&sort=price-asc
export type Filters = {
  query: string;
  category: CategoryFilter;
  sortKey: SortKey;
};

// What products.ui.ts calls when the user does something on the shop page
export type ProductsHandlers = {
  onFiltersChange: () => void;
  onClearFilters: () => void; // the "Clear filters" button shown when nothing matches
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
