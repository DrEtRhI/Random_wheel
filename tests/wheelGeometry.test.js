import { describe, test, expect } from "bun:test";
import { computeWinnerIndex, computeSpinTarget } from "../js/wheelGeometry.js";

describe("computeWinnerIndex", () => {
  test("returns -1 for zero slices", () => {
    expect(computeWinnerIndex(0, 0)).toBe(-1);
  });

  test("always returns 0 for a single slice, regardless of rotation", () => {
    expect(computeWinnerIndex(0, 1)).toBe(0);
    expect(computeWinnerIndex(123, 1)).toBe(0);
    expect(computeWinnerIndex(-45, 1)).toBe(0);
  });

  test("maps known rotations to known slices for 4 slices", () => {
    expect(computeWinnerIndex(0, 4)).toBe(2);
    expect(computeWinnerIndex(90, 4)).toBe(1);
    expect(computeWinnerIndex(180, 4)).toBe(0);
    expect(computeWinnerIndex(270, 4)).toBe(3);
  });

  test("is consistent modulo 360", () => {
    expect(computeWinnerIndex(360, 4)).toBe(computeWinnerIndex(0, 4));
    expect(computeWinnerIndex(405, 4)).toBe(computeWinnerIndex(45, 4));
  });

  test("handles negative rotations via modulo wraparound", () => {
    expect(computeWinnerIndex(-90, 4)).toBe(computeWinnerIndex(270, 4));
  });
});

describe("computeSpinTarget", () => {
  function mockRandom(values) {
    let i = 0;
    return () => values[i++ % values.length];
  }

  test("adds between 3 and 5 full turns plus an offset (low end)", () => {
    const target = computeSpinTarget(0, mockRandom([0, 0]));
    expect(target).toBeCloseTo(1080, 5); // 3 full turns, 0 offset
  });

  test("adds between 3 and 5 full turns plus an offset (high end)", () => {
    const target = computeSpinTarget(0, mockRandom([0.999999, 0.999999]));
    // extraSpins = 3 + floor(0.999999 * 3) = 5; offset = 0.999999 * 360
    expect(target).toBeCloseTo(1800 + 0.999999 * 360, 3);
  });

  test("is always strictly greater than the current rotation", () => {
    const target = computeSpinTarget(500, mockRandom([0.5, 0.5]));
    expect(target).toBeGreaterThan(500);
  });

  test("offsets from the current rotation, not from zero", () => {
    const a = computeSpinTarget(0, mockRandom([0, 0]));
    const b = computeSpinTarget(720, mockRandom([0, 0]));
    expect(b - a).toBeCloseTo(720, 5);
  });
});
