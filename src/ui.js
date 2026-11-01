// The only file that touches the page (the DOM): it reads the controls,
// draws products and cart, and reports clicks to main.js. It imports nothing.

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category-filter");
const sortSelect = document.getElementById("sort");
const grid = document.getElementById("product-grid");
const resultCount = document.getElementById("product-status");

const cartTitle = document.getElementById("cart-title");
const cartCount = document.getElementById("cart-count");
const cartList = document.getElementById("cart-list");
const cartEmpty = document.getElementById("cart-empty");
const cartSummary = document.getElementById("cart-summary");
const cartTotal = document.getElementById("cart-total");
const cartClear = document.getElementById("cart-clear");

// Raw values of the three controls; logic.js decides what they mean
export function getFilters() {
  return {
    query: searchInput.value,
    category: categorySelect.value,
    sortKey: sortSelect.value,
  };
}

function createCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const category = document.createElement("p");
  category.className = "category";
  category.textContent = product.category;

  const title = document.createElement("h3");
  title.textContent = product.name;

  const price = document.createElement("p");
  price.className = "price";
  price.textContent = money.format(product.price);

  const button = document.createElement("button");
  button.className = "button";
  button.type = "button";
  button.textContent = "Add to cart";
  button.dataset.id = product.id;
  button.setAttribute("aria-label", `Add ${product.name} to cart`);

  card.append(category, title, price, button);
  return card;
}

export function renderProducts(list, totalCount) {
  grid.replaceChildren(...list.map(createCard));
  resultCount.textContent =
    list.length === 0
      ? "No products match your search."
      : `Showing ${list.length} of ${totalCount} products`;
}

function createCartButton(text, action, id, label, extraClass = "") {
  const button = document.createElement("button");
  button.className = `button button-small ${extraClass}`.trim();
  button.type = "button";
  button.textContent = text;
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute("aria-label", label);
  return button;
}

function createCartRow({ product, qty, lineTotal }) {
  const row = document.createElement("li");
  row.className = "cart-item";

  const name = document.createElement("span");
  name.className = "cart-name";
  name.textContent = product.name;

  const qtyBox = document.createElement("div");
  qtyBox.className = "cart-qty";
  const amount = document.createElement("span");
  amount.textContent = qty;
  amount.setAttribute("aria-label", `Quantity: ${qty}`);
  qtyBox.append(
    createCartButton("−", "dec", product.id, `Decrease quantity of ${product.name}`),
    amount,
    createCartButton("+", "inc", product.id, `Increase quantity of ${product.name}`),
  );

  const line = document.createElement("span");
  line.className = "cart-line";
  line.textContent = money.format(lineTotal);

  const remove = createCartButton(
    "Remove",
    "remove",
    product.id,
    `Remove ${product.name} from cart`,
    "button-secondary",
  );

  row.append(name, qtyBox, line, remove);
  return row;
}

// Draws everything the cart shows: nav count, rows, total, empty message
export function renderCart({ lines, count, total }) {
  cartCount.textContent = count;
  cartList.replaceChildren(...lines.map(createCartRow));
  cartEmpty.hidden = lines.length > 0;
  cartSummary.hidden = lines.length === 0;
  cartTotal.textContent = money.format(total);
}

// Listeners are added once, here. render functions only rebuild children,
// so one click is always one call, however often the products were redrawn.
export function bindEvents(handlers) {
  searchInput.addEventListener("input", handlers.onFiltersChange);
  categorySelect.addEventListener("change", handlers.onFiltersChange);
  sortSelect.addEventListener("change", handlers.onFiltersChange);

  // One listener on the grid covers every card's button (event delegation)
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (button) handlers.onAdd(Number(button.dataset.id));
  });

  cartList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "inc") handlers.onIncrease(id);
    if (action === "dec") handlers.onDecrease(id);
    if (action === "remove") handlers.onRemove(id);

    // The rows were rebuilt, so give keyboard focus back to the same button,
    // or to the cart heading if that row is gone
    const same = cartList.querySelector(
      `button[data-action="${action}"][data-id="${id}"]`,
    );
    (same ?? cartTitle).focus();
  });

  cartClear.addEventListener("click", () => {
    handlers.onClear();
    cartTitle.focus();
  });
}
