import { describe, expect, it } from "vitest";
import {
  CHARACTERS,
  CHARACTER_IDS,
  MAIN_CAST_IDS,
  REST_RIG,
  armKinematics,
  characterScene,
  characterSvg,
  type SceneNode,
} from "./characters";
import { defaultSettings, parseSettings } from "./core";
import { demoPerformance } from "./performance";

const flatten = (nodes: SceneNode[]): SceneNode[] =>
  nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
describe("character library", () => {
  it("keeps Maew as the third choice with carved clothing and articulated reference pins", () => {
    const thaksin = CHARACTERS[2];
    expect(thaksin.id).toBe("thaksin");
    expect(thaksin.fullName).toContain("ทักษิณ ชินวัตร");
    const svg = characterSvg(thaksin);
    for (const color of ["#111518", "#f0bb7d", "#df2419"]) expect(svg).toContain(`fill="${color}"`);
    const scene = flatten(characterScene(thaksin, {mouth:1,head:.55,rightArm:1,leftArm:1}));
    expect(scene.find(n=>n.name==="right-arm-hand")!.children!.some(n=>n.name==="wrist-pin")).toBe(true);
    expect(scene.find(n=>n.name==="right-arm-forearm")!.children!.some(n=>n.name==="elbow-pin")).toBe(true);
    expect(scene.find(n=>n.name==="lower-jaw")!.children!.some(n=>n.name==="lower-red-lip")).toBe(true);
    const previous = defaultSettings();
    const restored = parseSettings({...previous, character:"thaksin", characters:{...previous.characters,Right:"thaksin"}});
    expect(restored.character).toBe("thaksin");
    expect(restored.characters.Left).toBe(previous.characters.Left);
  });
  it("adds Prayut as the second choice and companion without overwriting saved actors", () => {
    const prayut = CHARACTERS[1];
    expect(prayut.id).toBe("prayut");
    expect(prayut.fullName).toContain("ตัวละครล้อเลียน");
    expect(defaultSettings().characters).toEqual({ Right: "theng", Left: "prayut" });
    const old = defaultSettings();
    old.characters.Left = "nunui";
    old.profiles.Left.calibrated = true;
    const restored = parseSettings(JSON.parse(JSON.stringify(old)));
    expect(restored.characters.Left).toBe("nunui");
    expect(restored.profiles.Left.calibrated).toBe(true);
    const svg = characterSvg(prayut);
    for (const color of ["#111518", "#bd3028", "#d3a377", "#d5ad5b"]) expect(svg).toContain(`fill="${color}"`);
  });
  it("keeps the named main cast first, true garment cutouts and independent saved choices", () => {
    expect(CHARACTERS.slice(0,5).map(c => c.id)).toEqual(MAIN_CAST_IDS);
    expect(CHARACTERS.slice(0,5).map(c => c.name)).toEqual(["เท่ง", "ไอยุทธ์", "แม้ว", "วิตร", "หนู"]);
    for (const c of CHARACTERS.slice(1,5)) {
      expect(c.body.holes!.length).toBeGreaterThan(100);
      expect(c.arms.right.art?.upper.holes!.length).toBeGreaterThan(100);
      const previous = defaultSettings();
      previous.profiles.Left.calibrated = true;
      const restored = parseSettings({...previous, hand:"Right", character:c.id, characters:{Right:c.id,Left:"nunui"}});
      expect(restored.characters).toEqual({Right:c.id,Left:"nunui"});
      expect(restored.profiles.Left.calibrated).toBe(true);
    }
    expect(CHARACTERS.find(c => c.id === "anutin")!.name).not.toBe(CHARACTERS.find(c => c.id === "nunui")!.name);
  });
  it("preserves the reference colors and attaches Theng's ornaments to the moving pieces", () => {
    const theng = CHARACTERS.find(c => c.id === "theng")!;
    const scene = flatten(characterScene(theng, { mouth: 1, head: 0.55, leftArm: 1, rightArm: 1 }));
    expect(scene.find(n => n.name === "right-arm-hand")!.children!.some(n => n.name === "red-fingertip")).toBe(true);
    expect(scene.find(n => n.name === "lower-jaw")!.children!.some(n => n.name === "lower-red-lip")).toBe(true);
    expect(scene.find(n => n.name === "head")!.children!.some(n => n.name === "blue-collar")).toBe(true);
    const svg = characterSvg(theng);
    for (const color of ["#34479b", "#349ccc", "#df363b"]) expect(svg).toContain(`fill="${color}"`);
    expect(svg).toContain('stroke="#fffdf6"');
    expect(svg).toContain('fill="none"');
  });
  it("attaches optional accessories to the correct body part and can hide them without altering the rig", () => {
    for (const character of CHARACTERS) {
      const shown = flatten(characterScene(character, REST_RIG, true));
      const hidden = flatten(characterScene(character, REST_RIG, false));
      const props = shown.filter((n) => n.name.endsWith("-accessory"));
      expect(props.length).toBe(character.accessory ? 1 : 0);
      expect(hidden.some((n) => n.name.endsWith("-accessory"))).toBe(false);
      expect(shown.find((n) => n.name === "right-arm")?.x).toBe(
        hidden.find((n) => n.name === "right-arm")?.x,
      );
      if (character.accessory)
        expect(props[0].name).toBe(
          `${character.accessory.attachment}-accessory`,
        );
    }
    expect(parseSettings({ accessories: false }).accessories).toBe(false);
    expect(parseSettings({}).accessories).toBe(true);
  });
  it("keeps distinct silhouettes and stable identities", () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual([...CHARACTER_IDS]);
    expect(new Set(CHARACTERS.map((c) => c.body.path)).size).toBe(CHARACTERS.length);
    expect(new Set(CHARACTERS.map((c) => c.head.graphic.path)).size).toBe(CHARACTERS.length);
    expect(CHARACTERS.find((c) => c.id === "theng")!.arms.left.hand).toBe(
      "ring",
    );
    expect(CHARACTERS.find((c) => c.id === "theng")!.arms.right.hand).toBe(
      "point",
    );
  });
  for (const character of CHARACTERS) {
    it(`${character.id}: keeps jaw, elbow and wrist pivots in the correct hierarchy`, () => {
      const scene = characterScene(character, {
        ...REST_RIG,
        mouth: 1,
        head: 0.55,
        rightArm: 1,
        leftArm: 1,
      });
      const nodes = flatten(scene),
        head = nodes.find((n) => n.name === "head")!;
      expect(head.children!.some((n) => n.name === "lower-jaw")).toBe(true);
      expect(head.rotation).toBeCloseTo(character.head.headLimit);
      expect(
        head.children!.find((n) => n.name === "lower-jaw")!.rotation,
      ).toBeCloseTo(character.head.jawLimit);
      for (const side of ["right", "left"] as const) {
        const arm = character.arms[side];
        for (const value of [0, 0.5, 1]) {
          const k = armKinematics(arm, value);
          expect(
            Math.hypot(
              k.elbow[0] - arm.shoulder[0],
              k.elbow[1] - arm.shoulder[1],
            ),
          ).toBeCloseTo(arm.upper);
          expect(
            Math.hypot(k.wrist[0] - k.elbow[0], k.wrist[1] - k.elbow[1]),
          ).toBeCloseTo(arm.lower);
          expect(k.wrist.every(Number.isFinite)).toBe(true);
        }
        const wrapper = scene.find((n) => n.name === `${side}-arm`)!;
        const upper = wrapper.children!.find(
          (n) => n.name === `${side}-arm-upper`,
        )!;
        const lower = upper.children!.find(
          (n) => n.name === `${side}-arm-forearm`,
        )!;
        expect(lower.x).toBe(arm.upper);
        expect(
          lower.children!.find((n) => n.name === `${side}-arm-hand`)!.x,
        ).toBe(arm.lower);
      }
    });
    it(`${character.id}: exports self-contained SVG with unique clip references`, () => {
      const svg = characterSvg(character);
      expect(svg).not.toMatch(
        /NaN|undefined|https?:\/\/(?!www.w3.org)|<script/,
      );
      const ids = [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const [, ref] of svg.matchAll(/url\(#([^\)]+)\)/g))
        expect(ids).toContain(ref);
      expect(svg).toContain(character.name);
    });
    it(`${character.id}: demo values stay in safe control ranges`, () => {
      for (let time = 0; time < 30; time += 0.1) {
        const p = demoPerformance(character.id, time);
        for (const v of Object.values(p.values)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        expect(p.x).toBeGreaterThan(0.1);
        expect(p.x).toBeLessThan(0.9);
      }
    });
  }
  it("migrates old profiles and persists the selected character without losing calibration or assignments", () => {
    const { characters: _characters, handMode: _handMode, ...old } = defaultSettings();
    old.profiles.Left.calibrated = true;
    old.hand = "Left";
    old.assignments.reverse();
    const restored = parseSettings({ ...old, character: "nunui" });
    expect(restored.character).toBe("nunui");
    expect(restored.profiles.Left.calibrated).toBe(true);
    expect(restored.assignments).toEqual(old.assignments);
    expect(restored.hand).toBe("Left");
    expect(parseSettings({ ...old, character: "missing" }).character).toBe(
      "theng",
    );
    expect(parseSettings({ ...old, character: undefined }).character).toBe(
      "theng",
    );
  });
});
