// Checks the real product data in public/api/products.json: every entry is a
// product the app accepts, ids are unique, and every picture exists and uses a
// relative path (no leading "/"), so the site also works under /shopboard/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isProduct } from "../src/modules/products/products.logic.ts";

const publicDir = new URL("../public/", import.meta.url);
const data: unknown = JSON.parse(
  readFileSync(new URL("api/products.json", publicDir), "utf8"),
);
const list: unknown[] = Array.isArray(data) ? data : [];

test("products.json is a non-empty list", () => {
  assert.ok(Array.isArray(data));
  assert.ok(list.length > 0);
});

test("every entry passes isProduct, so none is silently dropped", () => {
  list.forEach((entry, index) => {
    assert.ok(
      isProduct(entry),
      `entry ${index} is not a valid product: ${JSON.stringify(entry)}`,
    );
  });
});

test("product ids are unique", () => {
  const ids = list.filter(isProduct).map((product) => product.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every image path is relative and the file exists in public/", () => {
  for (const product of list.filter(isProduct)) {
    assert.ok(
      !product.image.startsWith("/"),
      `${product.name}: "${product.image}" starts with "/"`,
    );
    assert.ok(
      !product.image.includes("://"),
      `${product.name}: "${product.image}" is not a local path`,
    );
    assert.ok(
      existsSync(new URL(product.image, publicDir)),
      `${product.name}: ${product.image} is missing`,
    );
  }
});
