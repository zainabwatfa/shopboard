// Which page is open? Each HTML file says so: <body data-page="shop">

export type Page = "home" | "shop" | "cart";

const pages: readonly string[] = ["home", "shop", "cart"];

export function getCurrentPage(): Page {
  const value = document.body.dataset.page ?? "";
  return pages.includes(value) ? (value as Page) : "home";
}
