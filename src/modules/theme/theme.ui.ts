// Shows the theme on the page and reports what the user picks to main.ts.
import { getElement } from "../../shared/ui/dom.ts";
import type { ThemeChoice, ThemeHandlers } from "./theme.types.ts";

// The CSS reads <html data-theme>: "light" or "dark" override the device
// setting, and no attribute means "follow the device"
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
}

// Checks the radio button of the current choice in the header
export function renderThemeChoice(choice: ThemeChoice): void {
  getElement(`theme-${choice}`, HTMLInputElement).checked = true;
}

export function bindThemeEvents(handlers: ThemeHandlers): void {
  getElement("theme-switch", HTMLFieldSetElement).addEventListener(
    "change",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.name === "theme"
      ) {
        handlers.onChange(event.target.value);
      }
    },
  );
}

// Shows the saved theme again when it may differ from what the page shows.
// Call once.
// - "storage": the browser fires it in the other open tabs of this site when
//   saved data changes, so a theme picked in one tab reaches the others.
// - "pageshow": after Back or Forward, the browser may put back the radio that
//   was checked on the last visit (just before "pageshow", after this file
//   already checked the right one), or show the page from its cache as it was.
//   Either way the switch could show "System" on a dark page.
export function bindThemeSync(onChange: () => void): void {
  window.addEventListener("storage", () => {
    onChange();
  });
  window.addEventListener("pageshow", () => {
    onChange();
  });
}
