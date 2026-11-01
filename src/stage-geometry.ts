export interface StageTransform {
  x: number;
  y: number;
  scale: number;
  facing: 1 | -1;
  angle: number;
  horizontalScale?: number;
  shear?: number;
}
/** Canvas uses contain: reject clicks in letterboxing rather than shifting targets. */
export function stagePoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  const scale = Math.min(rect.width / 1280, rect.height / 720);
  if (scale <= 0) return null;
  const x = (clientX - rect.left - (rect.width - 1280 * scale) / 2) / scale;
  const y = (clientY - rect.top - (rect.height - 720 * scale) / 2) / scale;
  return x >= 0 && x <= 1280 && y >= 0 && y <= 720 ? { x, y } : null;
}
export function actorPoint(x: number, y: number, t: StageTransform) {
  const dx = x - t.x,
    dy = y - t.y,
    cos = Math.cos(t.angle),
    sin = Math.sin(t.angle);
  const horizontal = t.horizontalScale ?? t.facing;
  if (Math.abs(horizontal) < 0.03) return { x: Infinity, y: Infinity };
  const localY = (-dx * sin + dy * cos) / t.scale;
  return {
    x:
      ((dx * cos + dy * sin) / t.scale - (t.shear ?? 0) * localY) / horizontal +
      350,
    y: localY + 400,
  };
}
