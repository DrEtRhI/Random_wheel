export const LIGHTNESS = 0.78;
export const CHROMA = 0.11;

function circDist(a, b, n) {
  const d = Math.abs(a - b);
  return Math.min(d, n - d);
}

function minGapOf(order, n) {
  let minGap = Infinity;
  for (let i = 0; i < n; i++) {
    const d = circDist(order[i], order[(i + 1) % n], n);
    if (d < minGap) minGap = d;
  }
  return minGap;
}

export function circularMaxSeparationOrder(n) {
  if (n <= 2) return Array.from({ length: n }, (_, i) => i);

  const remaining = new Set(Array.from({ length: n }, (_, i) => i));
  const order = [0];
  remaining.delete(0);

  while (remaining.size > 0) {
    const last = order[order.length - 1];
    let best = null;
    let bestDist = -1;
    for (const cand of remaining) {
      const d = circDist(cand, last, n);
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    order.push(best);
    remaining.delete(best);
  }

  // Local 2-opt refinement: maximize the minimum circular gap.
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 500) {
    improved = false;
    iterations++;
    const currentMinGap = minGapOf(order, n);
    for (let i = 0; i < n - 1 && !improved; i++) {
      for (let j = i + 1; j < n && !improved; j++) {
        const trial = order
          .slice(0, i + 1)
          .concat(order.slice(i + 1, j + 1).reverse(), order.slice(j + 1));
        if (minGapOf(trial, n) > currentMinGap) {
          order.splice(0, order.length, ...trial);
          improved = true;
        }
      }
    }
  }

  return order;
}

export function oklchToHex(L, C, hueDegrees) {
  const h = (hueDegrees * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toSrgb = (c) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  r = toSrgb(r);
  g = toSrgb(g);
  bl = toSrgb(bl);

  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

export function generateSliceColors(n) {
  if (n <= 0) return [];
  const order = circularMaxSeparationOrder(n);
  const step = 360 / n;
  return order.map((hueIndex) => oklchToHex(LIGHTNESS, CHROMA, hueIndex * step));
}
