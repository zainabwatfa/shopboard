// Pure helpers for the theme feature.
import type { ThemeChoice } from "./theme.types.ts";

const choices: readonly string[] = ["system", "light", "dark"];

// The value comes from outside the code (saved text or the page), so check it.
// Anything unknown means "system".
export function parseThemeChoice(value: unknown): ThemeChoice {
  return typeof value === "string" && choices.includes(value)
    ? (value as ThemeChoice)
    : "system";
}
