// Connects the modules: takes data and state, runs them through logic,
// and hands the result to ui. It never touches the page or storage itself.
import { products } from "./data.js";
import {
  filterProducts,
  sortProducts,
  getCartLines,
  getCartCount,
  getCartTotal,
} from "./logic.js";
import {
  getCart,
  addToCart,
  changeQty,
  removeFromCart,
  clearCart,
} from "./state.js";
import { getFilters, renderProducts, renderCart, bindEvents } from "./ui.js";

// Filter first, then sort a copy, then draw
function refreshProducts() {
  const { query, category, sortKey } = getFilters();
  const filtered = filterProducts(products, { query, category });
  renderProducts(sortProducts(filtered, sortKey), products.length);
}

function refreshCart() {
  const cart = getCart();
  renderCart({
    lines: getCartLines(cart, products),
    count: getCartCount(cart),
    total: getCartTotal(cart, products),
  });
}

// Every cart action: change the state, then redraw the cart
bindEvents({
  onFiltersChange: refreshProducts,
  onAdd: (id) => {
    addToCart(id);
    refreshCart();
  },
  onIncrease: (id) => {
    changeQty(id, 1);
    refreshCart();
  },
  onDecrease: (id) => {
    changeQty(id, -1);
    refreshCart();
  },
  onRemove: (id) => {
    removeFromCart(id);
    refreshCart();
  },
  onClear: () => {
    clearCart();
    refreshCart();
  },
});

refreshProducts();
refreshCart();
