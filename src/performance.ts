import type { Action } from "./core";
import type { CharacterId } from "./characters";

export interface DemoPerformance {
  values: Record<Action, number>;
  x: number;
  y: number;
  angle: number;
}
const wave = (t: number, rate: number) => (1 + Math.sin(t * rate)) / 2;
/** Demonstration choreography only. Live hand inputs never receive autonomous character motion. */
export function demoPerformance(id: CharacterId, t: number): DemoPerformance {
  const result: DemoPerformance = {
    values: { mouth: 0, rightArm: 0.16, leftArm: 0.12, head: 0, flip: 0 },
    x: 0.5,
    y: 0.5,
    angle: 0,
  };
  const v = result.values;
  if (id === "theng") {
    const phase = t % 8;
    v.mouth = phase < 3.2 || phase > 4.8 ? wave(t, 6) * 0.85 : 0;
    v.rightArm = 0.22 + 0.6 * wave(t, 1.8);
    v.leftArm = 0.12 + 0.3 * wave(t + 1, 1.4);
    v.head = 0.12 * wave(t, 2.4);
    result.x += 0.055 * Math.sin(t * 0.65);
    result.angle = 0.07 * Math.sin(t * 1.1);
  } else if (id === "prayut") {
    const phase = t % 10, speaking = phase < 5.5;
    v.mouth = speaking ? 0.55 * wave(t, 5.6) : 0;
    v.rightArm = speaking ? 0.28 + 0.38 * wave(t, 1.5) : 0.16;
    v.leftArm = speaking ? 0.2 + 0.22 * wave(t + 1, 1.1) : 0.12;
    v.head = speaking ? 0.1 * wave(t, 2.1) : 0.16;
    result.angle = 0.018 * Math.sin(t * 1.2);
  } else if (id === "thaksin") {
    const phase = t % 10, speaking = phase > 2 && phase < 7.5;
    v.mouth = speaking ? .18 + .48 * wave(t, 4.8) : .06;
    v.rightArm = speaking ? .2 + .25 * wave(t, 1.2) : .16;
    v.leftArm = speaking ? .18 + .28 * wave(t + 1, 1.1) : .12;
    v.head = .08 + .11 * wave(t, 1.7);
    result.angle = .025 * Math.sin(t * .9);
  } else if (id === "nunui") {
    const phase = t % 9,
      speaking = phase > 3 && phase < 7;
    v.mouth = speaking ? 0.7 * wave(t, 4) : 0;
    v.rightArm = speaking ? 0.2 + 0.26 * wave(t, 1.7) : 0.13;
    v.leftArm = 0.12;
    v.head = speaking ? 0.15 + 0.25 * wave(t, 3) : 0.38 + 0.15 * wave(t, 1.1);
    result.y += 0.025 * wave(t, 1.2);
    result.angle = 0.025 * Math.sin(t);
  } else if (id === "sikaew") {
    const phase = t % 8;
    v.rightArm = phase < 2.5 ? 0.68 : 0.18;
    v.leftArm = 0.16;
    v.mouth = phase > 2.5 && phase < 5.5 ? 0.6 * wave(t, 4.6) : 0;
    v.head = 0.05 * wave(t, 1.4);
  } else if (id === "yodthong") {
    const phase = t % 9,
      retreat = phase > 3 && phase < 5;
    v.mouth = retreat ? 0 : 0.85 * wave(t, 6.5);
    v.rightArm = retreat ? 0.13 : 0.3 + 0.52 * wave(t, 2.3);
    v.leftArm = retreat ? 0.16 : 0.14 + 0.38 * wave(t + 1, 2);
    v.head = retreat ? 0.65 : 0.17 * wave(t, 2);
    result.x -= retreat ? 0.11 : 0;
    result.angle = retreat ? -0.12 : 0.045 * Math.sin(t);
  } else {
    const phase = t % 10;
    v.rightArm = phase < 3 ? 0.47 : 0.22;
    v.leftArm = 0.13 + 0.12 * wave(t, 1);
    v.mouth = phase < 7 ? 0.62 * wave(t, 4.2) : 0;
    v.head = 0.12 * wave(t, 1.3);
    result.angle = 0.025 * Math.sin(t * 0.7);
  }
  const phase = t % 12;
  v.flip = phase > 9 && phase < 10.3 ? 1 : 0;
  return result;
}
