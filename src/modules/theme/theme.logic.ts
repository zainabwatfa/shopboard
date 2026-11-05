// Pure helpers for the theme feature.
import type { ThemeChoice } from "./theme.types.ts";

// A typed list, so TypeScript checks that every entry is a real ThemeChoice
const choices: readonly ThemeChoice[] = ["system", "light", "dark"];

// A type guard: the value becomes a ThemeChoice only after this check
function isThemeChoice(value: unknown): value is ThemeChoice {
  return choices.some((choice) => choice === value);
}

// The value comes from outside the code (saved text or the page), so check it.
// Anything unknown means "system".
export function parseThemeChoice(value: unknown): ThemeChoice {
  return isThemeChoice(value) ? value : "system";
}
