// Which page is open? Each HTML file says so: <body data-page="shop">
// Also reads values from the address bar, e.g. the id in product.html?id=3.

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
export function parsePage(value: string | undefined): Page | null {
  return value !== undefined && pages.includes(value) ? (value as Page) : null;
}

export function getCurrentPage(): Page | null {
  return parsePage(document.body.dataset.page);
}

// One value from the address bar as plain text, or null when it isn't there:
// getQueryParam("id") gives "3" on product.html?id=3. The caller checks it.
export function getQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}
