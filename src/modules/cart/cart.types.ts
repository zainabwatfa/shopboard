// The shapes of the cart feature. Types only: nothing here runs.
import type { Product } from "../products/products.types.ts";

// What the cart saves: just which product and how many
export type CartItem = {
  id: number;
  qty: number;
};

// What the cart shows: the full product plus its quantity and line total
export type CartLine = {
  product: Product;
  qty: number;
  lineTotal: number;
};

export type CartView = {
  lines: CartLine[];
  count: number;
  total: number;
};

// What cart.ui.ts calls when the user does something on the cart page
export type CartHandlers = {
  onIncrease: (id: number) => void;
  onDecrease: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
};
