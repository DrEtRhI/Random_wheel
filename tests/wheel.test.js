import { describe, test, expect } from "bun:test";
import { renderWheel } from "../js/wheel.js";

function makeFakeCtx({ withMeasureText = true } = {}) {
  return {
    canvas: { width: 500, height: 500 },
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    moveTo: () => {},
    arc: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
    measureText: withMeasureText
      ? (text) => ({ width: text.length * 8 })
      : undefined,
    fillStyle: undefined,
    strokeStyle: undefined,
    lineWidth: undefined,
    textAlign: undefined,
    textBaseline: undefined,
    font: undefined,
  };
}

describe("renderWheel", () => {
  test("renders the empty state with no names without throwing", () => {
    const ctx = makeFakeCtx();
    expect(() => {
      renderWheel(ctx, { names: [], colors: [], rotationDeg: 0 });
    }).not.toThrow();
  });

  test("renders a handful of slices without throwing", () => {
    const ctx = makeFakeCtx();
    expect(() => {
      renderWheel(ctx, {
        names: ["Alice", "Bob", "Carl", "Dana"],
        colors: ["#f199b4", "#99c77f", "#5ec6ec", "#d2a2e8"],
        rotationDeg: 45,
      });
    }).not.toThrow();
  });

  test("renders slices spanning the left half (upside-down label fix) without throwing", () => {
    const ctx = makeFakeCtx();
    // With many slices, several midpoints land in (pi/2, 3pi/2), i.e. the
    // left half of the wheel, exercising the flipped-rotation label branch.
    const names = Array.from({ length: 12 }, (_, i) => `Name${i}`);
    const colors = Array.from({ length: 12 }, () => "#cccccc");
    expect(() => {
      renderWheel(ctx, { names, colors, rotationDeg: 0 });
    }).not.toThrow();
  });

  test("renders without throwing when the ctx has no measureText (truncation falls back gracefully)", () => {
    const ctx = makeFakeCtx({ withMeasureText: false });
    expect(() => {
      renderWheel(ctx, {
        names: ["A very extremely long name that might overflow a slice"],
        colors: ["#f199b4"],
        rotationDeg: 0,
      });
    }).not.toThrow();
  });

  test("single name renders without throwing", () => {
    const ctx = makeFakeCtx();
    expect(() => {
      renderWheel(ctx, { names: ["Solo"], colors: ["#f199b4"], rotationDeg: 0 });
    }).not.toThrow();
  });
});
