import { describe, test, expect } from "bun:test";
import { createExclusionStore } from "../js/exclusionStore.js";

describe("createExclusionStore", () => {
  test("starts with no exclusions", () => {
    const store = createExclusionStore();
    expect(store.getExclusions().size).toBe(0);
    expect(store.isExcluded("a")).toBe(false);
  });

  test("excludeName adds an id", () => {
    const store = createExclusionStore();
    store.excludeName("alice-id");
    expect(store.isExcluded("alice-id")).toBe(true);
    expect(store.isExcluded("bob-id")).toBe(false);
  });

  test("excludeName accumulates multiple ids", () => {
    const store = createExclusionStore();
    store.excludeName("a");
    store.excludeName("b");
    expect(store.getExclusions()).toEqual(new Set(["a", "b"]));
  });

  test("clearExclusions empties the set", () => {
    const store = createExclusionStore();
    store.excludeName("a");
    store.clearExclusions();
    expect(store.getExclusions().size).toBe(0);
  });

  test("separate store instances do not share state", () => {
    const storeA = createExclusionStore();
    storeA.excludeName("a");
    const storeB = createExclusionStore();
    expect(storeB.isExcluded("a")).toBe(false);
  });
});
