// The cart: [{ id, qty }]. This file owns it, changes it and saves it.
// localStorage only stores text, so JSON.stringify to save and JSON.parse to load.
import { products } from "./data.js";
import { sanitizeCart } from "./logic.js";

const CART_KEY = "shopboard-cart";

let cart = loadCart();

function loadCart() {
  try {
    return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY)), products);
  } catch {
    return []; // storage blocked or the saved text is not valid JSON
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // storage full or blocked: the cart still works until the page is closed
  }
}

// Returns copies, so nothing outside this file can change the cart by accident
export function getCart() {
  return cart.map((item) => ({ ...item }));
}

// The same product twice means qty 2, never two lines
export function addToCart(id) {
  const item = cart.find((entry) => entry.id === id);
  if (item) {
    item.qty += 1;
  } else {
    cart.push({ id, qty: 1 });
  }
  saveCart();
}

// delta is +1 or -1; a quantity that would reach 0 removes the product instead
export function changeQty(id, delta) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;
  if (item.qty + delta <= 0) {
    removeFromCart(id);
    return;
  }
  item.qty += delta;
  saveCart();
}

export function removeFromCart(id) {
  cart = cart.filter((entry) => entry.id !== id);
  saveCart();
}

export function clearCart() {
  cart = [];
  saveCart();
}
