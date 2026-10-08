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
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "16px sans-serif";
    ctx.fillText(names[i], radius - 10, 0);
    ctx.restore();
  }

  ctx.restore();
}
