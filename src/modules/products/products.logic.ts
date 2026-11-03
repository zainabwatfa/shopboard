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
