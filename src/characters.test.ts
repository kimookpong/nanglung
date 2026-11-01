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
  it("keeps Maew as the third choice using the supplied PNG on its moving parts", () => {
    const thaksin = CHARACTERS[2];
    expect(thaksin.id).toBe("thaksin");
    expect(thaksin.fullName).toContain("ทักษิณ ชินวัตร");
    const svg = characterSvg(thaksin);
    expect(svg).toContain('/characters/sprites/thaksin-body.webp');
    const scene = flatten(characterScene(thaksin, {mouth:1,head:.55,rightArm:1,leftArm:1}));
    for(const [name,sprite] of [["right-arm-hand","point-hand"],["right-arm-forearm","point-lower"],["lower-jaw","jaw"]])expect(scene.find(n=>n.name===name)?.graphic?.image?.src).toBe(`/characters/sprites/thaksin-${sprite}.webp`);
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
    old.characters.Left = "thanathorn";
    old.profiles.Left.calibrated = true;
    const restored = parseSettings(JSON.parse(JSON.stringify(old)));
    expect(restored.characters.Left).toBe("thanathorn");
    expect(restored.profiles.Left.calibrated).toBe(true);
    const svg = characterSvg(prayut);
    expect(svg).toContain('/characters/sprites/prayut-head.webp');
  });
  it("keeps the named main cast first, original artwork and independent saved choices", () => {
    expect(CHARACTERS.slice(0,6).map(c => c.id)).toEqual(MAIN_CAST_IDS);
    expect(CHARACTERS.slice(0,6).map(c => c.name)).toEqual(["ลุงเท่ง", "ลุงตู่", "ลุงแม้ว", "ลุงป้อม", "ลุงหนู", "ลุงเอก"]);
    for (const c of CHARACTERS.slice(1,6)) {
      expect(c.body.image?.src).toBe(`/characters/sprites/${c.id}-body.webp`);
      expect(c.body.exclude).toBeUndefined();
      expect(c.arms.right.art?.upper.image?.src).toBe(`/characters/sprites/${c.id}-point-upper.webp`);
      const previous = defaultSettings();
      previous.profiles.Left.calibrated = true;
      const restored = parseSettings({...previous, hand:"Right", character:c.id, characters:{Right:c.id,Left:"thanathorn"}});
      expect(restored.characters).toEqual({Right:c.id,Left:"thanathorn"});
      expect(restored.profiles.Left.calibrated).toBe(true);
    }
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
    it(`${character.id}: exports SVG with unique clip references`, () => {
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
    const restored = parseSettings({ ...old, character: "thanathorn" });
    expect(restored.character).toBe("thanathorn");
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
  it("frames every puppet in one viewBox on a shared baseline", () => {
    const frames = new Set(CHARACTERS.map(c => c.viewBox));
    expect([...frames]).toEqual(["-240 -310 480 470"]);
    for (const c of CHARACTERS) expect(Math.abs(c.footY - 143)).toBeLessThanOrEqual(2);
  });
  it("raises the pointing arm ahead of the face rather than across it", () => {
    for (const c of CHARACTERS.slice(1)) {
      const raised = armKinematics(c.arms.right, 1);
      // The wrist stays forward of the head pivot by more than the face's depth.
      expect(raised.wrist[0] - c.head.anchor[0]).toBeGreaterThan(55);
    }
  });
  it("gives each caricature its satirical gimmick on the part it moves with", () => {
    const scene = (id: string, pose = REST_RIG) => flatten(characterScene(CHARACTERS.find(c => c.id === id)!, pose));
    const prayut = characterScene(CHARACTERS.find(c => c.id === "prayut")!, REST_RIG);
    const head = prayut.find(n => n.name === "head")!;
    expect(flatten(head.children!).some(n => n.name === "cap-crown")).toBe(true);
    const forearm = scene("prawit").find(n => n.name === "right-arm-forearm")!;
    expect(flatten(forearm.children!).some(n => n.name === "watch-bezel")).toBe(true);
    const anutin = characterScene(CHARACTERS.find(c => c.id === "anutin")!, REST_RIG).map(n => n.name);
    expect(anutin.indexOf("tail")).toBeLessThan(anutin.indexOf("body"));
    const lettering = scene("thaksin").find(n => n.name === "shirt-lettering")!;
    expect(lettering.graphic?.text?.lines.join("")).toBe("เสื้อนี้สีแดง");
    expect(characterSvg(CHARACTERS.find(c => c.id === "thaksin")!)).toContain("<tspan");
  });
});
