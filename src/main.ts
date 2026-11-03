// Starts the app and connects the modules. It decides *when* things happen;
// the modules decide *how*. Every HTML page loads this one file, and it only
// wires up what that page has.
import { ApiError } from "./shared/api/client.ts";
import { getCurrentPage, getQueryParam } from "./shared/ui/page.ts";
import { showToast } from "./shared/ui/toast.ts";

import type { Product } from "./modules/products/products.types.ts";
import { getProducts } from "./modules/products/products.api.ts";
import {
  filterProducts,
  findProduct,
  getRelatedProducts,
  parseCategory,
  parseProductId,
  parseSortKey,
  sortProducts,
} from "./modules/products/products.logic.ts";
import {
  bindProductEvents,
  bindProductPageEvents,
  getFilters,
  renderProductNotFound,
  renderProductPage,
  renderProducts,
  renderProductsStatus,
} from "./modules/products/products.ui.ts";

import type { CartView } from "./modules/cart/cart.types.ts";
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

import { buildConfirmation } from "./modules/checkout/checkout.logic.ts";
import {
  bindCheckoutEvents,
  renderCheckout,
  renderCheckoutConfirmation,
  renderCheckoutStatus,
} from "./modules/checkout/checkout.ui.ts";

import { bindContactEvents } from "./modules/contact/contact.ui.ts";

import { bindRegisterEvents } from "./modules/register/register.ui.ts";

import { parseThemeChoice } from "./modules/theme/theme.logic.ts";
import { getThemeChoice, saveThemeChoice } from "./modules/theme/theme.state.ts";
import {
  applyTheme,
  bindThemeEvents,
  bindThemeSync,
  renderThemeChoice,
} from "./modules/theme/theme.ui.ts";

// Filled once the product list has loaded
let products: readonly Product[] = [];

// True once the cart page has its products and has been drawn
let cartPageReady = false;

// True once the checkout page has its products and shows the order summary.
// False again after the demo order is placed: the confirmation then stays as it is.
let checkoutPageReady = false;

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

// Lines, item count and total of the cart as it is now (cart and checkout pages)
function getCartView(): CartView {
  const cart = getCart();
  return {
    lines: getCartLines(cart, products),
    count: getCartCount(cart),
    total: getCartTotal(cart, products),
  };
}

// Shop and product pages: the id comes from the page, so only add it if it is
// a real product, then update the badge and say so with a "View cart" button
function addProductToCart(id: number): void {
  const product = findProduct(products, id);
  if (!product) return;
  addToCart(id);
  refreshCount();
  showToast(
    // The quantity makes the text change every time, so it's announced again
    `${product.name} added to your cart (${getItemQty(getCart(), id)} in cart).`,
    { action: { label: "View cart", href: "cart.html" } },
  );
}

// Shop page: filter first, then sort a copy, then draw
function refreshProducts(): void {
  const { query, category, sortKey } = getFilters();
  const filtered = filterProducts(products, query, parseCategory(category));
  renderProducts(sortProducts(filtered, parseSortKey(sortKey)), products.length);
}

// Cart page: rows, item count and total
function refreshCart(): void {
  renderCart(getCartView());
  refreshCount();
}

// Checkout page: the order summary, or the empty state
function refreshCheckout(): void {
  renderCheckout(getCartView());
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
    onAdd: addProductToCart,
  });
  refreshProducts();
}

// Product page: product.html?id=3
async function startProduct(): Promise<void> {
  // The id is text from the address bar: a bad one needs no product list
  const id = parseProductId(getQueryParam("id"));
  if (id === null) {
    renderProductNotFound();
    return;
  }

  renderProductsStatus("Loading product…");
  const error = await loadProducts();
  if (error) {
    renderProductsStatus(error);
    return;
  }
  refreshCount();

  const product = findProduct(products, id);
  if (!product) {
    renderProductNotFound();
    return;
  }
  bindProductPageEvents({ onAdd: addProductToCart });
  renderProductPage({ product, related: getRelatedProducts(products, product) });
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

// Checkout page: a demo. A valid submit sends nothing; it shows a confirmation
// with a snapshot of the order, then empties the cart.
async function startCheckout(): Promise<void> {
  renderCheckoutStatus("Loading your order…");
  const error = await loadProducts();
  if (error) {
    renderCheckoutStatus(error);
    return;
  }

  bindCheckoutEvents({
    onSubmit: (values) => {
      reloadCart(); // build on the latest saved cart, even if another tab changed it
      const summary = getCartView();
      if (summary.lines.length === 0) {
        refreshCheckout(); // emptied meanwhile: show the empty state instead
        return;
      }
      checkoutPageReady = false;
      clearCart();
      refreshCount();
      renderCheckoutConfirmation(buildConfirmation(values, summary));
    },
  });
  refreshCheckout();
  checkoutPageReady = true;
}

// Home page: the register form is a demo, so a valid submit only says so
function startHome(): void {
  bindRegisterEvents({
    onSubmit: () => showToast("Thanks! This is a demo, so nothing was sent or saved."),
  });
}

// Contact page: the same kind of demo form
function startContact(): void {
  bindContactEvents({
    onSubmit: () => showToast("Thanks! This is a demo, so your message was not sent."),
  });
}

// Every page: show the saved theme in the header switch and keep it in step.
// The <head> script already applied it before the page was drawn.
function startTheme(): void {
  const showSavedTheme = (): void => {
    const choice = getThemeChoice();
    applyTheme(choice);
    renderThemeChoice(choice);
  };
  showSavedTheme();

  bindThemeEvents({
    onChange: (value) => {
      const choice = parseThemeChoice(value);
      saveThemeChoice(choice);
      applyTheme(choice);
    },
  });

  // A theme picked in another tab
  bindThemeSync(showSavedTheme);
}

startTheme();
refreshCount();

// The cart changed in another tab, or Back brought this page back from the
// browser's cache: read it again and redraw what this page shows
bindCartSync(() => {
  reloadCart();
  if (cartPageReady) refreshCart(); // refreshCart also updates the badge
  else if (checkoutPageReady) refreshCheckout(); // so does refreshCheckout
  else refreshCount();
});

// Only the pages below have something of their own to start. The others
// (about, faq, shipping, privacy, terms, credits, notfound), and a page with a
// missing or unknown data-page, only get the theme switch and the cart badge.
switch (getCurrentPage()) {
  case "home":
    startHome();
    break;
  case "shop":
    void startShop();
    break;
  case "product":
    void startProduct();
    break;
  case "cart":
    void startCart();
    break;
  case "checkout":
    void startCheckout();
    break;
  case "contact":
    startContact();
    break;
}
