import type { Pose } from "./core";
import { stageAnchor, type StagePlacement } from "./stage-geometry";

/** Paint from the center outward so the actors nearest either edge are in front. */
export function stagePaintOrder<T extends { pose: Pick<Pose, "x" | "y">; placement?: StagePlacement }>(actors: readonly T[]): T[] {
  return actors
    .map(actor => {
      const { x } = stageAnchor(actor.pose, actor.placement);
      return { actor, edgeDistance: Math.min(x, 1280 - x) };
    })
    .sort((a, b) => b.edgeDistance - a.edgeDistance)
    .map(({ actor }) => actor);
}
