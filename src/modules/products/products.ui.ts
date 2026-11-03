// Draws the shop page and the product page, and reports what the user does
// there to main.ts.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import { addStatusButton, renderStatusLine, showStatusButton } from "../../shared/ui/status.ts";
import type {
  Filters,
  Product,
  ProductPageHandlers,
  ProductPageView,
  ProductsHandlers,
  RawFilters,
} from "./products.types.ts";

// Raw values of the three controls; products.logic.ts decides what they mean
export function getFilters(): RawFilters {
  return {
    query: getElement("search", HTMLInputElement).value,
    category: getElement("category-filter", HTMLSelectElement).value,
    sortKey: getElement("sort", HTMLSelectElement).value,
  };
}

// Puts checked filters into the three controls: the ones from the address
// bar when the shop opens, or the defaults after "Clear filters"
export function renderFilters({ query, category, sortKey }: Filters): void {
  getElement("search", HTMLInputElement).value = query;
  getElement("category-filter", HTMLSelectElement).value = category;
  getElement("sort", HTMLSelectElement).value = sortKey;
}

// The controls can't do anything while there are no products (loading failed)
export function renderFiltersEnabled(enabled: boolean): void {
  getElement("search", HTMLInputElement).disabled = !enabled;
  getElement("category-filter", HTMLSelectElement).disabled = !enabled;
  getElement("sort", HTMLSelectElement).disabled = !enabled;
}

// No leading "/", so the link also works when the site lives in a sub-folder
function productHref(id: number): string {
  return `product.html?id=${id}`;
}

// index drives the staggered fade-in (CSS reads it as --i).
// The picture and the name both open the product page. The picture's link is
// skipped by the keyboard and screen readers (the picture is decorative), so
// each card has one link to tab to: the name.
function createCard(product: Product, index: number): HTMLElement {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = product.category;
  card.style.setProperty("--i", String(index));

  const media = document.createElement("a");
  media.className = "product-media";
  media.href = productHref(product.id);
  media.tabIndex = -1;
  media.setAttribute("aria-hidden", "true");
  media.append(createImage(product.image, "product-image", 200));

  const body = document.createElement("div");
  body.className = "product-body";

  const category = document.createElement("p");
  category.className = "category";
  category.textContent = product.category;

  const title = document.createElement("h3");
  const link = document.createElement("a");
  link.className = "product-link";
  link.href = productHref(product.id);
  link.textContent = product.name;
  title.append(link);

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = formatMoney(product.price);

  const button = document.createElement("button");
  button.className = "button";
  button.type = "button";
  button.textContent = "Add to cart";
  button.dataset.id = String(product.id);
  // The name starts with the visible words, so "click Add to cart" works in
  // voice control, and screen readers still hear which product it is
  button.setAttribute("aria-label", `Add to cart: ${product.name}`);

  body.append(category, title, price, button);
  card.append(media, body);
  return card;
}

// totalCount is how many products the shop has. When the filters leave none,
// the "Clear filters" button offers the way back (not when the shop has none).
export function renderProducts(list: readonly Product[], totalCount: number): void {
  getElement("product-grid", HTMLDivElement).replaceChildren(...list.map(createCard));
  if (totalCount === 0) {
    renderStatusLine("product-status", "No products are available right now.", "empty");
  } else if (list.length === 0) {
    renderStatusLine("product-status", "No products match your search.", "empty");
  } else {
    renderStatusLine("product-status", `Showing ${list.length} of ${totalCount} products`, "normal");
  }
  showStatusButton("product-status", "clear", totalCount > 0 && list.length === 0);
}

// The status line, on the shop page (above the grid) and the product page:
// "Loading…" or the result count. It hides the "Try again" button.
export function renderProductsStatus(message: string): void {
  renderStatusLine("product-status", message, "normal");
  showStatusButton("product-status", "retry", false);
}

// Loading failed: the message, and the "Try again" button under it
export function renderProductsError(message: string): void {
  renderStatusLine("product-status", message, "error");
  showStatusButton("product-status", "retry", true);
}

// The tab title, and the summary that search engines and link previews read
function setPageInfo(title: string, description: string): void {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta instanceof HTMLMetaElement) meta.content = description;
}

// Product page: the id was missing, not a number, or no product has it
export function renderProductNotFound(): void {
  renderProductsStatus("");
  setPageInfo(
    "Product not found · ShopBoard",
    "This product was not found in ShopBoard, a demo shop built for a course.",
  );
  getElement("product-detail", HTMLElement).hidden = true;
  getElement("related", HTMLElement).hidden = true;
  getElement("product-missing", HTMLDivElement).hidden = false;
}

// Product page: picture, category, name, price, "Add to cart", and
// "More in <category>" cards (the section is hidden when there are none)
export function renderProductPage({ product, related }: ProductPageView): void {
  renderProductsStatus("");
  setPageInfo(
    `${product.name} · ShopBoard`,
    `${product.name} (${product.category}, ${formatMoney(product.price)}) in ShopBoard, a demo shop built for a course. Nothing is really sold.`,
  );
  getElement("product-missing", HTMLDivElement).hidden = true;

  const image = createImage(product.image, "product-image", 480);
  image.loading = "eager"; // the main picture is at the top of the page
  getElement("product-media", HTMLDivElement).replaceChildren(image);
  getElement("product-category", HTMLParagraphElement).textContent = product.category;
  getElement("product-name", HTMLHeadingElement).textContent = product.name;
  getElement("product-price", HTMLParagraphElement).textContent = formatMoney(product.price);
  const add = getElement("product-add", HTMLButtonElement);
  add.dataset.id = String(product.id);
  add.setAttribute("aria-label", `Add to cart: ${product.name}`); // like the cards
  getElement("product-detail", HTMLElement).hidden = false;

  getElement("related-category", HTMLElement).textContent = product.category;
  getElement("related-grid", HTMLDivElement).replaceChildren(...related.map(createCard));
  getElement("related", HTMLElement).hidden = related.length === 0;
}

// One listener on a container covers every "Add to cart" button inside it
// (event delegation), however often its contents are redrawn.
// event.target can be any node (or null), so check it is an Element first.
function bindAddButtons(container: HTMLElement, onAdd: (id: number) => void): void {
  container.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-id]");
    if (button) onAdd(Number(button.dataset.id));
  });
}

// Listeners are added once, here. renderProducts only rebuilds children,
// so one click is always one call, however often the products were redrawn.
export function bindProductEvents(handlers: ProductsHandlers): void {
  const search = getElement("search", HTMLInputElement);
  search.addEventListener("input", handlers.onFiltersChange);
  getElement("category-filter", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);
  getElement("sort", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);
  bindAddButtons(getElement("product-grid", HTMLDivElement), handlers.onAdd);

  // Shown by renderProducts when nothing matches. Afterwards the button is
  // gone, so keyboard focus goes to the search box, ready for a new search.
  addStatusButton("product-status", "clear", "Clear filters", () => {
    handlers.onClearFilters();
    search.focus();
  });
}

// Shop and product page: the "Try again" button that renderProductsError shows.
// Call once, before loading.
export function bindProductsRetry(onRetry: () => void): void {
  addStatusButton("product-status", "retry", "Try again", onRetry);
}

// Product page: the product's own button (renderProductPage gives it the id)
// and the buttons on the "More in …" cards. Call once.
export function bindProductPageEvents(handlers: ProductPageHandlers): void {
  bindAddButtons(getElement("product-detail", HTMLElement), handlers.onAdd);
  bindAddButtons(getElement("related-grid", HTMLDivElement), handlers.onAdd);
}
