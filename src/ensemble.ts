import { PuppetController, extractSignal, type HandSide, type Point, type Settings, type Signal } from "./core";
import type { TrackingResult } from "./camera";

export const HAND_SIDES: HandSide[] = ["Left", "Right"];
export function activeHands(settings: Settings): HandSide[] {
  return settings.handMode === "dual" ? HAND_SIDES : [settings.hand];
}
export function handSettings(settings: Settings, hand: HandSide): Settings {
  return { ...settings, hand, character: settings.characters[hand] };
}
export class HandSession {
  controller = new PuppetController();
  signal: Signal | null = null;
  points: Point[] | null = null;
  seenAt = -Infinity;
  position: Point | null = null;
  clear() {
    this.signal = null;
    this.points = null;
    this.seenAt = -Infinity;
    this.position = null;
    this.controller.markLost();
  }
}

/** Stable anatomical hand slots; detection array order never selects a puppet. */
export class HandEnsemble {
  sessions = { Left: new HandSession(), Right: new HandSession() };
  private lastTimestamp = -Infinity;

  reset(settings: Settings) {
    this.lastTimestamp = -Infinity;
    for (const side of HAND_SIDES) {
      const session = this.sessions[side];
      session.controller.reset();
      session.clear();
      if (settings.handMode === "dual") {
        session.controller.pose.x = session.controller.target.x = side === "Left" ? 0.3 : 0.7;
        session.controller.pose.facing = session.controller.target.facing = side === "Left" ? 1 : -1;
      }
    }
  }
  clear() {
    this.lastTimestamp = -Infinity;
    for (const side of HAND_SIDES) this.sessions[side].clear();
  }
  setPaused(paused: boolean) {
    for (const side of HAND_SIDES) this.sessions[side].controller.setPaused(paused);
  }
  accept(result: TrackingResult, now: number, settings: Settings, aspect: number, calibrating = false) {
    if (now < result.timestamp || result.timestamp <= this.lastTimestamp) return;
    if (now - result.timestamp > 350) {
      for (const side of activeHands(settings)) this.sessions[side].clear();
      return;
    }
    this.lastTimestamp = result.timestamp;
    for (const side of activeHands(settings)) {
      const session = this.sessions[side];
      const candidates = result.hands.filter(hand => hand.side === side && hand.image.length === 21);
      if (session.position) {
        const previous = session.position;
        candidates.sort((a, b) => Math.hypot(a.image[0].x - previous.x, a.image[0].y - previous.y)
          - Math.hypot(b.image[0].x - previous.x, b.image[0].y - previous.y));
      }
      const hand = candidates[0];
      if (!hand) {
        session.clear();
        continue;
      }
      if (session.position && now - session.seenAt < 300 && Math.hypot(
        hand.image[0].x - session.position.x, hand.image[0].y - session.position.y,
      ) > 0.35) {
        session.signal = null;
        session.points = null;
        session.controller.markLost();
        continue;
      }
      const signal = extractSignal(hand.image, hand.world, aspect);
      if (!signal) {
        session.clear();
        continue;
      }
      session.signal = signal;
      session.points = hand.image;
      session.seenAt = now;
      session.position = hand.image[0];
      if (!calibrating) session.controller.ingest(signal, result.timestamp, now, handSettings(settings, side));
    }
  }
}
