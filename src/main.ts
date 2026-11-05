// Starts the app and connects the modules. It decides *when* things happen;
// the modules decide *how*. Every HTML page loads this one file, and it only
// wires up what that page has.
import { ApiError } from "./shared/api/client.ts";
import {
  getCurrentPage,
  getQueryParam,
  getQueryString,
  replaceQueryString,
} from "./shared/ui/page.ts";
import { showToast } from "./shared/ui/toast.ts";

import type { Product } from "./modules/products/products.types.ts";
import { getProducts } from "./modules/products/products.api.ts";
import {
  DEFAULT_FILTERS,
  filterProducts,
  findProduct,
  getRelatedProducts,
  parseFilterQuery,
  parseFilters,
  parseProductId,
  sortProducts,
  toFilterQuery,
} from "./modules/products/products.logic.ts";
import {
  bindProductEvents,
  bindProductPageEvents,
  bindProductsRetry,
  getFilters,
  renderFilters,
  renderFiltersEnabled,
  renderProductNotFound,
  renderProductPage,
  renderProducts,
  renderProductsError,
  renderProductsStatus,
} from "./modules/products/products.ui.ts";

import type { CartChange, CartView } from "./modules/cart/cart.types.ts";
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
  bindCartRetry,
  bindCartSync,
  renderCart,
  renderCartChange,
  renderCartCount,
  renderCartError,
  renderCartStatus,
} from "./modules/cart/cart.ui.ts";

import { buildConfirmation } from "./modules/checkout/checkout.logic.ts";
import {
  bindCheckoutEvents,
  bindCheckoutRetry,
  renderCheckout,
  renderCheckoutConfirmation,
  renderCheckoutError,
  renderCheckoutStatus,
} from "./modules/checkout/checkout.ui.ts";

import { bindContactEvents } from "./modules/contact/contact.ui.ts";

import { bindRegisterEvents } from "./modules/register/register.ui.ts";

import { parseThemeChoice } from "./modules/theme/theme.logic.ts";
import {
  getThemeChoice,
  saveThemeChoice,
} from "./modules/theme/theme.state.ts";
import {
  applyTheme,
  bindThemeEvents,
  bindThemeSync,
  renderThemeChoice,
} from "./modules/theme/theme.ui.ts";

// Filled once the product list has loaded
let products: readonly Product[] = [];

// True while the product list is loading, so a second "Try again" can't
// start a second load
let loading = false;

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
      ? "Couldn't reach the shop. Check your connection and try again."
      : "Couldn't load the products. Please try again.";
  }
}

// A page that needs the product list: what it shows while the list loads,
// what it shows when loading failed, and how it starts once the list is there
type ProductsPage = {
  showLoading: () => void;
  showError: (message: string) => void;
  start: () => void;
};

// Loads the products and starts the page. When loading fails, the page shows
// the error with a "Try again" button, which calls this again: no page reload.
// start runs at most once, because the button is gone after a load that worked.
async function loadPage(page: ProductsPage): Promise<void> {
  if (loading) return;
  loading = true;
  page.showLoading();
  const error = await loadProducts();
  loading = false;
  if (error) {
    page.showError(error);
    return;
  }
  page.start();
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

// Cart and checkout pages, when the products didn't load: the items can't be
// shown, but they are still saved and the header badge still counts them.
// Saying so keeps the message and the badge telling the same story.
function withSavedItems(message: string): string {
  const count = getCartCount(getCart());
  if (count === 0) return message;
  const items = count === 1 ? "1 item is" : `${count} items are`;
  return `${message} Your ${items} still saved in your cart.`;
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

// Shop page: filter first, then sort a copy, then draw. The address bar gets
// the same filters, so the link shows this list again (bookmark, share, reload).
function refreshProducts(): void {
  const filters = parseFilters(getFilters());
  const filtered = filterProducts(products, filters.query, filters.category);
  renderProducts(sortProducts(filtered, filters.sortKey), products.length);
  replaceQueryString(toFilterQuery(filters));
}

// Shop page: "Clear filters" (shown when nothing matches) shows everything again
function clearFilters(): void {
  renderFilters(DEFAULT_FILTERS);
  refreshProducts();
}

// Cart page: rows, item count and total. After a change the user made, also
// says what changed, for screen reader users.
function refreshCart(change: CartChange | null = null): void {
  const view = getCartView();
  renderCart(view);
  refreshCount();
  if (change) renderCartChange(change, view);
}

// Cart page, after + or −: the new quantity, or "removed" when − took the last one
function qtyChangeOf(id: number): CartChange | null {
  const product = findProduct(products, id);
  if (!product) return null;
  const qty = getItemQty(getCart(), id);
  return qty > 0
    ? { type: "quantity", name: product.name, qty }
    : { type: "removed", name: product.name };
}

// Checkout page: the order summary, or the empty state
function refreshCheckout(): void {
  renderCheckout(getCartView());
  refreshCount();
}

// Shop page. shop.html?q=tote&category=Bags&sort=price-asc opens with those
// filters: the address is text anyone can edit, so parseFilterQuery checks it.
function startShop(): void {
  renderFilters(parseFilterQuery(getQueryString()));

  const page: ProductsPage = {
    showLoading: () => renderProductsStatus("Loading products…"),
    showError: (message) => {
      renderFiltersEnabled(false); // nothing to search until the products load
      renderProductsError(message);
    },
    start: () => {
      renderFiltersEnabled(true);
      refreshCount();
      bindProductEvents({
        onFiltersChange: refreshProducts,
        onClearFilters: clearFilters,
        onAdd: addProductToCart,
      });
      refreshProducts();
    },
  };
  bindProductsRetry(() => void loadPage(page));
  void loadPage(page);
}

// Product page: product.html?id=3
function startProduct(): void {
  // The id is text from the address bar: a bad one needs no product list
  const id = parseProductId(getQueryParam("id"));
  if (id === null) {
    renderProductNotFound();
    return;
  }

  const page: ProductsPage = {
    showLoading: () => renderProductsStatus("Loading product…"),
    showError: renderProductsError,
    start: () => {
      refreshCount();
      const product = findProduct(products, id);
      if (!product) {
        renderProductNotFound();
        return;
      }
      bindProductPageEvents({ onAdd: addProductToCart });
      renderProductPage({
        product,
        related: getRelatedProducts(products, product),
      });
    },
  };
  bindProductsRetry(() => void loadPage(page));
  void loadPage(page);
}

function startCart(): void {
  const page: ProductsPage = {
    showLoading: () => renderCartStatus("Loading your cart…"),
    showError: (message) => renderCartError(withSavedItems(message)),
    start: () => {
      // Every cart action: change the state, then redraw the cart and say what changed
      bindCartEvents({
        onIncrease: (id) => {
          changeQty(id, 1);
          refreshCart(qtyChangeOf(id));
        },
        onDecrease: (id) => {
          changeQty(id, -1);
          refreshCart(qtyChangeOf(id));
        },
        onRemove: (id) => {
          const product = findProduct(products, id);
          removeFromCart(id);
          refreshCart(product ? { type: "removed", name: product.name } : null);
        },
        onClear: () => {
          clearCart();
          refreshCart({ type: "cleared" });
        },
      });
      refreshCart();
      cartPageReady = true;
    },
  };
  bindCartRetry(() => void loadPage(page));
  void loadPage(page);
}

// Checkout page: a demo. A valid submit sends nothing; it shows a confirmation
// with a snapshot of the order, then empties the cart.
function startCheckout(): void {
  const page: ProductsPage = {
    showLoading: () => renderCheckoutStatus("Loading your order…"),
    showError: (message) => renderCheckoutError(withSavedItems(message)),
    start: () => {
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
    },
  };
  bindCheckoutRetry(() => void loadPage(page));
  void loadPage(page);
}

// Home page: the register form is a demo, so a valid submit only says so
function startHome(): void {
  bindRegisterEvents({
    onSubmit: () =>
      showToast("Thanks! This is a demo, so nothing was sent or saved."),
  });
}

// Contact page: the same kind of demo form
function startContact(): void {
  bindContactEvents({
    onSubmit: () =>
      showToast("Thanks! This is a demo, so your message was not sent."),
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

  // A theme picked in another tab, or Back showing an old choice
  bindThemeSync(showSavedTheme);
}

startTheme();
refreshCount();

// The cart changed in another tab, or Back brought this page back from the
// browser's cache: read it again and redraw what this page shows
bindCartSync(() => {
  reloadCart();
  if (cartPageReady)
    refreshCart(); // refreshCart also updates the badge
  else if (checkoutPageReady)
    refreshCheckout(); // so does refreshCheckout
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
    startShop();
    break;
  case "product":
    startProduct();
    break;
  case "cart":
    startCart();
    break;
  case "checkout":
    startCheckout();
    break;
  case "contact":
    startContact();
    break;
}
