// Stage choreography for the cast itself (not the hand-driven pose): a puppet
// is lowered onto the screen from above, lifted away the same way, and carried
// in an arc when it changes place, as a puppeteer would move it by its rod.
export const ENTER_MS = 520;
export const EXIT_MS = 420;
export const MOVE_MS = 680;
/** How far above its mark a puppet starts or leaves, in stage pixels. */
export const DROP = 150;
/** Peak lift of the carry arc, in stage pixels. */
export const LIFT = 70;

const unit = (t: number) => Math.max(0, Math.min(1, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 3;
const easeInOut = (t: number) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

export interface Fade { dy: number; alpha: number; done: boolean }
/** Entering: fades in while settling down from above onto its mark. */
export function enterFade(elapsed: number): Fade {
  const t = unit(elapsed / ENTER_MS), e = easeOut(t);
  return { dy: -(1 - e) * DROP, alpha: e, done: t >= 1 };
}
/** Leaving: lifts up and away while fading out. */
export function exitFade(elapsed: number): Fade {
  const t = unit(elapsed / EXIT_MS), e = easeIn(t);
  return { dy: -e * DROP, alpha: 1 - e, done: t >= 1 };
}

export interface Mark { x: number; baseline: number }
export interface Carry { x: number; baseline: number; lean: number; done: boolean }
/** Carried between marks: eased travel, lifted in an arc, leaning into the move. */
export function carry(from: Mark, to: Mark, elapsed: number): Carry {
  const t = unit(elapsed / MOVE_MS), e = easeInOut(t), arc = Math.sin(Math.PI * t);
  const distance = to.x - from.x, reach = Math.min(1, Math.abs(distance) / 320);
  return {
    x: from.x + distance * e,
    baseline: from.baseline + (to.baseline - from.baseline) * e - arc * LIFT * reach,
    lean: arc * .09 * Math.sign(distance) * reach,
    done: t >= 1,
  };
}
