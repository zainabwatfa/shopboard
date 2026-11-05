// Tests for the pure cart functions: lines, count, total, and checking
// what was loaded from storage.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  getCartCount,
  getCartLines,
  getCartTotal,
  getItemQty,
  sanitizeCart,
} from "../src/modules/cart/cart.logic.ts";
import type { CartItem } from "../src/modules/cart/cart.types.ts";
import type { Product } from "../src/modules/products/products.types.ts";

// Real entries from public/api/products.json, frozen so nothing can change them
const PRODUCTS: readonly Product[] = Object.freeze([
  Object.freeze({
    id: 1,
    name: "Leather Tote Bag",
    category: "Bags",
    price: 89,
    image: "products/leather-tote-bag.svg",
  }),
  Object.freeze({
    id: 9,
    name: "Sunglasses",
    category: "Accessories",
    price: 35,
    image: "products/sunglasses.svg",
  }),
  Object.freeze({
    id: 12,
    name: "Leather Belt",
    category: "Accessories",
    price: 30,
    image: "products/leather-belt.svg",
  }),
]);

function cartOf(...items: [id: number, qty: number][]): readonly CartItem[] {
  return Object.freeze(items.map(([id, qty]) => Object.freeze({ id, qty })));
}

describe("getCartLines", () => {
  test("joins each item with its product, in cart order", () => {
    const lines = getCartLines(cartOf([9, 2], [1, 1]), PRODUCTS);
    assert.deepEqual(
      lines.map((line) => [line.product.name, line.qty, line.lineTotal]),
      [
        ["Sunglasses", 2, 70],
        ["Leather Tote Bag", 1, 89],
      ],
    );
  });

  test("skips items whose product does not exist", () => {
    const lines = getCartLines(cartOf([404, 3], [12, 1]), PRODUCTS);
    assert.deepEqual(
      lines.map((line) => line.product.id),
      [12],
    );
  });

  test("an empty cart, or no products, gives no lines", () => {
    assert.deepEqual(getCartLines([], PRODUCTS), []);
    assert.deepEqual(getCartLines(cartOf([1, 1]), []), []);
  });
});

describe("getCartCount", () => {
  test("adds up the quantities", () => {
    assert.equal(getCartCount(cartOf([1, 2], [9, 3])), 5);
  });

  test("is 0 for an empty cart", () => {
    assert.equal(getCartCount([]), 0);
  });
});

describe("getCartTotal", () => {
  test("adds up price × qty", () => {
    assert.equal(
      getCartTotal(cartOf([1, 2], [9, 1], [12, 3]), PRODUCTS),
      89 * 2 + 35 + 30 * 3,
    );
  });

  test("does not charge for items whose product does not exist", () => {
    assert.equal(getCartTotal(cartOf([404, 5], [9, 1]), PRODUCTS), 35);
  });

  test("is 0 for an empty cart", () => {
    assert.equal(getCartTotal([], PRODUCTS), 0);
  });
});

describe("getItemQty", () => {
  test("gives the quantity of one product, or 0 if it is not in the cart", () => {
    const cart = cartOf([1, 4], [9, 1]);
    assert.equal(getItemQty(cart, 1), 4);
    assert.equal(getItemQty(cart, 12), 0);
    assert.equal(getItemQty([], 1), 0);
  });
});

describe("sanitizeCart", () => {
  test("anything that is not a list becomes an empty cart", () => {
    for (const value of [
      null,
      undefined,
      0,
      "[]",
      {},
      { id: 1, qty: 1 },
      true,
    ]) {
      assert.deepEqual(sanitizeCart(value), [], `for ${JSON.stringify(value)}`);
    }
  });

  test("keeps well-formed items", () => {
    assert.deepEqual(
      sanitizeCart([
        { id: 1, qty: 2 },
        { id: 9, qty: 1 },
      ]),
      [
        { id: 1, qty: 2 },
        { id: 9, qty: 1 },
      ],
    );
  });

  test("saves only id and qty: extra fields such as a price are dropped", () => {
    const result = sanitizeCart([
      { id: 1, qty: 2, price: 0, name: "Leather Tote Bag" },
    ]);
    assert.deepEqual(result, [{ id: 1, qty: 2 }]); // deepEqual also fails on extra keys
  });

  test("drops items that are not objects or miss a field", () => {
    assert.deepEqual(
      sanitizeCart([
        null,
        1,
        "x",
        [],
        { id: 1 },
        { qty: 1 },
        { id: 9, qty: 1 },
      ]),
      [{ id: 9, qty: 1 }],
    );
  });

  test("drops a quantity of 0 or below", () => {
    assert.deepEqual(
      sanitizeCart([
        { id: 1, qty: 0 },
        { id: 2, qty: -1 },
        { id: 3, qty: -0 },
      ]),
      [],
    );
  });

  test("drops quantities that are not whole numbers", () => {
    const bad = [
      1.5,
      0.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      "2",
      null,
      true,
    ];
    assert.deepEqual(sanitizeCart(bad.map((qty) => ({ id: 1, qty }))), []);
  });

  test("drops quantities too large for + and − to change by exactly 1", () => {
    assert.deepEqual(
      sanitizeCart([
        { id: 1, qty: 2 ** 53 },
        { id: 2, qty: 1e21 },
      ]),
      [],
    );
    assert.deepEqual(sanitizeCart([{ id: 3, qty: Number.MAX_SAFE_INTEGER }]), [
      { id: 3, qty: Number.MAX_SAFE_INTEGER },
    ]);
  });

  test("drops ids that are not whole numbers", () => {
    const bad = [1.5, Number.NaN, Number.POSITIVE_INFINITY, "1", null];
    assert.deepEqual(sanitizeCart(bad.map((id) => ({ id, qty: 1 }))), []);
  });

  test("merges the same id into one line by adding the quantities", () => {
    assert.deepEqual(
      sanitizeCart([
        { id: 1, qty: 2 },
        { id: 9, qty: 1 },
        { id: 1, qty: 3 },
        { id: 1, qty: 0 },
      ]),
      [
        { id: 1, qty: 5 },
        { id: 9, qty: 1 },
      ],
    );
  });

  test("works on what JSON.parse gives back", () => {
    const saved: unknown = JSON.parse(
      '[{"id":1,"qty":2},{"id":2,"qty":1e999},{"id":3,"qty":"4"}]',
    );
    assert.deepEqual(sanitizeCart(saved), [{ id: 1, qty: 2 }]);
  });

  test("returns new objects and never changes its input", () => {
    const input = Object.freeze([
      Object.freeze({ id: 1, qty: 2 }),
      Object.freeze({ id: 1, qty: 1 }),
    ]);
    const result = sanitizeCart(input); // input is frozen: changing it would throw
    assert.deepEqual(result, [{ id: 1, qty: 3 }]);
    assert.notEqual(result[0], input[0]);
    assert.deepEqual(input, [
      { id: 1, qty: 2 },
      { id: 1, qty: 1 },
    ]);
  });
});
