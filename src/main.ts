// Starts the app and connects the modules. It decides *when* things happen;
// the modules decide *how*. Every HTML page loads this one file, and it only
// wires up what that page has.
import { ApiError } from "./shared/api/client.ts";
import { getCurrentPage } from "./shared/ui/page.ts";
import { showToast } from "./shared/ui/toast.ts";

import type { Product } from "./modules/products/products.types.ts";
import { getProducts } from "./modules/products/products.api.ts";
import {
  filterProducts,
  findProduct,
  parseCategory,
  parseSortKey,
  sortProducts,
} from "./modules/products/products.logic.ts";
import {
  bindProductEvents,
  getFilters,
  renderProducts,
  renderProductsStatus,
} from "./modules/products/products.ui.ts";

import {
  addToCart,
  changeQty,
  clearCart,
  getCart,
  keepOnly,
  reloadCart,
  removeFromCart,
} from "./modules/cart/cart.state.ts";
import {
  getCartCount,
  getCartLines,
  getCartTotal,
  getItemQty,
} from "./modules/cart/cart.logic.ts";
import {
  bindCartEvents,
  bindCartSync,
  renderCart,
  renderCartCount,
  renderCartStatus,
} from "./modules/cart/cart.ui.ts";

import { bindRegisterEvents } from "./modules/register/register.ui.ts";

// Filled once the product list has loaded
let products: readonly Product[] = [];

// True once the cart page has its products and has been drawn
let cartPageReady = false;

// Loads the products, then drops cart items for products that no longer exist.
// Returns an error message to show, or null when it worked.
async function loadProducts(): Promise<string | null> {
  try {
    products = await getProducts();
    keepOnly(products.map((product) => product.id));
    return null;
  } catch (error) {
    console.error(error);
    return error instanceof ApiError && error.status === 0
      ? "Couldn't reach the shop. Check your connection and refresh the page."
      : "Couldn't load the products. Please refresh the page.";
  }
}

// The badge in the header, on every page
function refreshCount(): void {
  renderCartCount(getCartCount(getCart()));
}

// Shop page: filter first, then sort a copy, then draw
function refreshProducts(): void {
  const { query, category, sortKey } = getFilters();
  const filtered = filterProducts(products, query, parseCategory(category));
  renderProducts(sortProducts(filtered, parseSortKey(sortKey)), products.length);
}

// Cart page: rows, item count and total
function refreshCart(): void {
  const cart = getCart();
  renderCart({
    lines: getCartLines(cart, products),
    count: getCartCount(cart),
    total: getCartTotal(cart, products),
  });
  refreshCount();
}

async function startShop(): Promise<void> {
  renderProductsStatus("Loading products…");
  const error = await loadProducts();
  if (error) {
    renderProductsStatus(error);
    return;
  }
  refreshCount();

  bindProductEvents({
    onFiltersChange: refreshProducts,
    onAdd: (id) => {
      // The id comes from the page, so only add it if it is a real product
      const product = findProduct(products, id);
      if (!product) return;
      addToCart(id);
      refreshCount();
      showToast(
        // The quantity makes the text change every time, so it's announced again
        `${product.name} added to your cart (${getItemQty(getCart(), id)} in cart).`,
        { action: { label: "View cart", href: "cart.html" } },
      );
    },
  });
  refreshProducts();
}

async function startCart(): Promise<void> {
  renderCartStatus("Loading your cart…");
  const error = await loadProducts();
  if (error) {
    renderCartStatus(error);
    return;
  }

  // Every cart action: change the state, then redraw the cart
  bindCartEvents({
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
  refreshCart();
  cartPageReady = true;
}

// Home page: the register form is a demo, so a valid submit only says so
function startHome(): void {
  bindRegisterEvents({
    onSubmit: () => showToast("Thanks! This is a demo, so nothing was sent or saved."),
  });
}

refreshCount();

// The cart changed in another tab, or Back brought this page back from the
// browser's cache: read it again and redraw what this page shows
bindCartSync(() => {
  reloadCart();
  if (cartPageReady) refreshCart(); // refreshCart also updates the badge
  else refreshCount();
});

const page = getCurrentPage();
if (page === "home") startHome();
if (page === "shop") void startShop();
if (page === "cart") void startCart();
