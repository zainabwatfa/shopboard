// The shapes of the demo checkout. Types only: nothing here runs.
import type { CartView } from "../cart/cart.types.ts";

// The form exactly as the page gives it: plain text. Nothing is sent or saved.
export type CheckoutFormValues = {
  fullName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

// The order summary: the cart's lines, item count and total.
// main.ts builds it with the cart's logic and passes it in.
export type CheckoutSummary = CartView;

// What the page shows after a demo order is placed: "Thanks, Sam!" and a
// snapshot of the order, kept after the cart has been cleared
export type CheckoutConfirmation = {
  heading: string;
  summary: CheckoutSummary;
};

// What checkout.ui.ts calls when the user sends a valid checkout form
export type CheckoutHandlers = {
  onSubmit: (values: CheckoutFormValues) => void;
};
