// Tests for reading <body data-page>: parsePage is the check behind
// getCurrentPage, so it can be tested without a browser page.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "../src/shared/ui/page.ts";

describe("parsePage", () => {
  test("keeps every known page", () => {
    const known = [
      "home",
      "shop",
      "cart",
      "product",
      "checkout",
      "contact",
      "about",
      "faq",
      "shipping",
      "privacy",
      "terms",
      "credits",
      "notfound",
    ];
    for (const value of known) {
      assert.equal(parsePage(value), value);
    }
  });

  test("a missing or unknown value gives null, never 'home'", () => {
    for (const value of [undefined, "", "Home", " shop", "shop ", "wishlist", "404", "shipping-returns"]) {
      assert.equal(parsePage(value), null, `for ${JSON.stringify(value)}`);
    }
  });
});
