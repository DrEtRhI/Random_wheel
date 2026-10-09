function truncateToWidth(ctx, text, maxWidth) {
  if (typeof ctx.measureText !== "function") return text;
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

const MAX_LABEL_FONT_PX = 28;
const MIN_LABEL_FONT_PX = 6;
const fontSizeCache = new Map();

function computeLabelFontSize(ctx, names, sliceAngle, radius, maxWidth) {
  if (typeof ctx.measureText !== "function") return MAX_LABEL_FONT_PX;

  const cacheKey = `${names.join("")}|${radius.toFixed(1)}|${sliceAngle.toFixed(4)}`;
  const cached = fontSizeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let longest = "";
  for (const name of names) {
    if (name.length > longest.length) longest = name;
  }

  const angleCap = Math.max(MIN_LABEL_FONT_PX, radius * sliceAngle * 0.8);
  let lo = MIN_LABEL_FONT_PX;
  let hi = Math.min(MAX_LABEL_FONT_PX, angleCap);
  let best = lo;

  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    ctx.font = `${mid}px sans-serif`;
    const width = ctx.measureText(longest).width;
    if (width <= maxWidth) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  fontSizeCache.set(cacheKey, best);
  return best;
}

export function renderWheel(ctx, { names, colors, rotationDeg }) {
  const canvas = ctx.canvas;
  const size = Math.min(canvas.width, canvas.height);
  const radius = size / 2 - 4;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (names.length === 0) {
    ctx.save();
    ctx.fillStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const n = names.length;
  const sliceAngle = (Math.PI * 2) / n;
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const maxLabelWidth = radius - 20;
  const fontSize = computeLabelFontSize(ctx, names, sliceAngle, radius, maxLabelWidth);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationRad);

  for (let i = 0; i < n; i++) {
    const start = i * sliceAngle;
    const end = start + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = start + sliceAngle / 2;
    const normalizedMid = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const isLeftHalf = normalizedMid > Math.PI / 2 && normalizedMid < (3 * Math.PI) / 2;

    ctx.save();
    ctx.rotate(isLeftHalf ? mid + Math.PI : mid);
    ctx.textAlign = isLeftHalf ? "left" : "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1e1e1e";
    ctx.font = `${fontSize}px sans-serif`;
    // computeLabelFontSize already guarantees the longest name fits at
    // this size; truncation here is only a safety net for pathological
    // cases (e.g. very wide glyphs) so a label can never visually
    // overflow its slice.
    const labelText = truncateToWidth(ctx, names[i], maxLabelWidth);
    ctx.fillText(labelText, isLeftHalf ? -(radius - 10) : radius - 10, 0);
    ctx.restore();
  }

  ctx.restore();
}
