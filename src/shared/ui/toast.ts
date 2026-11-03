// A short message at the bottom of the screen, with an optional link button.
// Any module can use it: showToast("Saved"), or with an action like "View cart".
// It hides itself after a few seconds, but not while the mouse or keyboard is on it.

export type ToastOptions = {
  action?: { label: string; href: string };
  duration?: number; // milliseconds
};

type ToastParts = {
  root: HTMLDivElement;
  text: HTMLParagraphElement;
  action: HTMLAnchorElement;
};

const DEFAULT_DURATION = 6000;

let parts: ToastParts | undefined;
let timer: number | undefined;
let duration = DEFAULT_DURATION;

function hide(): void {
  window.clearTimeout(timer);
  parts?.root.classList.remove("is-open");
}

function startTimer(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(hide, duration);
}

// Built the first time it's needed, so pages don't need any toast HTML.
// role="status" makes it a live region: screen readers read new text in it.
function getParts(): ToastParts {
  if (parts) return parts;

  const root = document.createElement("div");
  root.className = "toast";
  root.setAttribute("role", "status");

  const text = document.createElement("p");
  text.className = "toast-text";

  const action = document.createElement("a");
  action.className = "button toast-action";

  const close = document.createElement("button");
  close.className = "toast-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss message");
  close.addEventListener("click", hide);

  root.append(text, action, close);
  root.addEventListener("mouseenter", () => window.clearTimeout(timer));
  root.addEventListener("focusin", () => window.clearTimeout(timer));
  root.addEventListener("mouseleave", startTimer);
  root.addEventListener("focusout", startTimer);
  document.body.append(root);

  parts = { root, text, action };
  return parts;
}

export function showToast(message: string, options: ToastOptions = {}): void {
  const { root, text, action } = getParts();

  action.hidden = !options.action;
  if (options.action) {
    action.textContent = options.action.label;
    action.href = options.action.href;
  }

  root.classList.add("is-open");
  // Set the text on the next frame, so a live region that was just created
  // is already in the page when its text changes, and gets announced
  requestAnimationFrame(() => {
    text.textContent = message;
  });

  duration = options.duration ?? DEFAULT_DURATION;
  startTimer();
}
