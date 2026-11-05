// Draws the demo checkout (order summary, empty state, confirmation) and
// reports a valid form submit to main.ts. Nothing is sent: this site is a demo.
import { createImage, formatMoney, getElement } from "../../shared/ui/dom.ts";
import { addStatusButton, renderStatusLine, showStatusButton } from "../../shared/ui/status.ts";
import type { CartLine } from "../cart/cart.types.ts";
import type {
  CheckoutConfirmation,
  CheckoutHandlers,
  CheckoutSummary,
} from "./checkout.types.ts";

// One line of the summary: picture, name, quantity and line total
function createLine({ product, qty, lineTotal }: CartLine): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "checkout-line";

  const name = document.createElement("span");
  name.className = "checkout-line-name";
  name.textContent = product.name;

  const amount = document.createElement("span");
  amount.className = "checkout-line-qty";
  amount.textContent = `Qty ${qty} · ${formatMoney(product.price)} each`;

  const total = document.createElement("span");
  total.className = "checkout-line-total";
  total.textContent = formatMoney(lineTotal);

  row.append(createImage(product.image, "checkout-thumb", 56), name, amount, total);
  return row;
}

function itemsText(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

// The line under the heading: "Loading…", or empty once the page is drawn.
// It hides the "Try again" button.
export function renderCheckoutStatus(message: string): void {
  renderStatusLine("checkout-status", message, "normal");
  showStatusButton("checkout-status", "retry", false);
}

// Loading failed: the message, and the "Try again" button under it
export function renderCheckoutError(message: string): void {
  renderStatusLine("checkout-status", message, "error");
  showStatusButton("checkout-status", "retry", true);
}

// The "Try again" button that renderCheckoutError shows. Call once, before loading.
export function bindCheckoutRetry(onRetry: () => void): void {
  addStatusButton("checkout-status", "retry", "Try again", onRetry);
}

// The form and the order summary, or the empty state when the cart is empty
export function renderCheckout({ lines, count, total }: CheckoutSummary): void {
  renderCheckoutStatus("");
  getElement("checkout-empty", HTMLDivElement).hidden = lines.length > 0;
  getElement("checkout-layout", HTMLDivElement).hidden = lines.length === 0;
  getElement("checkout-lines", HTMLUListElement).replaceChildren(...lines.map(createLine));
  getElement("checkout-items", HTMLSpanElement).textContent = itemsText(count);
  getElement("checkout-total", HTMLElement).textContent = formatMoney(total);
}

// Replaces the form with the confirmation and moves keyboard and screen reader
// focus to its heading, so the result is announced
export function renderCheckoutConfirmation({ heading, summary }: CheckoutConfirmation): void {
  getElement("checkout-form", HTMLFormElement).reset(); // forget what was typed
  getElement("checkout-layout", HTMLDivElement).hidden = true;
  getElement("checkout-empty", HTMLDivElement).hidden = true;

  const title = getElement("done-title", HTMLHeadingElement);
  title.textContent = heading;
  getElement("done-lines", HTMLUListElement).replaceChildren(...summary.lines.map(createLine));
  getElement("done-items", HTMLSpanElement).textContent = itemsText(summary.count);
  getElement("done-total", HTMLElement).textContent = formatMoney(summary.total);
  getElement("checkout-done", HTMLElement).hidden = false;
  title.focus();
}

// FormData.get gives text, a File (for file inputs) or null, so keep only text
function readField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

export function bindCheckoutEvents(handlers: CheckoutHandlers): void {
  const form = getElement("checkout-form", HTMLFormElement);

  // The browser only fires "submit" once every required field is valid
  form.addEventListener("submit", (event) => {
    // Stop the browser from sending the form or reloading the page
    event.preventDefault();
    const data = new FormData(form);
    handlers.onSubmit({
      fullName: readField(data, "fullName"),
      email: readField(data, "email"),
      address: readField(data, "address"),
      city: readField(data, "city"),
      postalCode: readField(data, "postalCode"),
      country: readField(data, "country"),
    });
  });
}
