// Tests for the pure product functions: checking API data, reading the
// filter controls and the filters in the address bar, search, category
// filter, sort, and the product page (the id from the address bar,
// "More in <category>").
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTERS,
  filterProducts,
  findProduct,
  getRelatedProducts,
  getSearchWords,
  isProduct,
  parseCategory,
  parseFilterQuery,
  parseFilters,
  parseProductId,
  parseSortKey,
  sortProducts,
  toFilterQuery,
} from "../src/modules/products/products.logic.ts";
import type {
  Category,
  Filters,
  Product,
} from "../src/modules/products/products.types.ts";

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

// Every entry of public/api/products.json, frozen
const ALL: readonly Product[] = Object.freeze([
  product(1, "Leather Tote Bag", "Bags", 89, "products/leather-tote-bag.svg"),
  product(2, "Canvas Backpack", "Bags", 49, "products/canvas-backpack.svg"),
  product(
    3,
    "Mini Crossbody Bag",
    "Bags",
    39,
    "products/mini-crossbody-bag.svg",
  ),
  product(4, "White Sneakers", "Shoes", 75, "products/white-sneakers.svg"),
  product(5, "Running Shoes", "Shoes", 110, "products/running-shoes.svg"),
  product(6, "Suede Loafers", "Shoes", 95, "products/suede-loafers.svg"),
  product(7, "Hand Bag", "Bags", 25, "products/hand-bag.svg"),
  product(8, "Silver Watch", "Accessories", 150, "products/silver-watch.svg"),
  product(9, "Sunglasses", "Accessories", 35, "products/sunglasses.svg"),
  product(
    10,
    "Travel Duffel Bag",
    "Bags",
    120,
    "products/travel-duffel-bag.svg",
  ),
  product(11, "Rain Boots", "Shoes", 60, "products/rain-boots.svg"),
  product(12, "Leather Belt", "Accessories", 30, "products/leather-belt.svg"),
  product(
    13,
    "Leather Wallet",
    "Accessories",
    45,
    "products/leather-wallet.svg",
  ),
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
      assert.equal(
        isProduct(value),
        false,
        `accepted ${JSON.stringify(value)}`,
      );
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
      assert.equal(
        isProduct({ ...valid, ...change }),
        false,
        `accepted ${String(Object.values(change)[0])}`,
      );
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
      assert.equal(
        parseSortKey(value),
        "default",
        `for ${JSON.stringify(value)}`,
      );
    }
  });
});

describe("getSearchWords", () => {
  test("splits on any spaces and ignores case", () => {
    assert.deepEqual(getSearchWords("Leather Bag"), ["leather", "bag"]);
    assert.deepEqual(getSearchWords("  leather \t\n  BAG  "), [
      "leather",
      "bag",
    ]);
  });

  test("an empty query or only spaces gives no words", () => {
    assert.deepEqual(getSearchWords(""), []);
    assert.deepEqual(getSearchWords(" \t\n "), []);
  });
});

describe("parseFilters", () => {
  test("checks the category and sort, and keeps the search text as typed", () => {
    assert.deepEqual(
      parseFilters({ query: " tote ", category: "Shoes", sortKey: "name-asc" }),
      {
        query: " tote ",
        category: "Shoes",
        sortKey: "name-asc",
      },
    );
  });

  test("an unknown category or sort gives the default", () => {
    assert.deepEqual(
      parseFilters({ query: "", category: "Hats", sortKey: "cheapest" }),
      DEFAULT_FILTERS,
    );
  });
});

describe("DEFAULT_FILTERS", () => {
  test("is no search, every category, default order, and frozen", () => {
    assert.deepEqual(DEFAULT_FILTERS, {
      query: "",
      category: "all",
      sortKey: "default",
    });
    assert.equal(Object.isFrozen(DEFAULT_FILTERS), true);
  });
});

describe("parseFilterQuery", () => {
  test("reads q, category and sort", () => {
    assert.deepEqual(parseFilterQuery("?q=tote&category=Bags&sort=price-asc"), {
      query: "tote",
      category: "Bags",
      sortKey: "price-asc",
    });
  });

  test("works with or without the leading ?, in any order", () => {
    assert.deepEqual(parseFilterQuery("sort=name-asc&category=Shoes"), {
      query: "",
      category: "Shoes",
      sortKey: "name-asc",
    });
  });

  test("nothing in the address gives the defaults", () => {
    assert.deepEqual(parseFilterQuery(""), DEFAULT_FILTERS);
    assert.deepEqual(parseFilterQuery("?"), DEFAULT_FILTERS);
    assert.deepEqual(
      parseFilterQuery("?id=3&utm_source=mail"),
      DEFAULT_FILTERS,
    );
  });

  test("an unknown category or sort gives the default", () => {
    for (const search of [
      "?category=bags",
      "?category=Hats",
      "?category=",
      "?category",
      "?category=all",
    ]) {
      assert.equal(parseFilterQuery(search).category, "all", `for ${search}`);
    }
    for (const search of [
      "?sort=PRICE-ASC",
      "?sort=cheapest",
      "?sort=",
      "?sort=default",
    ]) {
      assert.equal(
        parseFilterQuery(search).sortKey,
        "default",
        `for ${search}`,
      );
    }
  });

  test("decodes the search text and drops the spaces around it", () => {
    assert.equal(parseFilterQuery("?q=leather+bag").query, "leather bag");
    assert.equal(
      parseFilterQuery("?q=%20%20leather%20bag%20").query,
      "leather bag",
    );
    assert.equal(parseFilterQuery("?q=a%26b%3Dc").query, "a&b=c");
    assert.equal(parseFilterQuery("?q=").query, "");
  });

  test("a value given twice uses the first one", () => {
    assert.deepEqual(
      parseFilterQuery("?q=tote&q=belt&category=Shoes&category=Bags"),
      {
        query: "tote",
        category: "Shoes",
        sortKey: "default",
      },
    );
  });
});

describe("toFilterQuery", () => {
  test("the defaults give an empty query: just shop.html", () => {
    assert.equal(toFilterQuery(DEFAULT_FILTERS), "");
    assert.equal(
      toFilterQuery({ query: "   ", category: "all", sortKey: "default" }),
      "",
    );
  });

  test("leaves out defaults and keeps the order q, category, sort", () => {
    assert.equal(
      toFilterQuery({
        query: "leather bag",
        category: "Bags",
        sortKey: "price-asc",
      }),
      "?q=leather+bag&category=Bags&sort=price-asc",
    );
    assert.equal(
      toFilterQuery({ query: "", category: "Shoes", sortKey: "default" }),
      "?category=Shoes",
    );
    assert.equal(
      toFilterQuery({ query: "", category: "all", sortKey: "name-asc" }),
      "?sort=name-asc",
    );
  });

  test("trims the search text and encodes characters that mean something in a link", () => {
    assert.equal(
      toFilterQuery({ query: "  tote ", category: "all", sortKey: "default" }),
      "?q=tote",
    );
    assert.equal(
      toFilterQuery({ query: "a&b=c#d", category: "all", sortKey: "default" }),
      "?q=a%26b%3Dc%23d",
    );
  });

  test("parseFilterQuery reads back the same filters", () => {
    const cases: Filters[] = [
      { query: "", category: "all", sortKey: "default" },
      { query: "leather bag", category: "Bags", sortKey: "price-asc" },
      { query: "a&b=c#d?e+f", category: "Accessories", sortKey: "price-desc" },
      { query: "Größe 42", category: "Shoes", sortKey: "name-asc" },
    ];
    for (const filters of cases) {
      assert.deepEqual(parseFilterQuery(toFilterQuery(filters)), filters);
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
    assert.deepEqual(
      ids(filterProducts(PRODUCTS, "   ", "all")),
      ids(PRODUCTS),
    );
    assert.deepEqual(
      ids(filterProducts(PRODUCTS, "\t \n", "all")),
      ids(PRODUCTS),
    );
  });

  test("search ignores case", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "LEATHER", "all")), [1]);
    assert.deepEqual(ids(filterProducts(PRODUCTS, "bag", "all")), [1, 7, 2]); // 2 is in Bags
    assert.deepEqual(ids(filterProducts(PRODUCTS, "BaG", "all")), [1, 7, 2]);
  });

  test("search trims spaces around the query", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "  watch  ", "all")), [8]);
  });

  test("search also looks at the category", () => {
    assert.deepEqual(ids(filterProducts(ALL, "shoes", "all")), [4, 5, 6, 11]);
    assert.deepEqual(ids(filterProducts(ALL, "Bags", "all")), [1, 2, 3, 7, 10]);
    assert.deepEqual(
      ids(filterProducts(ALL, "accessories", "all")),
      [8, 9, 12, 13],
    );
  });

  test("every word must match, in any order, with any spaces between", () => {
    assert.deepEqual(ids(filterProducts(ALL, "leather bag", "all")), [1]);
    assert.deepEqual(ids(filterProducts(ALL, "bag leather", "all")), [1]);
    assert.deepEqual(
      ids(filterProducts(ALL, "  Leather \t  BAG ", "all")),
      [1],
    );
    assert.deepEqual(
      ids(filterProducts(ALL, "leather accessories", "all")),
      [12, 13],
    );
    assert.deepEqual(filterProducts(ALL, "leather shoes", "all"), []);
  });

  test("a plural finds the singular and the other way round", () => {
    assert.deepEqual(ids(filterProducts(ALL, "shoe", "all")), [4, 5, 6, 11]);
    assert.deepEqual(ids(filterProducts(ALL, "wallets", "all")), [13]);
    assert.deepEqual(ids(filterProducts(ALL, "watches", "all")), [8]);
    assert.deepEqual(
      ids(filterProducts(ALL, "accessory", "all")),
      [8, 9, 12, 13],
    );
    assert.deepEqual(ids(filterProducts(ALL, "leather bags", "all")), [1]);
    assert.deepEqual(ids(filterProducts(ALL, "boot", "all")), [11]);
  });

  test("part of a word matches, so results appear while typing", () => {
    assert.deepEqual(ids(filterProducts(ALL, "lea", "all")), [1, 12, 13]);
    assert.deepEqual(ids(filterProducts(ALL, "leather wal", "all")), [13]);
    assert.deepEqual(ids(filterProducts(ALL, "glasses", "all")), [9]); // in "Sunglasses"
  });

  test("filters by category", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "", "Bags")), [1, 7, 2]);
    assert.deepEqual(ids(filterProducts(PRODUCTS, "", "Accessories")), [9, 8]);
  });

  test("combines search and category", () => {
    assert.deepEqual(ids(filterProducts(PRODUCTS, "bag", "Bags")), [1, 7, 2]);
    assert.deepEqual(filterProducts(PRODUCTS, "bag", "Accessories"), []);
    assert.deepEqual(
      ids(filterProducts(ALL, "leather", "Accessories")),
      [12, 13],
    );
    assert.deepEqual(filterProducts(ALL, "shoes", "Bags"), []);
  });

  test("returns an empty list when nothing matches", () => {
    assert.deepEqual(filterProducts(PRODUCTS, "umbrella", "all"), []);
    assert.deepEqual(filterProducts([], "", "all"), []);
  });
});

describe("sortProducts", () => {
  test("price-asc: cheapest first", () => {
    assert.deepEqual(
      ids(sortProducts(PRODUCTS, "price-asc")),
      [7, 9, 2, 1, 5, 8],
    );
  });

  test("price-desc: most expensive first", () => {
    assert.deepEqual(
      ids(sortProducts(PRODUCTS, "price-desc")),
      [8, 5, 1, 2, 9, 7],
    );
  });

  test("name-asc: A to Z", () => {
    assert.deepEqual(
      sortProducts(PRODUCTS, "name-asc").map((item) => item.name),
      [
        "Canvas Backpack",
        "Hand Bag",
        "Leather Tote Bag",
        "Running Shoes",
        "Silver Watch",
        "Sunglasses",
      ],
    );
  });

  test("default: id order", () => {
    assert.deepEqual(
      ids(sortProducts(PRODUCTS, "default")),
      [1, 2, 5, 7, 8, 9],
    );
  });

  test("sorts a copy and never changes the list it was given", () => {
    const before = ids(PRODUCTS);
    const result = sortProducts(PRODUCTS, "price-desc"); // PRODUCTS is frozen: sorting it in place would throw
    assert.notEqual(result, PRODUCTS);
    assert.deepEqual(ids(PRODUCTS), before);
  });

  test("default gives the same order again after another sort", () => {
    const byPrice = sortProducts(PRODUCTS, "price-desc");
    assert.deepEqual(
      ids(sortProducts(byPrice, "default")),
      ids(sortProducts(PRODUCTS, "default")),
    );
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

describe("parseProductId", () => {
  test("reads a whole number", () => {
    assert.equal(parseProductId("3"), 3);
    assert.equal(parseProductId("13"), 13);
    assert.equal(parseProductId("0"), 0); // a number, even if no product has it
  });

  test("ignores spaces around the number", () => {
    assert.equal(parseProductId("  3 "), 3);
    assert.equal(parseProductId("\t3\n"), 3);
  });

  test("a missing id gives null", () => {
    assert.equal(parseProductId(null), null);
  });

  test("anything that is not only digits gives null", () => {
    const bad = [
      "",
      "   ",
      "abc",
      "3abc",
      "abc3",
      "1.5",
      "1.0",
      "-2",
      "+3",
      "1e2",
      "0x10",
      "3 4",
      "Infinity",
      "NaN",
      "\u0661",
    ]; // "\u0661" is the Arabic-Indic digit one
    for (const value of bad) {
      assert.equal(parseProductId(value), null, `for ${JSON.stringify(value)}`);
    }
  });

  test("a number too big to be exact gives null", () => {
    assert.equal(parseProductId("99999999999999999999"), null);
    assert.equal(parseProductId(String(2 ** 53)), null);
    assert.equal(
      parseProductId(String(Number.MAX_SAFE_INTEGER)),
      Number.MAX_SAFE_INTEGER,
    );
  });
});

describe("getRelatedProducts", () => {
  const get = (id: number): Product => {
    const found = findProduct(ALL, id);
    assert.ok(found, `no product ${id} in the test data`);
    return found;
  };

  test("gives other products of the same category, never the product itself", () => {
    assert.deepEqual(ids(getRelatedProducts(ALL, get(4))), [5, 6, 11]);
    assert.deepEqual(ids(getRelatedProducts(ALL, get(9))), [8, 12, 13]);
  });

  test("gives at most 4, in id order", () => {
    assert.deepEqual(ids(getRelatedProducts(ALL, get(3))), [1, 2, 7, 10]);
    assert.deepEqual(ids(getRelatedProducts(ALL, get(10))), [1, 2, 3, 7]);
  });

  test("uses id order even when the list is in another order", () => {
    assert.deepEqual(ids(getRelatedProducts(PRODUCTS, get(1))), [2, 7]);
  });

  test("a smaller limit gives fewer; 0 or less gives none", () => {
    assert.deepEqual(ids(getRelatedProducts(ALL, get(1), 2)), [2, 3]);
    assert.deepEqual(getRelatedProducts(ALL, get(1), 0), []);
    assert.deepEqual(getRelatedProducts(ALL, get(1), -1), []);
  });

  test("a category with no other product gives an empty list", () => {
    const onlyOne = Object.freeze([get(8), get(1)]);
    assert.deepEqual(getRelatedProducts(onlyOne, get(8)), []);
    assert.deepEqual(getRelatedProducts([], get(8)), []);
  });

  test("never changes the list it was given", () => {
    const before = ids(PRODUCTS);
    const result = getRelatedProducts(PRODUCTS, get(1)); // PRODUCTS is frozen: changing it would throw
    assert.notEqual(result, PRODUCTS);
    assert.deepEqual(ids(PRODUCTS), before);
  });
});
