function truncateToWidth(ctx, text, maxWidth) {
  if (typeof ctx.measureText !== "function") return text;
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
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
    ctx.font = `${Math.min(16, radius * sliceAngle * 0.8)}px sans-serif`;
    const labelText = truncateToWidth(ctx, names[i], radius - 20);
    ctx.fillText(labelText, isLeftHalf ? -(radius - 10) : radius - 10, 0);
    ctx.restore();
  }

  ctx.restore();
}
