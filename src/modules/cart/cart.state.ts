// The cart: [{ id, qty }]. This file owns it, changes it and saves it.
// localStorage only stores text, so JSON.stringify to save and JSON.parse to load.
import { sanitizeCart } from "./cart.logic.ts";
import type { CartItem } from "./cart.types.ts";

const CART_KEY = "shopboard-cart";

let cart: CartItem[] = loadCart();

// True when the last save failed. The copy in memory is then newer than the
// saved one, so it is kept instead of being replaced by older saved data.
let lastSaveFailed = false;

function loadCart(): CartItem[] {
  try {
    // getItem returns null when nothing is saved; JSON.parse only accepts text
    const saved: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "null");
    return sanitizeCart(saved);
  } catch {
    return []; // storage blocked or the saved text is not valid JSON
  }
}

function saveCart(): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    lastSaveFailed = false;
  } catch {
    // storage full or blocked: the cart still works until the page is closed
    lastSaveFailed = true;
  }
}

// Reads the saved cart again, so changes made in another tab are picked up.
// Every change below calls it first, so a save never overwrites newer data.
export function reloadCart(): void {
  if (lastSaveFailed) return;
  cart = loadCart();
}

// Returns copies, so nothing outside this file can change the cart by accident
export function getCart(): CartItem[] {
  return cart.map((item) => ({ ...item }));
}

// The same product twice means qty 2, never two lines
export function addToCart(id: number): void {
  reloadCart();
  const item = cart.find((entry) => entry.id === id);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
}

// delta can only be 1 or -1; a quantity that would reach 0 removes the product
export function changeQty(id: number, delta: 1 | -1): void {
  reloadCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  if (item.qty + delta <= 0) {
    removeFromCart(id);
    return;
  }
  item.qty += delta;
  saveCart();
}

export function removeFromCart(id: number): void {
  reloadCart();
  cart = cart.filter((entry) => entry.id !== id);
  saveCart();
}

export function clearCart(): void {
  reloadCart(); // nothing to build on, but keeps every change the same
  cart = [];
  saveCart();
}

// Drops saved items whose product no longer exists (called once the
// product list has loaded). Saves only if something was removed.
export function keepOnly(validIds: readonly number[]): void {
  reloadCart();
  const kept = cart.filter((entry) => validIds.includes(entry.id));
  if (kept.length !== cart.length) {
    cart = kept;
    saveCart();
  }
}
