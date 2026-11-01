export const PUPPET_TURN_MS = 520;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** A flat leather puppet rotates around its vertical axis, through an edge. */
export class PuppetTurn {
  private facing: 1 | -1;
  private from: number;
  private to: number;
  private startedAt = 0;
  private duration = PUPPET_TURN_MS;
  private pausedAt: number | null = null;

  constructor(facing: 1 | -1) {
    this.facing = facing;
    this.from = this.to = facing === 1 ? 0 : Math.PI;
  }

  private angle(now: number) {
    const progress = Math.max(
      0,
      Math.min(1, (now - this.startedAt) / this.duration),
    );
    return this.from + (this.to - this.from) * smoothstep(progress);
  }

  sample(facing: 1 | -1, now: number, paused = false) {
    if (paused) this.pausedAt ??= now;
    else if (this.pausedAt !== null) {
      this.startedAt += now - this.pausedAt;
      this.pausedAt = null;
    }
    const time = this.pausedAt ?? now;
    if (facing !== this.facing) {
      this.from = this.angle(time);
      const base = facing === 1 ? 0 : Math.PI;
      this.to =
        base + Math.round((this.from - base) / (2 * Math.PI)) * 2 * Math.PI;
      this.duration = Math.max(
        80,
        (PUPPET_TURN_MS * Math.abs(this.to - this.from)) / Math.PI,
      );
      this.startedAt = time;
      this.facing = facing;
    }
    const active =
      this.from !== this.to && time < this.startedAt + this.duration;
    const angle = active ? this.angle(time) : this.to;
    return {
      horizontalScale: active ? Math.cos(angle) : facing,
      shear: active ? Math.sin(angle) * 0.035 : 0,
      active,
    };
  }
}
