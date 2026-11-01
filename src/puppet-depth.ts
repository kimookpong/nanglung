export interface PuppetDepthProfile { start: number; end: number }
export const PUPPET_DEPTH_GROWTH = 0.07;

/** Local puppet coordinates: the head stays at 1×; the feet grow to 1.07×. */
export function depthProgress(y: number, profile: PuppetDepthProfile) {
  return Math.max(0, Math.min(1, (y - profile.start) / (profile.end - profile.start)));
}
export function depthPoint(x: number, y: number, profile: PuppetDepthProfile) {
  const t = depthProgress(y, profile), scale = 1 + PUPPET_DEPTH_GROWTH * t * t;
  return { x: x * scale, y: profile.start + (y - profile.start) * scale };
}
/** Invert the monotonic projection for pixel-accurate picking, including turns. */
export function undoDepthPoint(x: number, y: number, profile: PuppetDepthProfile) {
  if (y <= profile.start) return { x, y };
  const height = profile.end - profile.start, v = (y - profile.start) / height;
  let t = v / (1 + PUPPET_DEPTH_GROWTH);
  if (v < 1 + PUPPET_DEPTH_GROWTH)
    for (let i = 0; i < 5; i++)
      t -= (t + PUPPET_DEPTH_GROWTH * t ** 3 - v) / (1 + 3 * PUPPET_DEPTH_GROWTH * t * t);
  const scale = 1 + PUPPET_DEPTH_GROWTH * Math.min(1, t) ** 2;
  return { x: x / scale, y: profile.start + height * t };
}

const canvas = () => {
  const c = document.createElement("canvas"); c.width = 700; c.height = 800; return c;
};
/** Shared scratch surfaces; only changed puppet artwork is recomposited. */
export class PuppetDepthRenderer {
  private warped = canvas();
  private layer = canvas();
  private masks = new Map<string, CanvasGradient[]>();

  render(source: HTMLCanvasElement, target: HTMLCanvasElement, profile: PuppetDepthProfile) {
    const warp = this.warped.getContext("2d")!, layer = this.layer.getContext("2d")!, out = target.getContext("2d")!;
    warp.clearRect(0, 0, 700, 800);
    const start = Math.max(0, Math.floor(profile.start + 400));
    warp.drawImage(source, 0, 0, 700, start, 0, 0, 700, start);
    for (let row = start; row < 800; row += 4) {
      const height = Math.min(4, 800 - row), middle = row + height / 2 - 400;
      const left = depthPoint(-350, middle, profile).x + 350;
      const top = depthPoint(0, row - 400, profile).y + 400;
      const bottom = depthPoint(0, row + height - 400, profile).y + 400;
      warp.drawImage(source, 0, row, 700, height, left, top, 700 - 2 * left, bottom - top + 0.25);
    }
    const levels = [0, 1 / 3, 2 / 3, 1], blur = [0, 2, 5, 9];
    const key = `${profile.start}:${profile.end}`;
    let masks = this.masks.get(key);
    if (!masks) {
      masks = levels.map((level) => {
        const gradient = layer.createLinearGradient(0, 0, 0, 800);
        const stops = [0, ...levels.map(t => depthPoint(0, profile.start + t * (profile.end - profile.start), profile).y + 400), 800];
        stops.forEach((y, stop) => {
          const t = stop === 0 ? 0 : stop === stops.length - 1 ? 1 : levels[stop - 1];
          const alpha = Math.max(0, 1 - Math.abs(t - level) * 3);
          gradient.addColorStop(Math.max(0, Math.min(1, y / 800)), `rgba(255,255,255,${alpha})`);
        });
        return gradient;
      });
      this.masks.set(key, masks);
    }
    out.clearRect(0, 0, 700, 800); out.save(); out.globalCompositeOperation = "lighter";
    for (let i = 0; i < levels.length; i++) {
      layer.clearRect(0, 0, 700, 800); layer.save();
      layer.filter = blur[i] ? `blur(${blur[i]}px)` : "none";
      layer.drawImage(this.warped, 0, 0); layer.filter = "none";
      layer.globalCompositeOperation = "destination-in"; layer.fillStyle = masks[i]; layer.fillRect(0, 0, 700, 800); layer.restore();
      out.drawImage(this.layer, 0, 0);
    }
    out.restore();
  }
}
