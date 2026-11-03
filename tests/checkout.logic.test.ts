// Tests for the pure checkout functions: the first name for "Thanks, Sam!" and
// the confirmation built from the form and the order summary.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildConfirmation, getFirstName } from "../src/modules/checkout/checkout.logic.ts";
import type { CartLine } from "../src/modules/cart/cart.types.ts";
import type { CheckoutFormValues, CheckoutSummary } from "../src/modules/checkout/checkout.types.ts";
import type { Product } from "../src/modules/products/products.types.ts";

// Real entries from public/api/products.json, frozen so nothing can change them
const TOTE: Product = Object.freeze({ id: 1, name: "Leather Tote Bag", category: "Bags", price: 89, image: "products/leather-tote-bag.svg" });
const GLASSES: Product = Object.freeze({ id: 9, name: "Sunglasses", category: "Accessories", price: 35, image: "products/sunglasses.svg" });

// Test data only: what someone could type in the form
function form(fullName: string): CheckoutFormValues {
  return Object.freeze({
    fullName,
    email: "sam@example.com",
    address: "1 Example Street",
    city: "Example City",
    postalCode: "12345",
    country: "Example Country",
  });
}

// Frozen in place, so a function that changes its input throws instead of passing
const LINES: CartLine[] = [
  Object.freeze({ product: TOTE, qty: 2, lineTotal: 178 }),
  Object.freeze({ product: GLASSES, qty: 1, lineTotal: 35 }),
];
Object.freeze(LINES);
const SUMMARY: CheckoutSummary = Object.freeze({ lines: LINES, count: 3, total: 213 });

describe("getFirstName", () => {
  test("gives the first word of the full name", () => {
    assert.equal(getFirstName("Sam Lee"), "Sam");
    assert.equal(getFirstName("Ana María López"), "Ana");
    assert.equal(getFirstName("Zainab"), "Zainab");
  });

  test("ignores spaces, tabs and line breaks around and between words", () => {
    assert.equal(getFirstName("   Sam    Lee  "), "Sam");
    assert.equal(getFirstName("\tSam\nLee"), "Sam");
    assert.equal(getFirstName(" Sam Lee"), "Sam"); // non-breaking spaces
  });

  test("keeps letters from any language and punctuation inside a word", () => {
    // An Arabic name ("Sara Ahmad"), written as escapes so this file stays in English
    assert.equal(getFirstName("\u0633\u0627\u0631\u0629 \u0623\u062d\u0645\u062f"), "\u0633\u0627\u0631\u0629");
    assert.equal(getFirstName("Jean-Luc Picard"), "Jean-Luc");
    assert.equal(getFirstName("O'Neil"), "O'Neil");
  });

  test("an empty name, or only spaces, gives an empty string", () => {
    assert.equal(getFirstName(""), "");
    assert.equal(getFirstName("    "), "");
    assert.equal(getFirstName("\t\n"), "");
  });
});

describe("buildConfirmation", () => {
  test("thanks the customer by first name", () => {
    assert.equal(buildConfirmation(form("  Sam Lee "), SUMMARY).heading, "Thanks, Sam!");
  });

  test("says just 'Thanks!' when there is no name to use", () => {
    assert.equal(buildConfirmation(form("   "), SUMMARY).heading, "Thanks!");
    assert.equal(buildConfirmation(form(""), SUMMARY).heading, "Thanks!");
  });

  test("keeps the order summary: lines, item count and total", () => {
    const { summary } = buildConfirmation(form("Sam"), SUMMARY);
    assert.deepEqual(
      summary.lines.map((line) => [line.product.name, line.qty, line.lineTotal]),
      [
        ["Leather Tote Bag", 2, 178],
        ["Sunglasses", 1, 35],
      ],
    );
    assert.equal(summary.count, 3);
    assert.equal(summary.total, 213);
  });

  test("copies the summary and never changes its inputs", () => {
    // SUMMARY and the form values are frozen: changing them would throw
    const values = form("Sam Lee");
    const { summary } = buildConfirmation(values, SUMMARY);
    assert.notEqual(summary, SUMMARY);
    assert.notEqual(summary.lines, SUMMARY.lines);
    assert.notEqual(summary.lines[0], SUMMARY.lines[0]);
    assert.equal(values.fullName, "Sam Lee");
    assert.equal(SUMMARY.lines.length, 2);
  });

  test("an empty summary stays empty", () => {
    const { summary } = buildConfirmation(form("Sam"), { lines: [], count: 0, total: 0 });
    assert.deepEqual(summary, { lines: [], count: 0, total: 0 });
  });
});
