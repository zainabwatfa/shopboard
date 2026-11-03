// Pure functions for the cart: everything comes in as arguments, a new value
// goes out. No page access, no saving, and inputs are never changed.
import type { Product } from "../products/products.types.ts";
import type { CartItem, CartLine } from "./cart.types.ts";

// Turns the saved [{ id, qty }] into what the page shows. find() can return
// undefined, so an id with no product is skipped instead of crashing.
export function getCartLines(
  cart: readonly CartItem[],
  products: readonly Product[],
): CartLine[] {
  return cart.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) return [];
    return [{ product, qty: item.qty, lineTotal: product.price * item.qty }];
  });
}

export function getCartCount(cart: readonly CartItem[]): number {
  return cart.reduce((count, item) => count + item.qty, 0);
}

export function getCartTotal(
  cart: readonly CartItem[],
  products: readonly Product[],
): number {
  return getCartLines(cart, products).reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
}

// How many of one product are in the cart (0 if none)
export function getItemQty(cart: readonly CartItem[], id: number): number {
  return cart.find((item) => item.id === id)?.qty ?? 0;
}

// A type guard: if it returns true, TypeScript treats `value` as a CartItem
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const { id, qty } = value as { id?: unknown; qty?: unknown };
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    typeof qty === "number" &&
    Number.isInteger(qty) &&
    qty > 0
  );
}

// Keeps only well-formed { id, qty } entries.
// `unknown` because what was loaded from storage may be old or edited by hand.
export function sanitizeCart(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter(isCartItem).map((item) => ({ id: item.id, qty: item.qty }));
}
