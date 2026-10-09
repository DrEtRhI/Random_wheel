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

  test("shrinks the font below the max for a long name that wouldn't fit at full size", () => {
    const ctx = makeFakeCtx(); // measureText(text) => text.length * 8, independent of font size
    const longName = "A".repeat(40); // 320px wide per the fake measureText — wider than the 480px-ish slice radius allows at max font
    renderWheel(ctx, { names: [longName], colors: ["#f199b4"], rotationDeg: 0 });

    const finalFontPx = parseFloat(ctx.font);
    expect(finalFontPx).toBeGreaterThan(0);
    expect(finalFontPx).toBeLessThan(28);
  });

  test("uses a uniform font size across all slices, driven by the longest name", () => {
    const ctx = makeFakeCtx();
    const fonts = [];
    const originalFontSetter = ctx;
    // Capture every font value assigned during the render by wrapping fillText,
    // which runs once per slice right after ctx.font is set for that slice.
    ctx.fillText = () => fonts.push(ctx.font);

    renderWheel(ctx, {
      names: ["Al", "A much much longer name than the others", "Bo"],
      colors: ["#f199b4", "#99c77f", "#5ec6ec"],
      rotationDeg: 0,
    });

    expect(fonts).toHaveLength(3);
    expect(new Set(fonts).size).toBe(1); // every slice used the same font size
  });
});
