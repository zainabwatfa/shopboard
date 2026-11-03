// Pure functions for products: everything comes in as arguments, a new value
// goes out. No page access, no saving, no network, and inputs are never changed.
import type { CategoryFilter, Product, SortKey } from "./products.types.ts";

const categories: readonly string[] = ["Bags", "Shoes", "Accessories"];
const sortKeys: readonly string[] = ["default", "price-asc", "price-desc", "name-asc"];

// A type guard for data from outside (the API): true only for a well-formed product
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const { id, name, category, price, image } = value as Record<string, unknown>;
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    typeof name === "string" &&
    typeof category === "string" &&
    categories.includes(category) &&
    typeof price === "number" &&
    Number.isFinite(price) && // JSON like 1e999 parses to Infinity
    price >= 0 &&
    typeof image === "string"
  );
}

// The page gives plain text. These turn it into a known value, or a safe default.
export function parseCategory(value: string): CategoryFilter {
  return categories.includes(value) ? (value as CategoryFilter) : "all";
}

export function parseSortKey(value: string): SortKey {
  return sortKeys.includes(value) ? (value as SortKey) : "default";
}

// The id in product.html?id=3 is text from the address bar (null when missing).
// Only digits count, with spaces around them allowed: "3" and " 3 " give 3, while
// "", "abc", "1.5", "-2", "+3", "1e2", "0x10" and numbers too big to be exact give null.
// Whether a product has that id is checked later, with findProduct.
export function parseProductId(value: string | null): number | null {
  if (value === null) return null;
  const text = value.trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

export function findProduct(
  products: readonly Product[],
  id: number,
): Product | undefined {
  return products.find((product) => product.id === id);
}

// Case-insensitive name search + category filter ("all" means no filter)
export function filterProducts(
  products: readonly Product[],
  query: string,
  category: CategoryFilter,
): Product[] {
  const search = query.trim().toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(search) &&
      (category === "all" || product.category === category),
  );
}

// One compare function per sort option. Record<SortKey, ...> makes TypeScript
// complain if a SortKey is missing here. "default" is the id order,
// so picking it again always brings the original order back.
const compareBy: Record<SortKey, (a: Product, b: Product) => number> = {
  default: (a, b) => a.id - b.id,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "name-asc": (a, b) => a.name.localeCompare(b.name),
};

// sort() mutates the array it runs on, so always sort a copy
export function sortProducts(products: readonly Product[], sortKey: SortKey): Product[] {
  return [...products].sort(compareBy[sortKey]);
}

// "More in Bags" on the product page: other products of the same category,
// in id order (like "Default" on the shop page), at most `limit` of them
export function getRelatedProducts(
  products: readonly Product[],
  product: Product,
  limit = 4,
): Product[] {
  if (limit <= 0) return [];
  return products
    .filter((entry) => entry.category === product.category && entry.id !== product.id)
    .sort(compareBy.default) // filter() made a new list, so this sorts that copy
    .slice(0, limit);
}
