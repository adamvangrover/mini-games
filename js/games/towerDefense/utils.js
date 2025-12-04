export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}

export function drawNeonRect(ctx, x, y, w, h, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
}

export function drawNeonCircle(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
