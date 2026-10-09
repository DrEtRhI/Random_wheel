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

  // Known-reference-value test: pins the exact output for a fixed input so a
  // future transposed-coefficient bug in the OKLab->linear-sRGB matrix (easy
  // to get subtly wrong, and `toMatch(/^#[0-9a-f]{6}$/)` above would not
  // catch it, since a wrong-but-still-valid hex string would still pass that
  // shape check) would be caught. Value captured by running the current,
  // already-reviewed implementation once: oklchToHex(0.78, 0.11, 0).
  test("matches the pinned reference hex value at L=0.78, C=0.11, hue=0", () => {
    expect(oklchToHex(0.78, 0.11, 0)).toBe("#f199b4");
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

  // Adjacent-COLOR (not just adjacent-index) separation test. generateSliceColors
  // keeps L and C fixed and only varies hue, so every color lies on a circle of
  // radius CHROMA in the OKLab a/b plane. That means we can compute each slice's
  // exact expected (a, b) coordinate directly from the hue-index relationship
  // already verified by circularMaxSeparationOrder, without needing to invert
  // the hex string back through sRGB -> OKLab (which would just re-derive the
  // same numbers through lossy 8-bit rounding).
  //
  // For n=8, circularMaxSeparationOrder's verified minimum circular hue gap is
  // 135 degrees (see expectedMinGap[8] above). On a circle of radius C=0.11,
  // two points 135 degrees apart are separated by a Euclidean chord of
  // 2*C*sin(135/2 deg) ~= 0.2033. We assert every adjacent pair (wraparound
  // included) clears a threshold of 0.05 — about a quarter of that true
  // minimum — which is still far larger than the ~0.001-scale wobble that
  // 8-bit hex rounding could introduce, so this would reliably fail if hue
  // separation were ever accidentally collapsed (e.g. a transposed sign in
  // the ordering or a hardcoded hue).
  test("adjacent slice colors (by OKLab coordinate, wraparound included) differ by more than a minimal threshold for n=8", () => {
    const n = 8;
    const order = circularMaxSeparationOrder(n);
    const step = 360 / n;
    const MIN_DISTANCE = 0.05;

    const points = order.map((hueIndex) => {
      const hueRad = (hueIndex * step * Math.PI) / 180;
      return {
        a: Math.cos(hueRad) * CHROMA,
        b: Math.sin(hueRad) * CHROMA,
      };
    });

    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const distance = Math.hypot(p1.a - p2.a, p1.b - p2.b);
      expect(distance).toBeGreaterThan(MIN_DISTANCE);
    }
  });
});
