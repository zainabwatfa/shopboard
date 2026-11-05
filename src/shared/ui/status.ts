// A page's status line (the <p> under the heading that says "Loading…", an
// error or the result count), and a small button right under it for the next
// step: "Try again" after the products failed to load, "Clear filters" when
// nothing matches. A module's ui file adds its buttons once, in a bind…
// function (so each button has exactly one listener), then shows or hides them.
import { getElement } from "./dom.ts";

// "error" and "empty" are drawn as a card by the CSS (through data-state);
// "normal" is the quiet line ("Loading…", "Showing 3 of 13 products").
export type StatusState = "normal" | "error" | "empty";

// The visible <h1> of the page (the product page has a hidden "not found" one)
function focusPageHeading(): void {
  const heading = Array.from(
    document.querySelectorAll<HTMLElement>("main h1"),
  ).find((element) => !element.closest("[hidden]"));
  if (!heading) return;
  if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
  heading.focus();
}

// Writes the status line <p id={statusId}>. It is a live region in the HTML,
// so screen readers read the new text.
// The line only has keyboard focus after its button disappeared (see
// showStatusButton). Emptied, it has nothing left to say, so once the page is
// drawn, focus moves on to the page's heading ("Your cart" after Try again).
export function renderStatusLine(
  statusId: string,
  message: string,
  state: StatusState,
): void {
  const status = getElement(statusId, HTMLParagraphElement);
  status.textContent = message;
  if (state === "normal") {
    delete status.dataset.state;
  } else {
    status.dataset.state = state;
  }
  if (message === "" && document.activeElement === status) {
    requestAnimationFrame(() => {
      if (document.activeElement === status && status.textContent === "")
        focusPageHeading();
    });
  }
}

// The id of the box around one button, e.g. "product-status-retry".
// The CSS relies on these ids ending in "-retry" or "-clear", and on the box
// being right after the status line.
function boxId(statusId: string, key: "retry" | "clear"): string {
  return `${statusId}-${key}`;
}

// Puts a hidden button right after the status line <p id={statusId}>.
// key tells the buttons of one status line apart: "retry" for "Try again",
// "clear" for "Clear filters".
export function addStatusButton(
  statusId: string,
  key: "retry" | "clear",
  label: string,
  onClick: () => void,
): void {
  const status = getElement(statusId, HTMLParagraphElement);
  // Lets showStatusButton move keyboard focus here
  status.tabIndex = -1;

  // The box is what gets hidden: .button sets `display`, which would win
  // over the `hidden` attribute on the button itself
  const box = document.createElement("div");
  box.id = boxId(statusId, key);
  box.className = "status-action";
  box.hidden = true;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-small";
  button.textContent = label;
  button.addEventListener("click", onClick);

  box.append(button);
  status.after(box);
}

// Does nothing for a button that was never added on this page.
// A button that disappears while it has keyboard focus would leave focus
// nowhere, so focus moves to the status line, which says what happens next
// ("Loading products…", then "Showing 13 of 13 products").
export function showStatusButton(
  statusId: string,
  key: "retry" | "clear",
  visible: boolean,
): void {
  const box = document.getElementById(boxId(statusId, key));
  if (!(box instanceof HTMLDivElement)) return;
  const status = getElement(statusId, HTMLParagraphElement);
  if (visible && box.previousElementSibling !== status) {
    status.after(box); // another hidden box was added later and sits in between
  }
  if (!visible && box.contains(document.activeElement)) {
    status.focus();
  }
  box.hidden = !visible;
}
