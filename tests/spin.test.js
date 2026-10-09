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

  test("onTick fires once per slice boundary crossed during the spin", async () => {
    let tickCount = 0;
    const controller = createSpinController({
      ctx: makeFakeCtx(),
      getColors: (n) => Array(n).fill("#fff"),
      onTick: () => tickCount++,
    });

    const winner = await new Promise((resolve) => {
      controller.spin(NAMES, (w) => resolve(w));
    });

    // computeSpinTarget adds [3,5] full turns (1080-1800 deg) plus a [0,360)
    // offset, so the total rotation added lands in [1080, 2160). With 3
    // names (120 deg/slice) and starting from rotation 0, that's between
    // floor(1080/120)=9 and floor(just-under-2160/120)=17 boundary crossings.
    expect(tickCount).toBeGreaterThanOrEqual(9);
    expect(tickCount).toBeLessThanOrEqual(17);
    expect(NAMES.map((n) => n.id)).toContain(winner.id);
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

describe("createSpinController.playSpinEvent", () => {
  test("animates a shared spin event from elapsedMs=0 and calls onComplete with a winner from the event's names", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });

    const winner = await new Promise((resolve) => {
      controller.playSpinEvent(
        { startRotation: 0, targetRotation: 1234, names: NAMES, elapsedMs: 0 },
        (w) => resolve(w)
      );
      expect(controller.isSpinning()).toBe(true);
    });

    expect(NAMES.map((n) => n.id)).toContain(winner.id);
    expect(controller.isSpinning()).toBe(false);
    expect(controller.getRotation()).toBe(1234);
  });

  test("a spin event with elapsedMs already past the spin duration completes immediately at the target rotation", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });

    const winner = await new Promise((resolve) => {
      controller.playSpinEvent(
        { startRotation: 0, targetRotation: 1440, names: NAMES, elapsedMs: 999999 },
        (w) => resolve(w)
      );
    });

    expect(NAMES.map((n) => n.id)).toContain(winner.id);
    expect(controller.getRotation()).toBe(1440);
  });

  test("playSpinEvent() while already spinning is a no-op", async () => {
    const controller = createSpinController({ ctx: makeFakeCtx(), getColors: (n) => Array(n).fill("#fff") });
    let completions = 0;

    const first = new Promise((resolve) => {
      controller.playSpinEvent(
        { startRotation: 0, targetRotation: 1234, names: NAMES, elapsedMs: 0 },
        (w) => {
          completions++;
          resolve(w);
        }
      );
    });

    controller.playSpinEvent(
      { startRotation: 0, targetRotation: 999, names: NAMES, elapsedMs: 0 },
      () => {
        completions++;
      }
    );

    await first;
    expect(completions).toBe(1);
  });
});
