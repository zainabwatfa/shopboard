// Tests for the pure product functions: checking API data, reading the
// filter controls, search, category filter and sort.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  filterProducts,
  findProduct,
  isProduct,
  parseCategory,
  parseSortKey,
  sortProducts,
} from "../src/modules/products/products.logic.ts";
import type { Category, Product } from "../src/modules/products/products.types.ts";

function product(
  id: number,
  name: string,
  category: Category,
  price: number,
  image: string,
): Product {
  return Object.freeze({ id, name, category, price, image });
}

// Real entries from public/api/products.json, out of id order on purpose.
// Frozen, so a function that changes its input throws instead of passing.
const PRODUCTS: readonly Product[] = Object.freeze([
  product(5, "Running Shoes", "Shoes", 110, "products/running-shoes.svg"),
  product(1, "Leather Tote Bag", "Bags", 89, "products/leather-tote-bag.svg"),
  product(9, "Sunglasses", "Accessories", 35, "products/sunglasses.svg"),
  product(7, "Hand Bag", "Bags", 25, "products/hand-bag.svg"),
  product(2, "Canvas Backpack", "Bags", 49, "products/canvas-backpack.svg"),
  product(8, "Silver Watch", "Accessories", 150, "products/silver-watch.svg"),
]);

const ids = (list: readonly Product[]): number[] => list.map((item) => item.id);

describe("isProduct", () => {
  const valid = {
    id: 1,
    name: "Leather Tote Bag",
    category: "Bags",
    price: 89,
    image: "products/leather-tote-bag.svg",
  };

  test("accepts a well-formed product", () => {
    assert.equal(isProduct(valid), true);
  });

  test("accepts a price of 0 and extra fields", () => {
    assert.equal(isProduct({ ...valid, price: 0 }), true);
    assert.equal(isProduct({ ...valid, description: "extra" }), true);
  });

  test("rejects values that are not objects", () => {
    for (const value of [null, undefined, 1, "product", true, [], [valid]]) {
      assert.equal(isProduct(value), false, `accepted ${JSON.stringify(value)}`);
    }
  });

  test("rejects a product with a missing field", () => {
    for (const key of ["id", "name", "category", "price", "image"]) {
      const copy: Record<string, unknown> = { ...valid };
      delete copy[key];
      assert.equal(isProduct(copy), false, `accepted a product without ${key}`);
    }
  });

  test("rejects fields of the wrong type or out of range", () => {
    const bad: Record<string, unknown>[] = [
      { id: "1" },
      { id: 1.5 },
      { id: Number.NaN },
      { name: 5 },
      { name: null },
      { category: "bags" }, // case matters
      { category: "Hats" },
      { category: "" },
      { price: "89" },
      { price: -1 },
      { price: Number.NaN },
      { price: Number.POSITIVE_INFINITY },
      { image: null },
      { image: 3 },
    ];
    for (const change of bad) {
      assert.equal(isProduct({ ...valid, ...change }), false, `accepted ${String(Object.values(change)[0])}`);
    }
  });

  test("rejects a price that JSON turns into Infinity", () => {
    const fromJson: unknown = JSON.parse(
      '{"id":1,"name":"Leather Tote Bag","category":"Bags","price":1e999,"image":"products/leather-tote-bag.svg"}',
    );
    assert.equal(isProduct(fromJson), false);
  });
});

describe("parseCategory", () => {
  test("keeps a known category", () => {
    assert.equal(parseCategory("Bags"), "Bags");
    assert.equal(parseCategory("Shoes"), "Shoes");
    assert.equal(parseCategory("Accessories"), "Accessories");
  });

  test("turns anything else into 'all'", () => {
    for (const value of ["all", "", "bags", " Bags", "Hats"]) {
      assert.equal(parseCategory(value), "all", `for ${JSON.stringify(value)}`);
    }
  });
});

describe("parseSortKey", () => {
  test("keeps a known sort key", () => {
    for (const key of ["default", "price-asc", "price-desc", "name-asc"]) {
      assert.equal(parseSortKey(key), key);
    }
  });

  test("turns anything else into 'default'", () => {
    for (const value of ["", "PRICE-ASC", "name-desc", "random"]) {
      assert.equal(parseSortKey(value), "default", `for ${JSON.stringify(value)}`);
    }
  });
});

describe("findProduct", () => {
  test("finds a product by id", () => {
    assert.equal(findProduct(PRODUCTS, 9)?.name, "Sunglasses");
  });

  test("returns undefined for an unknown id", () => {
    assert.equal(findProduct(PRODUCTS, 404), undefined);
    assert.equal(findProduct(PRODUCTS, Number.NaN), undefined);
    assert.equal(findProduct([], 1), undefined);
  });
});

describe("filterProducts", () => {
  test("an empty query and 'all' keep every product in the same order", () => {
    const result = filterProducts(PRODUCTS, "", "all");
    assert.deepEqual(ids(result), ids(PRODUCTS));
    assert.notEqual(result, PRODUCTS, "should return a new list");
  });

  test("a query of only spaces is the same as an empty query", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "   ", "all")), ids(PRODUCTS));
    assert.deepEqual(ids(filterProducts(PRODUCTS, "\t \n", "all")), ids(PRODUCTS));
  });

  test("search ignores case", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "LEATHER", "all")), [1]);
    assert.deepEqual(ids(filterProducts(PRODUCTS, "bag", "all")), [1, 7]);
    assert.deepEqual(ids(filterProducts(PRODUCTS, "BaG", "all")), [1, 7]);
  });

  test("search trims spaces around the query", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "  watch  ", "all")), [8]);
  });

  test("search looks at the name only, not the category", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "shoes", "all")), [5]); // "Running Shoes"
    assert.deepEqual(filterProducts(PRODUCTS, "accessories", "all"), []);
  });

  test("filters by category", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "", "Bags")), [1, 7, 2]);
    assert.deepEqual(ids(filterProducts(PRODUCTS, "", "Accessories")), [9, 8]);
  });

  test("combines search and category", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "bag", "Bags")), [1, 7]);
    assert.deepEqual(filterProducts(PRODUCTS, "bag", "Accessories"), []);
  });

  test("returns an empty list when nothing matches", () => {
    assert.deepEqual(filterProducts(PRODUCTS, "umbrella", "all"), []);
    assert.deepEqual(filterProducts([], "", "all"), []);
  });
});

describe("sortProducts", () => {
  test("price-asc: cheapest first", () => {
    assert.deepEqual(ids(sortProducts(PRODUCTS, "price-asc")), [7, 9, 2, 1, 5, 8]);
  });

  test("price-desc: most expensive first", () => {
    assert.deepEqual(ids(sortProducts(PRODUCTS, "price-desc")), [8, 5, 1, 2, 9, 7]);
  });

  test("name-asc: A to Z", () => {
    assert.deepEqual(
      sortProducts(PRODUCTS, "name-asc").map((item) => item.name),
      ["Canvas Backpack", "Hand Bag", "Leather Tote Bag", "Running Shoes", "Silver Watch", "Sunglasses"],
    );
  });

  test("default: id order", () => {
    assert.deepEqual(ids(sortProducts(PRODUCTS, "default")), [1, 2, 5, 7, 8, 9]);
  });

  test("sorts a copy and never changes the list it was given", () => {
    const before = ids(PRODUCTS);
    const result = sortProducts(PRODUCTS, "price-desc"); // PRODUCTS is frozen: sorting it in place would throw
    assert.notEqual(result, PRODUCTS);
    assert.deepEqual(ids(PRODUCTS), before);
  });

  test("default gives the same order again after another sort", () => {
    const byPrice = sortProducts(PRODUCTS, "price-desc");
    assert.deepEqual(ids(sortProducts(byPrice, "default")), ids(sortProducts(PRODUCTS, "default")));
  });

  test("products with the same price keep their order", () => {
    // Test data only: two products that cost the same
    const tied = Object.freeze([
      product(30, "Second", "Bags", 10, "a.svg"),
      product(20, "First", "Bags", 10, "b.svg"),
      product(10, "Cheapest", "Bags", 5, "c.svg"),
    ]);
    assert.deepEqual(ids(sortProducts(tied, "price-asc")), [10, 30, 20]);
    assert.deepEqual(ids(sortProducts(tied, "price-desc")), [30, 20, 10]);
  });

  test("an empty list stays empty", () => {
    assert.deepEqual(sortProducts([], "price-asc"), []);
  });
});
