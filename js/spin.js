import { computeSpinTarget, computeWinnerIndex } from "./wheelGeometry.js";
import { renderWheel } from "./wheel.js";

const SPIN_DURATION_MS = 4000;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function createSpinController({ ctx, getColors }) {
  let rotationDeg = 0;
  let spinning = false;

  function draw(names) {
    renderWheel(ctx, {
      names: names.map((n) => n.text),
      colors: getColors(names.length),
      rotationDeg,
    });
  }

  function spin(names, onComplete) {
    if (spinning || names.length === 0) return;
    spinning = true;

    const startRotation = rotationDeg;
    const targetRotation = computeSpinTarget(startRotation);
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
      rotationDeg = startRotation + (targetRotation - startRotation) * easeOutCubic(t);
      draw(names);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        const winnerIndex = computeWinnerIndex(rotationDeg, names.length);
        onComplete(names[winnerIndex]);
      }
    }

    requestAnimationFrame(frame);
  }

  function isSpinning() {
    return spinning;
  }

  function getRotation() {
    return rotationDeg;
  }

  return { spin, isSpinning, draw, getRotation };
}
