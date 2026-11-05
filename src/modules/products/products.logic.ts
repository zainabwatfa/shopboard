// Pure functions for products: everything comes in as arguments, a new value
// goes out. No page access, no saving, no network, and inputs are never changed.
import type {
  Category,
  CategoryFilter,
  Filters,
  Product,
  RawFilters,
  SortKey,
} from "./products.types.ts";

// Typed lists, so TypeScript checks that every entry is a real Category / SortKey
const categories: readonly Category[] = ["Bags", "Shoes", "Accessories"];
const sortKeys: readonly SortKey[] = ["default", "price-asc", "price-desc", "name-asc"];

// Type guards: text from outside becomes a Category / SortKey only after this check
function isCategory(value: unknown): value is Category {
  return categories.some((category) => category === value);
}

function isSortKey(value: unknown): value is SortKey {
  return sortKeys.some((key) => key === value);
}

// A type guard for data from outside (the API): true only for a well-formed product
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  // `in` checks prove each field exists, so TypeScript allows reading them (as unknown)
  if (
    !("id" in value) ||
    !("name" in value) ||
    !("category" in value) ||
    !("price" in value) ||
    !("image" in value)
  ) {
    return false;
  }
  const { id, name, category, price, image } = value;
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    typeof name === "string" &&
    isCategory(category) &&
    typeof price === "number" &&
    Number.isFinite(price) && // JSON like 1e999 parses to Infinity
    price >= 0 &&
    typeof image === "string"
  );
}

// The page gives plain text. These turn it into a known value, or a safe default.
export function parseCategory(value: string): CategoryFilter {
  return isCategory(value) ? value : "all";
}

export function parseSortKey(value: string): SortKey {
  return isSortKey(value) ? value : "default";
}

// The shop with no search, every category, in the default order. Frozen, so
// nobody can change it by accident.
export const DEFAULT_FILTERS: Readonly<Filters> = Object.freeze({
  query: "",
  category: "all",
  sortKey: "default",
});

// The three controls as the page gives them, checked: an unknown category or
// sort gives the default. The search text stays as typed (filterProducts reads it).
export function parseFilters(raw: RawFilters): Filters {
  return {
    query: raw.query,
    category: parseCategory(raw.category),
    sortKey: parseSortKey(raw.sortKey),
  };
}

// The query part of the address, e.g. "?q=tote&category=Bags&sort=price-asc",
// as filters. It is text anyone can type or edit, so a missing or unknown value
// gives the default, and an old or broken link still opens the shop.
// Spaces around the search text are dropped.
export function parseFilterQuery(search: string): Filters {
  const params = new URLSearchParams(search);
  return parseFilters({
    query: (params.get("q") ?? "").trim(),
    category: params.get("category") ?? "",
    sortKey: params.get("sort") ?? "",
  });
}

// The other way round: filters as the query part of the address. Defaults are
// left out, so the plain shop is just "" (shop.html), and the order is always
// q, category, sort. parseFilterQuery reads it back to the same filters.
export function toFilterQuery(filters: Filters): string {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  if (query !== "") params.set("q", query);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.sortKey !== "default") params.set("sort", filters.sortKey);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
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

// The words of a search in lower case, without the spaces:
// "  Leather   BAG " gives ["leather", "bag"], and "   " gives [].
export function getSearchWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word !== "");
}

// One English word without its plural ending, so "bags" can find "Bag",
// "watches" "Watch" and "accessory" "Accessories". Only the common endings:
// "-ies" → "-y", "-sses/-shes/-ches/-xes" lose "-es", other "-s" (not "-ss")
// lose "-s". Words of 3 letters or fewer stay as they are ("bus").
function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// True when every search word is in the product's name or category. A word can
// be part of a longer one, so "lea" already finds "Leather" while typing, and a
// plural or singular finds the other ("shoe" ↔ "Shoes", "wallets" → "Wallet").
function matchesSearch(product: Product, words: readonly string[]): boolean {
  const productWords = getSearchWords(`${product.name} ${product.category}`);
  const text = productWords.join(" ");
  const singularText = productWords.map(singular).join(" ");
  return words.every(
    (word) => text.includes(word) || singularText.includes(singular(word)),
  );
}

// Search + category filter ("all" means no filter). The search ignores case,
// extra spaces and word order: "leather bag", "Bag  LEATHER" and "bags leather"
// all find "Leather Tote Bag", and "accessories" finds that whole category.
// An empty search keeps every product.
export function filterProducts(
  products: readonly Product[],
  query: string,
  category: CategoryFilter,
): Product[] {
  const words = getSearchWords(query);
  return products.filter(
    (product) =>
      (category === "all" || product.category === category) &&
      matchesSearch(product, words),
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
