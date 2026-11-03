// Pure functions for the demo checkout: everything comes in as arguments, a new
// value goes out. No page access, no saving, and inputs are never changed.
import type {
  CheckoutConfirmation,
  CheckoutFormValues,
  CheckoutSummary,
} from "./checkout.types.ts";

// The first word of the full name, for "Thanks, Sam!". The name is text from
// the form, so spaces (and tabs) around and between words are ignored, and a
// name of only spaces gives "".
export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

// The confirmation for a demo order: a heading with the first name ("Thanks!"
// when there is none) and a copy of the summary, so it stays the same after
// the cart is cleared
export function buildConfirmation(
  values: CheckoutFormValues,
  summary: CheckoutSummary,
): CheckoutConfirmation {
  const firstName = getFirstName(values.fullName);
  return {
    heading: firstName ? `Thanks, ${firstName}!` : "Thanks!",
    summary: {
      lines: summary.lines.map((line) => ({ ...line })),
      count: summary.count,
      total: summary.total,
    },
  };
}
