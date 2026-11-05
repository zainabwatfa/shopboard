// Which page is open? Each HTML file says so: <body data-page="shop">
// Also reads the address bar (the id in product.html?id=3) and keeps the shop
// filters in it (shop.html?category=Bags).

export type Page =
  | "home"
  | "shop"
  | "cart"
  | "product"
  | "checkout"
  | "contact"
  | "about"
  | "faq"
  | "shipping"
  | "privacy"
  | "terms"
  | "credits"
  | "notfound";

const pages: readonly string[] = [
  "home",
  "shop",
  "cart",
  "product",
  "checkout",
  "contact",
  "about",
  "faq",
  "shipping",
  "privacy",
  "terms",
  "credits",
  "notfound",
];

// The attribute is text from the page, so check it. A missing or unknown value
// gives null, and main.ts then starts only what every page has (theme, cart badge).
// It never falls back to "home", which would look for the register form.
function isPage(value: string): value is Page {
  return pages.includes(value);
}

export function parsePage(value: string | undefined): Page | null {
  return value !== undefined && isPage(value) ? value : null;
}

export function getCurrentPage(): Page | null {
  return parsePage(document.body.dataset.page);
}

// One value from the address bar as plain text, or null when it isn't there:
// getQueryParam("id") gives "3" on product.html?id=3. The caller checks it.
export function getQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

// The whole query part of the address as plain text, e.g. "?category=Bags",
// or "" when there is none. The caller checks it.
export function getQueryString(): string {
  return window.location.search;
}

// Puts `query` ("?category=Bags", or "" for none) in the address bar without
// reloading the page or adding a Back step, so the page as it is now can be
// bookmarked, shared or reloaded. Keeps the path and any #part.
export function replaceQueryString(query: string): void {
  const { pathname, search, hash } = window.location;
  if (search === query) return;
  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}${query}${hash}`,
  );
}
