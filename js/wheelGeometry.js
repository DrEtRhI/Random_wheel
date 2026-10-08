export function computeWinnerIndex(finalRotationDeg, sliceCount) {
  if (sliceCount <= 0) return -1;
  const step = 360 / sliceCount;
  const normalizedRotation = ((finalRotationDeg % 360) + 360) % 360;
  const pointerAngleInWheelFrame = ((180 - normalizedRotation) % 360 + 360) % 360;
  return Math.floor(pointerAngleInWheelFrame / step);
}

export function computeSpinTarget(currentRotationDeg, randomFn = Math.random) {
  const extraSpins = 3 + Math.floor(randomFn() * 3); // 3, 4, or 5 extra full turns
  const offset = randomFn() * 360;
  return currentRotationDeg + extraSpins * 360 + offset;
}
