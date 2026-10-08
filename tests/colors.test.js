import { describe, test, expect } from "bun:test";
import {
  oklchToHex,
  circularMaxSeparationOrder,
  generateSliceColors,
  LIGHTNESS,
  CHROMA,
} from "../js/colors.js";

function circDist(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function minCircularGapDegrees(order, n) {
  const step = 360 / n;
  let minGap = Infinity;
  for (let i = 0; i < n; i++) {
    const d = circDist(order[i], order[(i + 1) % n], n);
    minGap = Math.min(minGap, d * step);
  }
  return minGap;
}

describe("oklchToHex", () => {
  test("returns a well-formed hex color", () => {
    expect(oklchToHex(LIGHTNESS, CHROMA, 0)).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("different hues produce different colors", () => {
    const a = oklchToHex(LIGHTNESS, CHROMA, 0);
    const b = oklchToHex(LIGHTNESS, CHROMA, 180);
    expect(a).not.toBe(b);
  });
});

describe("circularMaxSeparationOrder", () => {
  test.each([3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40, 50])(
    "returns a valid permutation of 0..n-1 for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const sorted = [...order].sort((a, b) => a - b);
      expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  );

  const expectedMinGap = {
    3: 120, 4: 90, 5: 144, 6: 120, 7: 154.2857142857143, 8: 135, 9: 160,
    10: 144, 12: 150, 15: 168, 16: 157.5, 20: 162, 24: 165, 30: 168,
    40: 171, 50: 172.8,
  };

  test.each(Object.keys(expectedMinGap).map(Number))(
    "achieves the verified minimum circular gap for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const gap = minCircularGapDegrees(order, n);
      expect(gap).toBeCloseTo(expectedMinGap[n], 5);
    }
  );

  test.each([4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40, 50])(
    "beats or matches naive sequential order for n=%d",
    (n) => {
      const order = circularMaxSeparationOrder(n);
      const naive = Array.from({ length: n }, (_, i) => i);
      const gap = minCircularGapDegrees(order, n);
      const naiveGap = minCircularGapDegrees(naive, n);
      expect(gap).toBeGreaterThanOrEqual(naiveGap);
    }
  );
});

describe("generateSliceColors", () => {
  test("returns an empty array for n=0", () => {
    expect(generateSliceColors(0)).toEqual([]);
  });

  test("returns one color for n=1", () => {
    const colors = generateSliceColors(1);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("returns n distinct hex colors", () => {
    const colors = generateSliceColors(8);
    expect(colors).toHaveLength(8);
    expect(new Set(colors).size).toBe(8);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});
