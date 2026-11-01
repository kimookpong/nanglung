import type { Pose } from "./core";
import { THENG_ART } from "./theng-reference";
import { USER_PUPPETS } from "./user-puppets";

export const CHARACTER_IDS = [
  "theng",
  "prayut",
  "thaksin",
  "prawit",
  "anutin",
  "thanathorn",
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];
export const MAIN_CAST_IDS: readonly CharacterId[] = ["theng", "prayut", "thaksin", "prawit", "anutin", "thanathorn"];
export type XY = readonly [number, number];
export interface Graphic {
  path: string;
  holes?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  image?: { src:string; width:number; height:number; matrix:readonly [number,number,number,number,number,number] };
  exclude?: string[];
}
export interface SceneNode {
  name: string;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  graphic?: Graphic;
  children?: SceneNode[];
}
interface ArmDefinition {
  shoulder: XY;
  upper: number;
  lower: number;
  width: number;
  side: 1 | -1;
  shoulderAngles: XY;
  elbowAngles: XY;
  hand: "point" | "ring" | "palm" | "fist";
  art?: {
    upper: Graphic;
    lower: Graphic;
    hand: Graphic;
    handDetails?: SceneNode[];
    upperDetails?: SceneNode[];
    lowerDetails?: SceneNode[];
  };
}
export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  numeral: string;
  subtitle: string;
  traits: string;
  gesture: string;
  source: string;
  sourceLabel?: string;
  fullName?: string;
  footY: number;
  body: Graphic;
  cloth: Graphic;
  legs: Graphic;
  decorations?: SceneNode[];
  viewBox?: string;
  head: {
    anchor: XY;
    graphic: Graphic;
    eye: Graphic;
    ornament?: Graphic;
    jawAnchor: XY;
    jaw: Graphic;
    jawLimit: number;
    headLimit: number;
    details?: SceneNode[];
    jawDetails?: SceneNode[];
  };
  arms: { right: ArmDefinition; left: ArmDefinition };
  accessory?: {
    name: string;
    attachment: "waist" | "right" | "left";
    anchor?: XY;
    graphic: Graphic;
  };
}

const circle = (x: number, y: number, r: number) =>
  `M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
function rows(x: number, y: number, count: number, gap: number, r: number) {
  return Array.from({ length: count }, (_, i) =>
    circle(x + i * gap, y, r),
  ).join(" ");
}
const source =
  "https://archive.clib.psu.ac.th/online-exhibition/talung/page7.html";
// Shared vector rig. Theng follows the reference supplied by the user;
// Contemporary caricatures use the supplied PNGs with articulated clip stencils.
export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: "theng",
    name: "เท่ง",
    numeral: "๐๑",
    subtitle: "ตาโต · มือชี้และมือวง · ผ้านุ่งตาราง",
    traits: "ตามภาพอ้างอิงของผู้ใช้: ศีรษะและจมูกใหญ่ ตาโต สร้อยสีฟ้า มือชี้ปลายแดง มือวง และผ้านุ่งตารางสีน้ำเงิน",
    gesture: "ยกมือชี้ประกอบคำ อีกมือทำวง แล้วเว้นจังหวะรับมุก",
    source,
    ...THENG_ART,
  },
  {
    id: "prayut",
    name: "ไอยุทธ์",
    fullName: "ไอยุทธ์ · ประยุทธ์ จันทร์โอชา · ตัวละครล้อเลียน",
    numeral: "๐๒",
    subtitle: "เครื่องแบบดำ · ขอบทอง · มือชี้",
    traits: "ไอยุทธ์ ตัวละครล้อเลียนประยุทธ์ จันทร์โอชา ใช้ภาพใหม่ของผู้ใช้: เครื่องแบบดำ ขอบทอง อินทรธนู แถบสีหน้าอก เข็มขัด และมือชี้ คงลายเส้นและพื้นผิวจากภาพจริง",
    gesture: "ยกฝ่ามืออธิบาย สลับชี้ประกอบคำ แล้วพักฟังเท่ง",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/USER_CHARACTER_ART.md",
    sourceLabel: "แบบล่าสุดจากภาพผู้ใช้ ↗",
    ...USER_PUPPETS.prayut,
  },
  {
    id: "thaksin",
    name: "แม้ว",
    fullName: "แม้ว · ทักษิณ ชินวัตร · ตัวละครล้อเลียน",
    numeral: "๐๓",
    subtitle: "สูทดำ · ผ้าลายแดงทอง · มือชี้",
    traits: "แม้ว ตัวละครล้อเลียนทักษิณ ชินวัตร ใช้ภาพใหม่ของผู้ใช้: ผมปัด ยิ้ม สูทดำ เนกไทแดง เข็มธงไทย ผ้านุ่งลายแดงทองเขียว และรองเท้าปลายงอน คงรายละเอียดจากภาพจริง",
    gesture: "ยกฝ่ามือรับบทสนทนา ยิ้มตอบ และผายมือประกอบคำ",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/USER_CHARACTER_ART.md",
    sourceLabel: "แบบล่าสุดจากภาพผู้ใช้ ↗",
    ...USER_PUPPETS.thaksin,
  },
  {
    id: "prawit",
    name: "วิตร",
    fullName: "วิตร · ประวิตร วงษ์สุวรรณ · ตัวละครล้อเลียน",
    numeral: "๐๔",
    subtitle: "แก้มเต็ม · เครื่องแบบดำ · ขอบทอง",
    traits: "วิตร ตัวละครล้อเลียนประวิตร วงษ์สุวรรณ ใช้ภาพใหม่ของผู้ใช้: รูปร่างป้อม แก้มเต็ม เครื่องแบบดำ ขอบทอง แถบสีหน้าอก และมือชี้ คงรูปหน้าและพื้นผิวจากภาพจริง",
    gesture: "ยกฝ่ามือใกล้ลำตัว เว้นช่วงฟัง แล้วพยักหน้ารับบทสนทนา",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/USER_CHARACTER_ART.md",
    sourceLabel: "แบบล่าสุดจากภาพผู้ใช้ ↗",
    ...USER_PUPPETS.prawit,
  },
  {
    id: "anutin",
    name: "หนู",
    fullName: "หนู · อนุทิน ชาญวีรกูล · ตัวละครล้อเลียน",
    numeral: "๐๕",
    subtitle: "ชุดคราม · ผ้าคาดธงไทย · มือชี้",
    traits: "หนู ตัวละครล้อเลียนอนุทิน ชาญวีรกูล ใช้ภาพใหม่ของผู้ใช้: ชุดคราม ตราหน้าอก ผ้าคาดเอวสีธงไทย นาฬิกาข้อมือ และมือชี้ คงรายละเอียดจากภาพจริง เป็นคนละตัวกับหนูนุ้ย",
    gesture: "ผายมือกว้างสลับรับคำ อีกมือพักข้างลำตัว",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/USER_CHARACTER_ART.md",
    sourceLabel: "แบบล่าสุดจากภาพผู้ใช้ ↗",
    ...USER_PUPPETS.anutin,
  },
  {
    id: "thanathorn",
    name: "เอก",
    fullName: "เอก · ธนาธร จึงรุ่งเรืองกิจ · ตัวละครล้อเลียน",
    numeral: "๐๖",
    subtitle: "เสื้อส้ม · ผมตั้ง · รองเท้าผ้าใบ",
    traits: "เอก ตัวละครล้อเลียนธนาธร จึงรุ่งเรืองกิจ ใช้ภาพผู้ใช้: ผมตั้ง เสื้อโปโลสีส้มพร้อมโลโก้จากภาพ กางเกงดำ นาฬิกา และรองเท้าผ้าใบ คงรายละเอียดภาพและตัดพื้นขาวด้วยหน้ากากแสดงผล",
    gesture: "ชี้ประกอบคำ ผายมือรับบทสนทนา และขยับศีรษะรับจังหวะ",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/USER_CHARACTER_ART.md",
    sourceLabel: "แบบล่าสุดจากภาพผู้ใช้ ↗",
    ...USER_PUPPETS.thanathorn,
  },

];

export function isCharacterId(value: unknown): value is CharacterId {
  return (
    typeof value === "string" && CHARACTER_IDS.includes(value as CharacterId)
  );
}
export function getCharacter(id: CharacterId): CharacterDefinition {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
const unit = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const mix = (range: XY, t: number) => range[0] + (range[1] - range[0]) * t;
const hands: Record<ArmDefinition["hand"], Graphic> = {
  point: {
    path: "M-3 -6L10 -8L31 -10Q37 -9 33 -5L19 -2L25 2Q28 5 23 7L10 8L0 5Z",
    holes: circle(8, 0, 1.5),
  },
  ring: {
    path: "M-3 -6L5 -8Q5 -22 17 -24Q30 -24 27 -12Q24 -4 13 -4L11 0L24 2Q29 6 23 8L7 8L-3 5Z",
    holes: circle(17, -14, 5),
  },
  palm: {
    path: "M-3 -6L9 -9L25 -16Q30 -16 27 -11L16 -5L29 -8Q35 -6 30 -3L18 1L28 1Q33 4 28 6L14 9L2 6Z",
  },
  fist: {
    path: "M-3 -7L5 -14L17 -15L25 -10L25 2L17 10L3 7L-4 2Z",
    holes: "M9 -9H20V-7H9Z M11 -3H21V-1H11Z",
  },
};

export interface ArmKinematics {
  shoulderAngle: number;
  elbowAngle: number;
  elbow: XY;
  wrist: XY;
}
export function armKinematics(
  arm: ArmDefinition,
  value: number,
): ArmKinematics {
  const v = unit(value),
    shoulderAngle = mix(arm.shoulderAngles, v),
    elbowAngle = mix(arm.elbowAngles, v);
  const elbow: XY = [
    arm.shoulder[0] + arm.side * arm.upper * Math.cos(shoulderAngle),
    arm.shoulder[1] + arm.upper * Math.sin(shoulderAngle),
  ];
  return {
    shoulderAngle,
    elbowAngle,
    elbow,
    wrist: [
      elbow[0] + arm.side * arm.lower * Math.cos(shoulderAngle + elbowAngle),
      elbow[1] + arm.lower * Math.sin(shoulderAngle + elbowAngle),
    ],
  };
}
function armNodes(arm: ArmDefinition, value: number, name: string): SceneNode {
  const angles = armKinematics(arm, value),
    w = arm.width;
  const limb = (length: number): Graphic => ({
    path: `M-5 ${-w}Q${length * 0.5} ${-w - 2} ${length + 3} ${-w * 0.65}L${length + 3} ${w * 0.65}Q${length * 0.5} ${w + 2} -5 ${w}Z`,
    holes: rows(10, 0, Math.max(1, Math.floor((length - 12) / 14)), 14, 1.5),
  });
  return {
    name,
    x: arm.shoulder[0],
    y: arm.shoulder[1],
    scaleX: arm.side,
    children: [
      {
        name: `${name}-upper`,
        rotation: angles.shoulderAngle,
        graphic: arm.art?.upper ?? limb(arm.upper),
        children: [
          {
            name: `${name}-forearm`,
            x: arm.upper,
            rotation: angles.elbowAngle,
            graphic: arm.art?.lower ?? limb(arm.lower),
            children: [
              { name: `${name}-hand`, x: arm.lower, graphic: arm.art?.hand ?? hands[arm.hand], children: arm.art?.handDetails },
              ...(arm.art?.lowerDetails ?? []),
              ...(arm.art ? [] : [{
                name: `${name}-wrist-pin`,
                graphic: {
                  path: circle(arm.lower, 0, w * 0.64),
                  holes: circle(arm.lower, 0, 1.6),
                },
              }]),
            ],
          },
          ...(arm.art?.upperDetails ?? []),
          ...(arm.art ? [] : [{
            name: `${name}-elbow-pin`,
            graphic: {
              path: circle(arm.upper, 0, w * 0.77),
              holes: circle(arm.upper, 0, 1.6),
            },
          }]),
        ],
      },
      ...(arm.art ? [] : [{
        name: `${name}-shoulder-pin`,
        graphic: { path: circle(0, 0, w * 0.9), holes: circle(0, 0, 1.8) },
      }]),
    ],
  };
}

export type RigPose = Pick<Pose, "mouth" | "head" | "leftArm" | "rightArm">;
export const REST_RIG: RigPose = {
  mouth: 0,
  head: 0,
  leftArm: 0.12,
  rightArm: 0.16,
};
export function characterScene(
  character: CharacterDefinition,
  pose: RigPose,
  accessories = true,
): SceneNode[] {
  const h = character.head;
  const prop = accessories ? character.accessory : undefined;
  const makeArm = (side: "left" | "right", value: number) => {
    const node = armNodes(character.arms[side], value, `${side}-arm`);
    if (prop?.attachment === side) {
      const forearm = node.children![0].children![0];
      forearm.children!.unshift({
        name: `${side}-accessory`,
        x: character.arms[side].lower + 8,
        y: 2,
        graphic: prop.graphic,
      });
    }
    return node;
  };
  return [
    makeArm("left", pose.leftArm),
    { name: "legs", graphic: character.legs },
    { name: "body", graphic: character.body },
    { name: "cloth", graphic: character.cloth },
    ...(prop?.attachment === "waist"
      ? [
          {
            name: "waist-accessory",
            x: prop.anchor?.[0] ?? 0,
            y: prop.anchor?.[1] ?? 0,
            graphic: prop.graphic,
          },
        ]
      : []),
    ...(character.decorations ?? []),
    {
      name: "head",
      x: h.anchor[0],
      y: h.anchor[1],
      rotation: unit(pose.head / 0.55) * h.headLimit,
      children: [
        {
          name: "head-base",
          graphic: {
            ...h.graphic,
            holes: (h.graphic.holes ?? "") + " " + h.eye.path,
          },
        },
        ...(h.ornament ? [{ name: "hair", graphic: h.ornament }] : []),
        { name: "eye-pupil", graphic: { path: h.eye.holes ?? "" } },
        ...(h.details ?? []),
        {
          name: "lower-jaw",
          x: h.jawAnchor[0],
          y: h.jawAnchor[1],
          rotation: unit(pose.mouth) * h.jawLimit,
          graphic: h.jaw,
          children: h.jawDetails,
        },
      ],
    },
    makeArm("right", pose.rightArm),
  ];
}

/** Per-part clip + evenodd cuts preserve whatever is actually behind a punched hole. */
export function sceneSvg(
  nodes: SceneNode[],
  ink = "#29251f",
  prefix = "character",
): string {
  let n = 0;
  const images = new Map<string,NonNullable<Graphic["image"]>>();
  const walk = (node: SceneNode): string => {
    const id = `${prefix}-${n++}`;
    const transform = `translate(${node.x ?? 0} ${node.y ?? 0}) rotate(${((node.rotation ?? 0) * 180) / Math.PI}) scale(${node.scaleX ?? 1} 1)`;
    let graphic = "";
    if (node.graphic) {
      const g = node.graphic;
      const paint = `${g.fill ? ` fill="${g.fill}"` : ""}${g.stroke ? ` stroke="${g.stroke}" stroke-width="${g.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ""}`;
      if(g.image) {
        const imageId=`${prefix}-image-${g.image.src.split("/").pop()!.replace(/\W/g,"-")}`;
        if(!images.has(imageId))images.set(imageId,g.image);
        const mask=g.exclude?.length?`<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="2000" height="2000"><path d="${g.path}" fill="white"/>${g.exclude.map(path=>`<path d="${path}" fill="black" fill-rule="evenodd"/>`).join("")}</mask>`:"";
        graphic=`<defs><clipPath id="${id}"><path d="${g.path} ${g.holes??""}" clip-rule="evenodd"/></clipPath>${mask}</defs><g clip-path="url(#${id})"${mask?` mask="url(#${id}-mask)"`:""}><use href="#${imageId}" transform="matrix(${g.image.matrix.join(" ")})"/></g>`;
      } else graphic = g.holes
        ? `<defs><clipPath id="${id}"><path d="${g.path}"/></clipPath></defs><path d="${g.path} ${g.holes}" fill-rule="evenodd" clip-path="url(#${id})"${paint}/>`
        : `<path d="${g.path}"${paint}/>`;
    }
    return `<g transform="${transform}">${graphic}${(node.children ?? []).map(walk).join("")}</g>`;
  };
  const body=nodes.map(walk).join("");
  const definitions=[...images.entries()].map(([id,image])=>`<image id="${id}" href="${image.src}" width="${image.width}" height="${image.height}"/>`).join("");
  return `${definitions?`<defs>${definitions}</defs>`:""}<g fill="${ink}">${body}</g>`;
}
export function characterSvg(
  character: CharacterDefinition,
  pose: RigPose = REST_RIG,
  prefix: string = character.id,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${character.viewBox ?? "-180 -310 360 490"}" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">${character.fullName ?? character.name} — แบบดิจิทัลหนังตะลุง</title>${sceneSvg(characterScene(character, pose), "#29251f", prefix)}</svg>`;
}
