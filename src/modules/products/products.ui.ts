// Draws the shop page and the product page, and reports what the user does
// there to main.ts.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import type {
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
  button.setAttribute("aria-label", `Add ${product.name} to cart`);

  body.append(category, title, price, button);
  card.append(media, body);
  return card;
}

export function renderProducts(list: readonly Product[], totalCount: number): void {
  getElement("product-grid", HTMLDivElement).replaceChildren(...list.map(createCard));
  renderProductsStatus(
    list.length === 0
      ? "No products match your search."
      : `Showing ${list.length} of ${totalCount} products`,
  );
}

// The status line, on the shop page (above the grid) and the product page:
// "Loading…", an error, or the result count
export function renderProductsStatus(message: string): void {
  getElement("product-status", HTMLParagraphElement).textContent = message;
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
  getElement("product-add", HTMLButtonElement).dataset.id = String(product.id);
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
  getElement("search", HTMLInputElement).addEventListener("input", handlers.onFiltersChange);
  getElement("category-filter", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);
  getElement("sort", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);
  bindAddButtons(getElement("product-grid", HTMLDivElement), handlers.onAdd);
}

// Product page: the product's own button (renderProductPage gives it the id)
// and the buttons on the "More in …" cards. Call once.
export function bindProductPageEvents(handlers: ProductPageHandlers): void {
  bindAddButtons(getElement("product-detail", HTMLElement), handlers.onAdd);
  bindAddButtons(getElement("related-grid", HTMLDivElement), handlers.onAdd);
}
