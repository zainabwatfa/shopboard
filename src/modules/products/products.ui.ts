// Draws the shop page and reports what the user does there to main.ts.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import type { Product, ProductsHandlers, RawFilters } from "./products.types.ts";

// Raw values of the three controls; products.logic.ts decides what they mean
export function getFilters(): RawFilters {
  return {
    query: getElement("search", HTMLInputElement).value,
    category: getElement("category-filter", HTMLSelectElement).value,
    sortKey: getElement("sort", HTMLSelectElement).value,
  };
}

// index drives the staggered fade-in (CSS reads it as --i)
function createCard(product: Product, index: number): HTMLElement {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = product.category;
  card.style.setProperty("--i", String(index));

  const media = document.createElement("div");
  media.className = "product-media";
  media.append(createImage(product.image, "product-image", 200));

  const body = document.createElement("div");
  body.className = "product-body";

  const category = document.createElement("p");
  category.className = "category";
  category.textContent = product.category;

  const title = document.createElement("h3");
  title.textContent = product.name;

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

// The line above the grid: "Loading…", an error, or the result count
export function renderProductsStatus(message: string): void {
  getElement("product-status", HTMLParagraphElement).textContent = message;
}

// Listeners are added once, here. renderProducts only rebuilds children,
// so one click is always one call, however often the products were redrawn.
export function bindProductEvents(handlers: ProductsHandlers): void {
  getElement("search", HTMLInputElement).addEventListener("input", handlers.onFiltersChange);
  getElement("category-filter", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);
  getElement("sort", HTMLSelectElement).addEventListener("change", handlers.onFiltersChange);

  // One listener on the grid covers every card's button (event delegation).
  // event.target can be any node (or null), so check it is an Element first.
  getElement("product-grid", HTMLDivElement).addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-id]");
    if (button) handlers.onAdd(Number(button.dataset.id));
  });
}
