import { computeSpinTarget, computeWinnerIndex } from "./wheelGeometry.js";
import { renderWheel } from "./wheel.js";

export const SPIN_DURATION_MS = 4000;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function createSpinController({ ctx, getColors, onTick }) {
  let rotationDeg = 0;
  let spinning = false;

  function draw(names) {
    renderWheel(ctx, {
      names: names.map((n) => n.text),
      colors: getColors(names.length),
      rotationDeg,
    });
  }

  function animate({ names, startRotation, targetRotation, elapsedMs, onComplete }) {
    spinning = true;

    const animStart = performance.now() - elapsedMs;
    const sliceAngleDeg = 360 / names.length;
    const startingRotation =
      startRotation + (targetRotation - startRotation) * easeOutCubic(Math.min(elapsedMs / SPIN_DURATION_MS, 1));
    let lastBoundaryCrossed = Math.floor(startingRotation / sliceAngleDeg);

    function frame(now) {
      const elapsed = now - animStart;
      const t = Math.min(elapsed / SPIN_DURATION_MS, 1);
      rotationDeg = startRotation + (targetRotation - startRotation) * easeOutCubic(t);
      draw(names);

      if (onTick) {
        const boundaryNow = Math.floor(rotationDeg / sliceAngleDeg);
        if (boundaryNow > lastBoundaryCrossed) {
          for (let i = lastBoundaryCrossed; i < boundaryNow; i++) onTick();
          lastBoundaryCrossed = boundaryNow;
        }
      }

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

  function spin(names, onComplete) {
    if (spinning || names.length === 0) return;
    const startRotation = rotationDeg;
    const targetRotation = computeSpinTarget(startRotation);
    animate({ names, startRotation, targetRotation, elapsedMs: 0, onComplete });
    return { startRotation, targetRotation };
  }

  function playSpinEvent({ names, startRotation, targetRotation, elapsedMs }, onComplete) {
    if (spinning || !names || names.length === 0) return;
    animate({ names, startRotation, targetRotation, elapsedMs, onComplete });
  }

  function isSpinning() {
    return spinning;
  }

  function getRotation() {
    return rotationDeg;
  }

  return { spin, playSpinEvent, isSpinning, draw, getRotation };
}
