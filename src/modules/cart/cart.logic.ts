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

// A type guard: if it returns true, TypeScript treats `value` as a CartItem.
// qty must be a safe integer, so + and − always change it by exactly 1.
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  // `in` checks prove both fields exist, so TypeScript allows reading them (as unknown)
  if (!("id" in value) || !("qty" in value)) return false;
  const { id, qty } = value;
  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    typeof qty === "number" &&
    Number.isSafeInteger(qty) &&
    qty > 0
  );
}

// Keeps only well-formed { id, qty } entries, one per product: the same id
// twice adds up the quantities, so the cart never shows two lines for it.
// `unknown` because what was loaded from storage may be old or edited by hand.
export function sanitizeCart(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  const merged: CartItem[] = [];
  for (const item of saved.filter(isCartItem)) {
    const same = merged.find((entry) => entry.id === item.id);
    if (same) same.qty += item.qty;
    else merged.push({ id: item.id, qty: item.qty });
  }
  return merged;
}
