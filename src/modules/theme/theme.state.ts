// The theme choice. This file owns it and saves it.
// It is saved as plain text ("light" or "dark"), not JSON, because the small
// script in each HTML <head> reads the same key to apply the theme before the
// page is drawn. parseThemeChoice checks whatever comes back.
import { parseThemeChoice } from "./theme.logic.ts";
import type { ThemeChoice } from "./theme.types.ts";

const THEME_KEY = "shopboard-theme";

export function getThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_KEY));
  } catch {
    return "system"; // storage blocked
  }
}

// "system" removes the key, so the <head> script finds nothing to apply
export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, choice);
    }
  } catch {
    // storage full or blocked: the theme still changes until the page is closed
  }
}
