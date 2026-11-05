// Tests for the theme choice: checking values from outside the code, and
// saving/loading through a fake localStorage (theme.state.ts reads it on
// every call, so one import is enough).
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseThemeChoice } from "../src/modules/theme/theme.logic.ts";

const KEY = "shopboard-theme";

// A small in-memory stand-in for the browser's localStorage
class FakeStorage {
  data = new Map<string, string>();
  fail = false; // like storage blocked by the browser

  getItem(key: string): string | null {
    if (this.fail)
      throw new DOMException("The operation is insecure.", "SecurityError");
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail)
      throw new DOMException(
        "The quota has been exceeded.",
        "QuotaExceededError",
      );
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    if (this.fail)
      throw new DOMException("The operation is insecure.", "SecurityError");
    this.data.delete(key);
  }
}

const storage = new FakeStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
const { getThemeChoice, saveThemeChoice } =
  await import("../src/modules/theme/theme.state.ts");

describe("parseThemeChoice", () => {
  test("keeps the three known choices", () => {
    assert.equal(parseThemeChoice("system"), "system");
    assert.equal(parseThemeChoice("light"), "light");
    assert.equal(parseThemeChoice("dark"), "dark");
  });

  test("anything else means system", () => {
    for (const value of [
      null,
      undefined,
      "",
      "Dark",
      " dark",
      "blue",
      1,
      {},
      ["dark"],
    ]) {
      assert.equal(parseThemeChoice(value), "system");
    }
  });
});

describe("theme state", () => {
  beforeEach(() => {
    storage.data.clear();
    storage.fail = false;
  });

  test("nothing saved means system", () => {
    assert.equal(getThemeChoice(), "system");
  });

  test("light and dark are saved as plain text the <head> script can read", () => {
    saveThemeChoice("dark");
    assert.equal(storage.data.get(KEY), "dark");
    assert.equal(getThemeChoice(), "dark");

    saveThemeChoice("light");
    assert.equal(storage.data.get(KEY), "light");
    assert.equal(getThemeChoice(), "light");
  });

  test("system removes the saved choice", () => {
    saveThemeChoice("dark");
    saveThemeChoice("system");
    assert.equal(storage.data.has(KEY), false);
    assert.equal(getThemeChoice(), "system");
  });

  test("a bad saved value means system", () => {
    storage.data.set(KEY, '"dark"');
    assert.equal(getThemeChoice(), "system");
  });

  test("another tab's choice is read on the next call", () => {
    storage.data.set(KEY, "light");
    assert.equal(getThemeChoice(), "light");
  });

  test("blocked storage never throws", () => {
    storage.fail = true;
    assert.equal(getThemeChoice(), "system");
    assert.doesNotThrow(() => saveThemeChoice("dark"));
    assert.doesNotThrow(() => saveThemeChoice("system"));
  });
});
