import { undoDepthPoint, type PuppetDepthProfile } from "./puppet-depth";
import type { HandSide, Pose } from "./core";

export interface StagePlacement { x: number; baseline: number; scale: number; lean: number; side?: HandSide }
export function constrainStageAnchor(x: number, baseline: number, side: HandSide) {
  return {
    x: Math.max(side === "Left" ? .08 : .501, Math.min(side === "Left" ? .499 : .92, x / 1280)) * 1280,
    baseline: Math.max(380, Math.min(700, baseline)),
  };
}
/** Hand movement stays inside the actor's assigned half of the stage. */
export function stageAnchor(pose: Pick<Pose, "x" | "y">, placement?: StagePlacement) {
  const x = (placement ? placement.x + (pose.x - .5) * .45 : pose.x) * 1280;
  const baseline = placement ? placement.baseline + (pose.y - .53) * 360 : pose.y * 720 + 365;
  return placement?.side ? constrainStageAnchor(x, baseline, placement.side) : { x, baseline };
}

export interface StageTransform {
  x: number;
  y: number;
  scale: number;
  facing: 1 | -1;
  angle: number;
  horizontalScale?: number;
  shear?: number;
  depth?: PuppetDepthProfile;
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
  const localX = ((dx * cos + dy * sin) / t.scale - (t.shear ?? 0) * localY) / horizontal;
  const local = t.depth ? undoDepthPoint(localX, localY, t.depth) : { x: localX, y: localY };
  return {
    x: local.x + 350,
    y: local.y + 400,
  };
}
