// Pure functions: everything comes in as arguments, a new value goes out.
// No page access, no saving, and inputs are never changed.

// Case-insensitive name search + category filter ("all" means no filter)
export function filterProducts(products, { query, category }) {
  const search = query.trim().toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(search) &&
      (category === "all" || product.category === category),
  );
}

// One compare function per option of the sort select. "default" is the id order
// from data.js, so picking it again always brings the original order back.
const compareBy = {
  default: (a, b) => a.id - b.id,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "name-asc": (a, b) => a.name.localeCompare(b.name),
};

// sort() mutates the array it runs on, so always sort a copy
export function sortProducts(products, sortKey) {
  const compare = compareBy[sortKey] ?? compareBy.default;
  return [...products].sort(compare);
}

// Turns the saved [{ id, qty }] into what the page shows: product, qty and line total
export function getCartLines(cart, products) {
  return cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return { product, qty: item.qty, lineTotal: product.price * item.qty };
  });
}

export function getCartCount(cart) {
  return cart.reduce((count, item) => count + item.qty, 0);
}

export function getCartTotal(cart, products) {
  return getCartLines(cart, products).reduce(
    (total, line) => total + line.lineTotal,
    0,
  );
}

// Keeps only well-formed { id, qty } entries of products that still exist.
// Used on whatever was loaded from storage, which may be old or edited by hand.
export function sanitizeCart(saved, products) {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.id) &&
        Number.isInteger(item.qty) &&
        item.qty > 0 &&
        products.some((product) => product.id === item.id),
    )
    .map((item) => ({ id: item.id, qty: item.qty }));
}
