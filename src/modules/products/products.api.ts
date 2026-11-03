// Loads the product list from the server.
import { ApiError, fetchJson } from "../../shared/api/client.ts";
import { isProduct } from "./products.logic.ts";
import type { Product } from "./products.types.ts";

// No leading "/": the path starts from the page, so it also works when the
// site lives in a sub-folder (GitHub Pages serves it under /shopboard/)
const PRODUCTS_URL = "api/products.json";

// Asks for `unknown`, because nothing guarantees what the server sends,
// then keeps only the entries that really are products.
export async function getProducts(): Promise<Product[]> {
  const data = await fetchJson<unknown>(PRODUCTS_URL);
  if (!Array.isArray(data)) {
    throw new ApiError(`${PRODUCTS_URL} did not return a list`, 200, PRODUCTS_URL);
  }
  return data.filter(isProduct);
}
