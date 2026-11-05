// Draws the cart (the header badge on every page, the full cart on the cart page)
// and reports what the user does there to main.ts.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import {
  addStatusButton,
  renderStatusLine,
  showStatusButton,
} from "../../shared/ui/status.ts";
import type {
  CartChange,
  CartHandlers,
  CartLine,
  CartView,
} from "./cart.types.ts";

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
  // Screen readers ignore aria-label on a plain <span>, so "Quantity" is real
  // text, only hidden on screen: they read "Quantity 2", sighted users see "2"
  const amount = document.createElement("span");
  const amountLabel = document.createElement("span");
  amountLabel.className = "visually-hidden";
  amountLabel.textContent = "Quantity ";
  amount.append(amountLabel, String(qty));
  qtyBox.append(
    createCartButton(
      "−",
      "dec",
      product.id,
      `Decrease quantity of ${product.name}`,
    ),
    amount,
    createCartButton(
      "+",
      "inc",
      product.id,
      `Increase quantity of ${product.name}`,
    ),
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

// The line under the heading: "Loading…", or empty once the cart is drawn.
// It hides the "Try again" button.
export function renderCartStatus(message: string): void {
  renderStatusLine("cart-status", message, "normal");
  showStatusButton("cart-status", "retry", false);
}

// Loading failed: the message, and the "Try again" button under it
export function renderCartError(message: string): void {
  renderStatusLine("cart-status", message, "error");
  showStatusButton("cart-status", "retry", true);
}

// The sentence for one change, e.g. "Leather Tote Bag: quantity 2. Cart total $178.00."
function describeChange(
  change: CartChange,
  { count, total }: CartView,
): string {
  const after =
    count === 0 ? "Your cart is empty." : `Cart total ${formatMoney(total)}.`;
  switch (change.type) {
    case "quantity":
      return `${change.name}: quantity ${change.qty}. ${after}`;
    case "removed":
      return `${change.name} removed from your cart. ${after}`;
    case "cleared":
      return "Cart cleared. Your cart is empty.";
  }
}

// Says what just changed (view is the cart after the change) in the hidden
// status line that bindCartEvents adds. Emptied first and filled on the next
// frame, so the same sentence twice in a row is read out again.
export function renderCartChange(change: CartChange, view: CartView): void {
  const announcer = getElement("cart-announcer", HTMLParagraphElement);
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = describeChange(change, view);
  });
}

// Draws the cart page: rows, item count, total, empty message
export function renderCart({ lines, count, total }: CartView): void {
  renderCartStatus("");
  getElement("cart-list", HTMLUListElement).replaceChildren(
    ...lines.map(createCartRow),
  );
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

// The "Try again" button that renderCartError shows. Call once, before loading.
export function bindCartRetry(onRetry: () => void): void {
  addStatusButton("cart-status", "retry", "Try again", onRetry);
}

// Call once, when the cart is drawn for the first time.
export function bindCartEvents(handlers: CartHandlers): void {
  const cartList = getElement("cart-list", HTMLUListElement);
  const cartTitle = getElement("cart-title", HTMLHeadingElement);

  // Screen readers aren't told when a row changes, so renderCartChange also
  // says it in words here. Hidden on screen; role="status" means it is read
  // out politely, after what the user is hearing now. It is added before the
  // first change, because a live region that appears with its text is not read.
  // It goes before the status line: the "Try again" box must stay right after it.
  const announcer = document.createElement("p");
  announcer.id = "cart-announcer";
  announcer.className = "visually-hidden";
  announcer.setAttribute("role", "status");
  getElement("cart-status", HTMLParagraphElement).before(announcer);

  cartList.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(
      "button[data-action]",
    );
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

  // Clearing removes every row at once and can't be undone, so ask first.
  // confirm() is the browser's own dialog: it works with the keyboard and
  // screen readers, and Cancel (or Esc) changes nothing.
  getElement("cart-clear", HTMLButtonElement).addEventListener("click", () => {
    if (!window.confirm("Remove all items from your cart?")) return;
    handlers.onClear();
    cartTitle.focus();
  });
}
