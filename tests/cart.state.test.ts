// Tests for the cart state: loading at import time, every change, another tab
// changing the same saved cart, and saves that fail.
//
// cart.state.ts reads localStorage as soon as it is imported, so each test
// puts a fake storage in place first and then imports a fresh copy of the
// module. Each copy has its own cart in memory, like a separate browser tab.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { CartItem } from "../src/modules/cart/cart.types.ts";

type CartState = typeof import("../src/modules/cart/cart.state.ts");

const KEY = "shopboard-cart";

// A small in-memory stand-in for the browser's localStorage
class FakeStorage {
  data = new Map<string, string>();
  failGet = false; // like storage blocked by the browser
  failSet = false; // like storage full
  setCalls = 0;

  get length(): number {
    return this.data.size;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    if (this.failGet)
      throw new DOMException("The operation is insecure.", "SecurityError");
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.failSet)
      throw new DOMException(
        "The quota has been exceeded.",
        "QuotaExceededError",
      );
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }

  // Helpers for the tests: what another tab would save, and what is saved now
  write(items: unknown): void {
    this.data.set(KEY, JSON.stringify(items));
  }
  saved(): unknown {
    const text = this.data.get(KEY);
    return text === undefined ? undefined : JSON.parse(text);
  }
}

let copies = 0;

// Puts `storage` in place, then imports a fresh copy of cart.state.ts
async function openTab(storage: FakeStorage): Promise<CartState> {
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  copies += 1;
  return import(`../src/modules/cart/cart.state.ts?tab=${copies}`);
}

// A storage that already holds a cart, and a tab that loaded it
async function setup(
  items?: CartItem[],
): Promise<{ storage: FakeStorage; tab: CartState }> {
  const storage = new FakeStorage();
  if (items) storage.write(items);
  const tab = await openTab(storage);
  storage.setCalls = 0;
  return { storage, tab };
}

describe("loading at import time", () => {
  test("starts empty when nothing is saved", async () => {
    const { tab } = await setup();
    assert.deepEqual(tab.getCart(), []);
  });

  test("loads the saved cart and keeps only well-formed { id, qty } items", async () => {
    const storage = new FakeStorage();
    storage.write([
      { id: 1, qty: 2, price: 0 },
      { id: "2", qty: 1 },
      { id: 3, qty: 0 },
      { id: 4, qty: -1 },
      { id: 5, qty: 1.5 },
      null,
      "junk",
      { id: 6, qty: 1 },
    ]);
    const tab = await openTab(storage);
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 2 },
      { id: 6, qty: 1 },
    ]);
  });

  test("merges the same id saved twice into one line", async () => {
    const { tab } = await setup([
      { id: 1, qty: 2 },
      { id: 1, qty: 3 },
    ]);
    assert.deepEqual(tab.getCart(), [{ id: 1, qty: 5 }]);
  });

  test("starts empty when the saved text is not valid JSON", async () => {
    const storage = new FakeStorage();
    storage.data.set(KEY, "{oops");
    const tab = await openTab(storage);
    assert.deepEqual(tab.getCart(), []);
  });

  test("starts empty when the saved JSON is not a list", async () => {
    const storage = new FakeStorage();
    storage.write({ id: 1, qty: 1 });
    const tab = await openTab(storage);
    assert.deepEqual(tab.getCart(), []);
  });

  test("works in memory when storage is blocked", async () => {
    const storage = new FakeStorage();
    storage.failGet = true;
    storage.failSet = true;
    const tab = await openTab(storage); // must not throw
    assert.deepEqual(tab.getCart(), []);
    tab.addToCart(1);
    tab.addToCart(1);
    tab.addToCart(9);
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 2 },
      { id: 9, qty: 1 },
    ]);
  });
});

describe("changes", () => {
  test("adding the same product twice gives one line with qty 2", async () => {
    const { storage, tab } = await setup();
    tab.addToCart(1);
    tab.addToCart(1);
    assert.deepEqual(tab.getCart(), [{ id: 1, qty: 2 }]);
    assert.equal(storage.data.get(KEY), '[{"id":1,"qty":2}]');
  });

  test("saves only id and qty", async () => {
    const { storage, tab } = await setup();
    tab.addToCart(1);
    tab.addToCart(9);
    const saved = storage.saved();
    assert.ok(Array.isArray(saved));
    for (const entry of saved) {
      assert.deepEqual(Object.keys(entry), ["id", "qty"]);
    }
  });

  test("changeQty goes up and down by 1", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 2 }]);
    tab.changeQty(1, 1);
    assert.deepEqual(storage.saved(), [{ id: 1, qty: 3 }]);
    tab.changeQty(1, -1);
    tab.changeQty(1, -1);
    assert.deepEqual(tab.getCart(), [{ id: 1, qty: 1 }]);
  });

  test("decreasing a quantity of 1 removes the product, never saving 0", async () => {
    const { storage, tab } = await setup([
      { id: 1, qty: 1 },
      { id: 9, qty: 2 },
    ]);
    tab.changeQty(1, -1);
    assert.deepEqual(tab.getCart(), [{ id: 9, qty: 2 }]);
    assert.deepEqual(storage.saved(), [{ id: 9, qty: 2 }]);
  });

  test("changeQty on a product that is not in the cart changes and saves nothing", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    tab.changeQty(404, 1);
    tab.changeQty(404, -1);
    assert.deepEqual(tab.getCart(), [{ id: 1, qty: 1 }]);
    assert.equal(storage.setCalls, 0);
  });

  test("removeFromCart removes only that product", async () => {
    const { storage, tab } = await setup([
      { id: 1, qty: 3 },
      { id: 9, qty: 1 },
    ]);
    tab.removeFromCart(1);
    assert.deepEqual(storage.saved(), [{ id: 9, qty: 1 }]);
  });

  test("clearCart saves an empty list", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 3 }]);
    tab.clearCart();
    assert.deepEqual(tab.getCart(), []);
    assert.equal(storage.data.get(KEY), "[]");
  });

  test("keepOnly drops products that no longer exist, and saves", async () => {
    const { storage, tab } = await setup([
      { id: 1, qty: 1 },
      { id: 404, qty: 2 },
      { id: 9, qty: 1 },
    ]);
    tab.keepOnly([1, 9, 12]);
    assert.deepEqual(storage.saved(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 1 },
    ]);
  });

  test("keepOnly saves nothing when every product still exists", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    tab.keepOnly([1, 9]);
    assert.equal(storage.setCalls, 0);
  });

  test("getCart returns copies, so changing them changes nothing", async () => {
    const { tab } = await setup([{ id: 1, qty: 1 }]);
    const copy = tab.getCart();
    const first = copy[0];
    assert.ok(first);
    first.qty = 99;
    copy.push({ id: 9, qty: 1 });
    assert.deepEqual(tab.getCart(), [{ id: 1, qty: 1 }]);
  });
});

describe("another tab changes the saved cart", () => {
  test("reloadCart picks up what the other tab saved", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.write([
      { id: 1, qty: 4 },
      { id: 9, qty: 1 },
    ]);
    assert.deepEqual(
      tab.getCart(),
      [{ id: 1, qty: 1 }],
      "nothing changes before reloadCart",
    );
    tab.reloadCart();
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 4 },
      { id: 9, qty: 1 },
    ]);
  });

  test("reloadCart checks what the other tab saved", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.data.set(KEY, '[{"id":9,"qty":-3},{"id":12,"qty":1}]');
    tab.reloadCart();
    assert.deepEqual(tab.getCart(), [{ id: 12, qty: 1 }]);
    storage.data.set(KEY, "not json");
    tab.reloadCart();
    assert.deepEqual(tab.getCart(), []);
  });

  test("addToCart keeps the other tab's items", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.write([
      { id: 1, qty: 1 },
      { id: 9, qty: 2 },
    ]);
    tab.addToCart(12);
    assert.deepEqual(storage.saved(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 2 },
      { id: 12, qty: 1 },
    ]);
  });

  test("changeQty builds on the other tab's quantity", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.write([{ id: 1, qty: 5 }]);
    tab.changeQty(1, 1);
    assert.deepEqual(storage.saved(), [{ id: 1, qty: 6 }]);
  });

  test("changeQty -1 removes a product the other tab lowered to 1", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 3 }]);
    storage.write([{ id: 1, qty: 1 }]);
    tab.changeQty(1, -1);
    assert.deepEqual(storage.saved(), []);
  });

  test("changeQty does not bring back a product the other tab removed", async () => {
    const { storage, tab } = await setup([
      { id: 1, qty: 3 },
      { id: 9, qty: 1 },
    ]);
    storage.write([{ id: 9, qty: 1 }]);
    tab.changeQty(1, 1);
    tab.removeFromCart(9);
    assert.deepEqual(storage.saved(), []);
  });

  test("addToCart after the other tab cleared the cart starts from empty", async () => {
    const { storage, tab } = await setup([
      { id: 1, qty: 3 },
      { id: 9, qty: 1 },
    ]);
    storage.removeItem(KEY);
    tab.addToCart(12);
    assert.deepEqual(storage.saved(), [{ id: 12, qty: 1 }]);
  });

  test("keepOnly keeps the other tab's new items", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.write([
      { id: 1, qty: 1 },
      { id: 9, qty: 1 },
      { id: 404, qty: 1 },
    ]);
    tab.keepOnly([1, 9]);
    assert.deepEqual(storage.saved(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 1 },
    ]);
  });

  test("two tabs taking turns never lose each other's changes", async () => {
    const storage = new FakeStorage();
    const tabA = await openTab(storage);
    const tabB = await openTab(storage);
    tabA.addToCart(1);
    tabB.addToCart(9);
    tabA.addToCart(1);
    tabB.changeQty(1, 1);
    tabA.removeFromCart(9);
    assert.deepEqual(storage.saved(), [{ id: 1, qty: 3 }]);
    tabB.reloadCart();
    assert.deepEqual(tabB.getCart(), tabA.getCart());
  });
});

describe("a save fails", () => {
  test("the change still shows, and nothing throws", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.failSet = true;
    tab.addToCart(9);
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 1 },
    ]);
    assert.deepEqual(
      storage.saved(),
      [{ id: 1, qty: 1 }],
      "storage keeps the older cart",
    );
  });

  test("reloadCart keeps the newer cart in memory instead of the older saved one", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.failSet = true;
    tab.addToCart(9);
    tab.reloadCart();
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 1 },
    ]);
  });

  test("once saving works again, the whole cart is saved and reloading resumes", async () => {
    const { storage, tab } = await setup([{ id: 1, qty: 1 }]);
    storage.failSet = true;
    tab.addToCart(9);
    tab.changeQty(9, 1);
    assert.deepEqual(tab.getCart(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 2 },
    ]);

    storage.failSet = false;
    tab.addToCart(12);
    assert.deepEqual(storage.saved(), [
      { id: 1, qty: 1 },
      { id: 9, qty: 2 },
      { id: 12, qty: 1 },
    ]);

    // Saves work again, so the next reload reads storage
    storage.write([{ id: 12, qty: 7 }]);
    tab.reloadCart();
    assert.deepEqual(tab.getCart(), [{ id: 12, qty: 7 }]);
  });
});
