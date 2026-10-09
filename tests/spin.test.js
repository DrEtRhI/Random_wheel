import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createSpinController } from "../js/spin.js";

// Polyfill requestAnimationFrame so the 4s animation runs instantly under test.
let originalRaf;

beforeEach(() => {
  originalRaf = global.requestAnimationFrame;
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
});

afterEach(() => {
  global.requestAnimationFrame = originalRaf;
});

function makeFakeCtx() {
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
    measureText: (text) => ({ width: text.length * 8 }),
    fillStyle: undefined,
    strokeStyle: undefined,
    lineWidth: undefined,
    textAlign: undefined,
    textBaseline: undefined,
    font: undefined,
  };
}

const NAMES = [
  { id: "a", text: "Alice" },
  { id: "b", text: "Bob" },
  { id: "c", text: "Carl" },
];

describe("createSpinController", () => {
  test("draw() runs without throwing and isSpinning() starts false", () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });
    expect(() => controller.draw(NAMES)).not.toThrow();
    expect(controller.isSpinning()).toBe(false);
  });

  test("spin() transitions isSpinning() to true then back to false, and calls onComplete with a winner from the input list", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });

    const result = await new Promise((resolve) => {
      controller.spin(NAMES, (winner) => resolve(winner));
      // Immediately after calling spin(), it should report spinning.
      expect(controller.isSpinning()).toBe(true);
    });

    expect(NAMES.map((n) => n.id)).toContain(result.id);
    expect(controller.isSpinning()).toBe(false);
  });

  test("a second concurrent spin() call while already spinning is a no-op", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });
    let completions = 0;

    const first = new Promise((resolve) => {
      controller.spin(NAMES, (winner) => {
        completions++;
        resolve(winner);
      });
    });

    // Attempt a second spin while the first is in flight — should be ignored.
    controller.spin(NAMES, () => {
      completions++;
    });

    await first;
    expect(completions).toBe(1);
  });

  test("spin() with an empty names array is a no-op and never calls onComplete", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });
    let called = false;
    controller.spin([], () => {
      called = true;
    });

    // Give any stray async work a chance to run.
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(called).toBe(false);
    expect(controller.isSpinning()).toBe(false);
  });
});
