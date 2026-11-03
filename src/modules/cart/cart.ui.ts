// Draws the cart (the header badge on every page, the full cart on the cart page)
// and reports what the user does there to main.ts.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import type { CartHandlers, CartLine, CartView } from "./cart.types.ts";

// The number next to "Cart" in the header, on every page
export function renderCartCount(count: number): void {
  getElement("cart-count", HTMLSpanElement).textContent = String(count);
}

type CartAction = "inc" | "dec" | "remove";

function createCartButton(
  text: string,
  action: CartAction,
  id: number,
  label: string,
  extraClass = "",
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `button button-small ${extraClass}`.trim();
  button.type = "button";
  button.textContent = text;
  button.dataset.action = action;
  button.dataset.id = String(id);
  button.setAttribute("aria-label", label);
  return button;
}

function createCartRow({ product, qty, lineTotal }: CartLine): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "cart-item";
  row.dataset.category = product.category;

  const thumb = createImage(product.image, "cart-thumb", 96);

  const name = document.createElement("span");
  name.className = "cart-name";
  name.textContent = product.name;

  const unit = document.createElement("span");
  unit.className = "cart-unit";
  unit.textContent = `${formatMoney(product.price)} each`;

  const qtyBox = document.createElement("div");
  qtyBox.className = "cart-qty";
  const amount = document.createElement("span");
  amount.textContent = String(qty);
  amount.setAttribute("aria-label", `Quantity: ${qty}`);
  qtyBox.append(
    createCartButton("−", "dec", product.id, `Decrease quantity of ${product.name}`),
    amount,
    createCartButton("+", "inc", product.id, `Increase quantity of ${product.name}`),
  );

  const line = document.createElement("span");
  line.className = "cart-line";
  line.textContent = formatMoney(lineTotal);

  const remove = createCartButton(
    "Remove",
    "remove",
    product.id,
    `Remove ${product.name} from cart`,
    "cart-remove",
  );

  row.append(thumb, name, unit, qtyBox, line, remove);
  return row;
}

// The line under the heading: "Loading…" or an error. Empty once the cart is drawn.
export function renderCartStatus(message: string): void {
  getElement("cart-status", HTMLParagraphElement).textContent = message;
}

// Draws the cart page: rows, item count, total, empty message
export function renderCart({ lines, count, total }: CartView): void {
  renderCartStatus("");
  getElement("cart-list", HTMLUListElement).replaceChildren(...lines.map(createCartRow));
  getElement("cart-empty", HTMLDivElement).hidden = lines.length > 0;
  getElement("cart-summary", HTMLElement).hidden = lines.length === 0;
  getElement("cart-items", HTMLSpanElement).textContent =
    count === 1 ? "1 item" : `${count} items`;
  getElement("cart-total", HTMLElement).textContent = formatMoney(total);
}

// A redraw rebuilds the rows and can hide the summary. If the element that had
// keyboard focus is gone or hidden now, focus the same button in the new rows,
// or the cart heading if that row is gone. Does nothing when focus is still fine.
function keepFocus(previous: Element | null): void {
  if (!(previous instanceof HTMLElement)) return;
  if (previous.isConnected && !previous.closest("[hidden]")) return;
  const { action, id } = previous.dataset;
  const same =
    action && id
      ? document.querySelector<HTMLElement>(
          `#cart-list button[data-action="${action}"][data-id="${id}"]`,
        )
      : null;
  (same ?? document.getElementById("cart-title"))?.focus();
}

// The browser fires "storage" in the other open tabs of this site when saved
// data changes. This file doesn't know which data is the cart, so every change
// is reported. Call once, on every page (the header badge is on every page).
export function bindCartSync(onChange: () => void): void {
  const sync = (): void => {
    const focused = document.activeElement;
    onChange();
    keepFocus(focused);
  };
  window.addEventListener("storage", sync);
  // Back or Forward can show this page from the browser's cache, exactly as it
  // was when the user left it, so the cart may have changed since
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) sync();
  });
}

export function bindCartEvents(handlers: CartHandlers): void {
  const cartList = getElement("cart-list", HTMLUListElement);
  const cartTitle = getElement("cart-title", HTMLHeadingElement);

  cartList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "inc") handlers.onIncrease(id);
    if (action === "dec") handlers.onDecrease(id);
    if (action === "remove") handlers.onRemove(id);

    // The rows were rebuilt, so give keyboard focus back to the same button,
    // or to the cart heading if that row is gone
    const same = cartList.querySelector<HTMLButtonElement>(
      `button[data-action="${action}"][data-id="${id}"]`,
    );
    (same ?? cartTitle).focus();
  });

  getElement("cart-clear", HTMLButtonElement).addEventListener("click", () => {
    handlers.onClear();
    cartTitle.focus();
  });
}
