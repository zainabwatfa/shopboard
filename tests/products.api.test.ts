// Tests for loading products: the request goes through fetchJson, bad entries
// are dropped, and every failure becomes an ApiError. fetch is replaced by a
// stub, so nothing goes to the network.
import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/shared/api/client.ts";
import { getProducts } from "../src/modules/products/products.api.ts";

const realFetch = globalThis.fetch;
const requested: string[] = [];

function stubFetch(respond: () => Promise<Response>): void {
  globalThis.fetch = (input: string | URL | Request): Promise<Response> => {
    requested.push(String(input));
    return respond();
  };
}

const json = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  globalThis.fetch = realFetch;
  requested.length = 0;
});

describe("getProducts", () => {
  test("asks for the relative URL, so the site works under a sub-folder", async () => {
    stubFetch(() => json([]));
    await getProducts();
    assert.deepEqual(requested, ["api/products.json"]);
  });

  test("keeps only the entries that are products", async () => {
    stubFetch(() =>
      json([
        {
          id: 1,
          name: "Leather Tote Bag",
          category: "Bags",
          price: 89,
          image: "products/leather-tote-bag.svg",
        },
        {
          id: 2,
          name: "Canvas Backpack",
          category: "bags",
          price: 49,
          image: "products/canvas-backpack.svg",
        },
        null,
        {
          id: 9,
          name: "Sunglasses",
          category: "Accessories",
          price: 35,
          image: "products/sunglasses.svg",
        },
      ]),
    );
    const products = await getProducts();
    assert.deepEqual(
      products.map((product) => product.id),
      [1, 9],
    );
  });

  test("a body that is not a list is an ApiError", async () => {
    stubFetch(() => json({ products: [] }));
    await assert.rejects(
      getProducts(),
      (error) => error instanceof ApiError && error.status === 200,
    );
  });

  test("an HTTP error is an ApiError with its status", async () => {
    stubFetch(() => json({}, 404));
    await assert.rejects(
      getProducts(),
      (error) => error instanceof ApiError && error.status === 404,
    );
  });

  test("a network failure is an ApiError with status 0", async () => {
    const cause = new TypeError("Failed to fetch");
    stubFetch(() => Promise.reject(cause));
    await assert.rejects(
      getProducts(),
      (error) =>
        error instanceof ApiError &&
        error.status === 0 &&
        error.cause === cause,
    );
  });

  test("a body that is not JSON is an ApiError", async () => {
    stubFetch(() =>
      Promise.resolve(new Response("<!doctype html>", { status: 200 })),
    );
    await assert.rejects(getProducts(), (error) => error instanceof ApiError);
  });
});
