import type { Pose } from "./core";
import { THENG_ART } from "./theng-reference";
import { PRAYUT_ART } from "./prayut-art";
import { THAKSIN_ART } from "./thaksin-art";
import { PRAWIT_ART, ANUTIN_ART } from "./contemporary-art";
import { leatherCostume } from "./leather-style";

export const CHARACTER_IDS = [
  "theng",
  "prayut",
  "thaksin",
  "prawit",
  "anutin",
  "nunui",
  "sikaew",
  "yodthong",
  "khwanmuang",
] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];
export const MAIN_CAST_IDS: readonly CharacterId[] = ["theng", "prayut", "thaksin", "prawit", "anutin"];
export type XY = readonly [number, number];
export interface Graphic {
  path: string;
  holes?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
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
function checks(x: number, y: number, cols: number, count: number, gap = 13) {
  return Array.from({ length: count }, (_, row) =>
    Array.from(
      { length: cols },
      (_, col) =>
        `M${x + col * gap} ${y + row * gap}h${gap - 4}v${gap - 4}h${4 - gap}Z`,
    ).join(" "),
  ).join(" ");
}
const source =
  "https://archive.clib.psu.ac.th/online-exhibition/talung/page7.html";
const eye = (x: number, y: number, w = 10): Graphic => ({
  path: `M${x - w / 2} ${y}Q${x} ${y - 7} ${x + w / 2} ${y}Q${x} ${y + 5} ${x - w / 2} ${y}Z`,
  holes: circle(x + 1, y, 1.7),
});
const arms = (
  right: XY,
  left: XY,
  length: number,
  width: number,
  rightHand: ArmDefinition["hand"] = "point",
  leftHand: ArmDefinition["hand"] = "palm",
  strong = false,
): CharacterDefinition["arms"] => ({
  right: {
    shoulder: right,
    upper: length * 0.52,
    lower: length * 0.48,
    width,
    side: 1,
    shoulderAngles: [0.85, -1.2],
    elbowAngles: [0.26, -0.55],
    hand: rightHand,
  },
  left: {
    shoulder: left,
    upper: length * 0.52,
    lower: length * 0.48,
    width,
    side: -1,
    shoulderAngles: [strong ? 1.1 : 0.9, -1.05],
    elbowAngles: [0.2, -0.65],
    hand: leftHand,
  },
});

function styleArms(
  base: CharacterDefinition["arms"],
  right: Partial<ArmDefinition> = {},
  left: Partial<ArmDefinition> = {},
): CharacterDefinition["arms"] {
  return {
    right: { ...base.right, ...right },
    left: { ...base.left, ...left },
  };
}

// Shared vector rig. Theng follows the reference supplied by the user;
// Four contemporary caricatures share a carved-leather costume language.
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
    subtitle: "คิ้วเข้ม · มือชี้ · ลายเถาใบ",
    traits: "ไอยุทธ์ ตัวละครล้อเลียนประยุทธ์ จันทร์โอชา ผมสั้นแสกข้าง คิ้วเข้ม แก้มและคางเด่น ชุดหนังดำฉลุลายเถาใบ เนกไทแดง ขอบทอง และหมุดข้อต่อ",
    gesture: "ยกฝ่ามืออธิบาย สลับชี้ประกอบคำ แล้วพักฟังเท่ง",
    source: "https://parliamentwatch.wevis.info/politicians/62d24a30-9b4d-49f1-826c-0e2168ad798d",
    sourceLabel: "ภาพบุคคลอ้างอิง · WeVis ↗",
    ...leatherCostume(PRAYUT_ART),
  },
  {
    id: "thaksin",
    name: "แม้ว",
    fullName: "แม้ว · ทักษิณ ชินวัตร · ตัวละครล้อเลียน",
    numeral: "๐๓",
    subtitle: "ยิ้มตาหยี · ผายมือ · ลายเถาใบ",
    traits: "แม้ว ตัวละครล้อเลียนทักษิณ ชินวัตร ผมแสกปัด ยิ้มตาหยี สูทหนังดำฉลุลายเถาใบ เนกไทแดง เข็มธงไทย และหมุดข้อต่อ ปรับจากภาพอ้างอิงผู้ใช้ให้เข้าชุดหลัก",
    gesture: "ยกฝ่ามือรับบทสนทนา ยิ้มตอบ และผายมือประกอบคำ",
    source: "https://github.com/kimookpong/nanglung/blob/main/docs/THAKSIN_CHARACTER.md",
    sourceLabel: "รายละเอียดแบบจากภาพผู้ใช้ ↗",
    ...leatherCostume({...THAKSIN_ART, decorations: THAKSIN_ART.decorations?.filter(n => !/^(sash|belt|tail|knot)/.test(n.name))}),
  },
  {
    id: "prawit",
    name: "วิตร",
    fullName: "วิตร · ประวิตร วงษ์สุวรรณ · ตัวละครล้อเลียน",
    numeral: "๐๔",
    subtitle: "ทรงป้อม · แก้มเต็ม · เนกไททอง",
    traits: "วิตร ตัวละครล้อเลียนประวิตร วงษ์สุวรรณ สัดส่วนเตี้ยป้อม ศีรษะกลม แก้มเต็ม ตาหรี่ ผมสั้นเปิดหน้าผาก สูทหนังดำฉลุลายเถาใบและเนกไททอง",
    gesture: "ยกฝ่ามือใกล้ลำตัว เว้นช่วงฟัง แล้วพยักหน้ารับบทสนทนา",
    source: "https://parliamentwatch.wevis.info/politicians/d5409bcf-f304-423e-9079-a593b9ef5dbd",
    sourceLabel: "ภาพบุคคลอ้างอิง · WeVis ↗",
    ...PRAWIT_ART,
  },
  {
    id: "anutin",
    name: "หนู",
    fullName: "หนู · อนุทิน ชาญวีรกูล · ตัวละครล้อเลียน",
    numeral: "๐๕",
    subtitle: "ไหล่กว้าง · กรามชัด · เนกไทคราม",
    traits: "หนู ตัวละครล้อเลียนอนุทิน ชาญวีรกูล ไหล่กว้าง ผมสั้น คิ้วหนา กรามชัด ยิ้มเล็กน้อย ชุดหนังดำฉลุลายเถาใบและเนกไทคราม ต่างจากตัวหนูนุ้ยในคลังดั้งเดิม",
    gesture: "ผายมือกว้างสลับรับคำ อีกมือพักข้างลำตัว",
    source: "https://parliamentwatch.wevis.info/politicians/4cc8dfaf-e5ce-41f4-94d3-53bf858308b4",
    sourceLabel: "ภาพบุคคลอ้างอิง · WeVis ↗",
    ...ANUTIN_ART,
  },
  {
    id: "nunui",
    name: "หนูนุ้ย",
    numeral: "๐๔",
    subtitle: "คอตก · พุงยื่น · ฟังก่อนตอบ",
    traits: "รูปเตี้ย จมูกและปากยื่น เคราใต้คาง คอโน้ม และผ้านุ่งเรียบ",
    gesture: "ฟัง ก้มรับเล็กน้อย แล้วค่อยตอบ",
    source,
    footY: 104,
    accessory: {
      name: "ตะไกรหนีบหมาก",
      attachment: "right",
      graphic: {
        path: "M-5 -2Q-25 -25 -30 -12Q-33 -3 -13 8L-2 3L21 35L27 36L7 -1L23 -25L17 -29L1 -7Z",
        holes: circle(-22, -9, 4),
      },
    },
    body: {
      path: "M-22 -123Q-5 -135 17 -120L34 -104Q27 -79 38 -51Q60 -19 43 6Q31 28 -6 16L-36 1Q-48 -25 -30 -52L-31 -91Z",
      holes:
        "M-18 -111Q1 -100 23 -107L25 -103Q0 -93 -19 -107Z M-29 -29Q-27 -10 -9 -7L-9 -4Q-31 -6 -33 -26Z",
    },
    cloth: {
      path: "M-35 -4Q1 12 45 -2L42 58Q12 72 -37 56Z",
      holes:
        "M-32 7Q4 21 42 8L41 11Q4 24 -32 10Z M-31 47Q4 60 39 49L39 52Q3 64 -31 50Z",
    },
    legs: {
      path: "M-28 51L-9 54L-11 88Q-16 93 -33 94L-39 102Q-20 110 -3 101L3 89L5 57L18 55L27 87Q34 91 45 92L51 100Q36 109 19 102L12 92L4 63Z",
    },
    head: {
      anchor: [9, -119],
      graphic: {
        path: "M-24 12L-31 -13Q-40 -24 -35 -55Q-33 -79 -10 -84Q12 -89 24 -69L24 -52Q50 -48 53 -37Q51 -29 31 -27L32 -22L4 -20L-1 15Z",
        holes:
          "M-23 -34Q-33 -40 -26 -52Q-20 -56 -17 -47L-20 -44Q-24 -48 -25 -42L-21 -38Z M5 -62Q14 -68 24 -61L23 -58Q14 -64 6 -59Z",
      },
      eye: eye(16, -52, 9),
      ornament: {
        path: "M-34 -60Q-40 -76 -28 -86Q-33 -94 -17 -95Q4 -98 16 -84Q-1 -90 -15 -84Q-30 -82 -34 -60Z M-36 -68Q-48 -62 -44 -45Q-34 -55 -36 -68Z",
      },
      jawAnchor: [0, -21],
      jaw: {
        path: "M-4 -2L32 -2Q44 3 36 12L31 15L37 29L32 26L31 40L25 32L21 35L18 15L-8 6Z",
        holes: "M9 4H28V7H9Z",
      },
      jawLimit: 0.48,
      headLimit: 0.24,
    },
    arms: styleArms(
      arms([25, -104], [-27, -101], 91, 7.2, "palm", "palm"),
      {},
      { shoulderAngles: [0.1, -0.85], elbowAngles: [-0.75, -0.3] },
    ),
  },
  {
    id: "sikaew",
    name: "สีแก้ว",
    numeral: "๐๕",
    subtitle: "ศีรษะล้าน · หนักแน่น · พูดจริงทำจริง",
    traits: "อ้วนเตี้ย บ่าแน่น มีโหนกคอ ศีรษะล้าน และผ้าโจงกระเบนลายตาราง",
    gesture: "ยกมือห้าม ค้างท่า แล้วกล่าวตอบอย่างหนักแน่น",
    source,
    footY: 115,
    body: {
      path: "M-34 -141Q-22 -164 -2 -161L23 -143L40 -123Q34 -99 43 -74Q70 -30 49 7Q28 32 -15 22L-46 5Q-61 -28 -40 -65L-44 -111Z",
      holes:
        "M-28 -132Q-3 -118 29 -130L30 -126Q-2 -113 -29 -127Z M-35 -38Q-33 -11 -10 -8L-10 -4Q-39 -7 -40 -35Z M22 -93L29 -92L28 -88L22 -89Z",
    },
    cloth: {
      path: "M-45 -2Q4 19 49 0L55 56Q32 75 -2 65L-47 57Z",
      holes: checks(-40, 10, 7, 4, 13),
    },
    legs: {
      path: "M-34 48L-10 56L-14 91Q-19 96 -38 96L-45 107L-32 111L-7 107L2 95L4 59L23 56L32 91L47 98L53 109L38 115L14 106L6 94L2 66Z",
      holes: rows(-34, 104, 4, 6, 1.5) + rows(24, 105, 4, 5, 1.4),
    },
    head: {
      anchor: [-1, -145],
      graphic: {
        path: "M-21 15L-26 -17Q-43 -38 -36 -64Q-30 -89 -4 -89Q18 -88 27 -65L25 -52L39 -40Q44 -33 30 -30L36 -22L8 -20L12 15Z",
        holes:
          "M-26 -38Q-35 -47 -27 -58Q-18 -62 -16 -51L-19 -48Q-23 -56 -27 -50L-23 -43Z M8 -69Q18 -75 27 -66L25 -63Q18 -69 9 -65Z",
      },
      eye: eye(17, -55, 10),
      jawAnchor: [0, -20],
      jaw: { path: "M-5 -3L35 -3L34 7Q18 14 2 9L-6 4Z", holes: "M9 2H29V5H9Z" },
      jawLimit: 0.37,
      headLimit: 0.12,
    },
    arms: styleArms(
      arms([34, -126], [-34, -124], 102, 9, "palm", "fist", true),
      {},
      { shoulderAngles: [-0.1, -0.85], elbowAngles: [-0.9, -0.4] },
    ),
  },
  {
    id: "yodthong",
    name: "ยอดทอง",
    numeral: "๐๖",
    subtitle: "ผมหยิก · ชอบโอ้อวด · เปลี่ยนท่าไว",
    traits:
      "ผมหยิกเป็นมวล คางและปากเด่น ท้องยื่น ก้นงอน และผ้าโจงกระเบนลายข้าวหลามตัด",
    gesture: "อวดตัว ชะงัก แล้วเอนรับเมื่อถูกโต้",
    source,
    footY: 118,
    accessory: {
      name: "กริช",
      attachment: "left",
      graphic: {
        path: "M-7 -12H6L5 -2L15 1L16 5L6 7Q15 17 8 23Q3 29 11 35Q17 41 8 48L2 66Q-4 48 -1 39Q-8 31 -3 23Q2 15 -5 7L-15 5L-15 1L-4 -2Z",
        holes: "M-2 12L1 12L4 47L2 52Z",
      },
    },
    body: {
      path: "M-33 -134Q-30 -155 -9 -155L22 -138L39 -113Q39 -80 53 -49Q73 -13 51 14L17 28L-34 15Q-54 14 -55 -7L-48 -56L-43 -108Z",
      holes:
        "M-28 -126Q-5 -112 29 -124L31 -120Q-5 -105 -30 -121Z M-31 -24Q-16 -10 8 -16L9 -12Q-16 -4 -33 -20Z",
    },
    cloth: {
      path: "M-45 -3Q6 13 54 -6L61 31L43 34L43 62Q19 76 -8 65L-46 54Z",
      holes: Array.from({ length: 5 }, (_, r) =>
        Array.from(
          { length: 7 },
          (_, col) => `M${-37 + col * 13} ${9 + r * 12}l4 -4l4 4l-4 4Z`,
        ).join(" "),
      ).join(" "),
    },
    legs: {
      path: "M-32 49L-10 54L-10 95L-29 100L-34 110L-18 115L5 107L9 95L10 60L26 57L32 94L53 101L60 112L46 118L20 109L11 99L4 68Z",
    },
    head: {
      anchor: [0, -142],
      graphic: {
        path: "M-22 13L-26 -14Q-42 -33 -33 -62Q-30 -84 -6 -88Q19 -90 27 -68L25 -56L51 -43Q56 -36 35 -33L44 -24L10 -20L8 16Z",
        holes:
          "M-26 -34Q-35 -44 -27 -56Q-18 -60 -16 -50L-19 -46Q-24 -54 -27 -46L-23 -40Z M8 -66Q23 -72 30 -63L28 -60Q20 -66 9 -62Z",
      },
      eye: eye(19, -55, 10),
      ornament: {
        path: "M-36 -49Q-50 -54 -42 -66Q-53 -75 -42 -84Q-48 -99 -34 -102Q-33 -118 -17 -111Q-6 -123 4 -111Q21 -120 27 -103Q43 -101 36 -86L27 -72Q15 -91 -4 -87Q-30 -88 -36 -49Z",
        holes:
          circle(-35, -77, 4) +
          circle(-34, -94, 4) +
          circle(-21, -104, 4) +
          circle(-5, -107, 4) +
          circle(13, -104, 4) +
          circle(26, -94, 3.7) +
          circle(-40, -62, 3),
      },
      jawAnchor: [-1, -21],
      jaw: {
        path: "M-6 -2L44 -2L46 6Q30 17 8 11L-7 5Z",
        holes: rows(10, 5, 5, 6, 1.4),
      },
      jawLimit: 0.56,
      headLimit: 0.21,
    },
    arms: styleArms(arms([32, -121], [-32, -120], 99, 8, "point", "palm"), {
      shoulderAngles: [-0.1, -1.15],
      elbowAngles: [-0.85, -0.3],
    }),
  },
  {
    id: "khwanmuang",
    name: "ขวัญเมือง",
    numeral: "๐๗",
    subtitle: "จมูกยาว · สุขุม · ผู้นำเข้าสู่เรื่อง",
    traits: "หน้าผากสูง จมูกยาว ปากกว้าง พุงโย้ และผ้านุ่งเรียบ",
    gesture: "ยกมือกล่าวนำ เว้นจังหวะ แล้วหันเชิญเข้าสู่เรื่อง",
    source,
    footY: 126,
    body: {
      path: "M-26 -157Q-12 -172 9 -164L30 -143L32 -111Q28 -79 45 -51Q63 -19 44 13Q22 34 -17 20L-39 2Q-52 -28 -31 -62L-36 -112Z",
      holes:
        "M-22 -147Q-2 -132 22 -142L23 -138Q-3 -126 -24 -143Z M-32 -35Q-31 -11 -10 -7L-10 -3Q-38 -9 -37 -33Z",
    },
    cloth: {
      path: "M-37 -2Q2 14 45 -2L47 61Q12 77 -39 58Z",
      holes:
        "M-35 4Q4 19 43 6L43 10Q4 24 -35 8Z M-32 49Q5 62 41 52L41 55Q4 66 -32 53Z",
    },
    legs: {
      path: "M-30 51L-10 56L-14 107L-31 113L-38 122L-24 126L-5 121L4 108L6 59L22 56L27 108L45 114L52 122L37 126L15 118L9 106L5 68Z",
    },
    head: {
      anchor: [-1, -160],
      graphic: {
        path: "M-20 15L-24 -17Q-39 -32 -33 -63Q-31 -94 -5 -98Q18 -100 23 -76L22 -58L57 -39Q60 -32 29 -32L39 -23L9 -19L9 14Z",
        holes:
          "M-24 -36Q-33 -44 -26 -56Q-19 -62 -16 -51L-19 -47Q-24 -55 -26 -47L-22 -41Z M7 -72Q18 -80 26 -69L24 -66Q16 -73 8 -68Z",
      },
      eye: eye(16, -59, 9),
      ornament: {
        path: "M-31 -66Q-39 -82 -29 -94Q-23 -107 -8 -104L-2 -100Q-18 -102 -23 -93Q-32 -83 -29 -70Z",
        holes: rows(-23, -96, 2, 6, 1.4),
      },
      jawAnchor: [-1, -20],
      jaw: {
        path: "M-5 -2L38 -2L43 5Q26 14 5 11L-5 5Z",
        holes: rows(8, 4, 4, 7, 1.4),
      },
      jawLimit: 0.4,
      headLimit: 0.14,
    },
    arms: styleArms(arms([25, -142], [-26, -139], 105, 7, "palm", "palm"), {
      shoulderAngles: [0.4, -1.1],
      elbowAngles: [-0.4, -0.2],
    }),
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
  const walk = (node: SceneNode): string => {
    const id = `${prefix}-${n++}`;
    const transform = `translate(${node.x ?? 0} ${node.y ?? 0}) rotate(${((node.rotation ?? 0) * 180) / Math.PI}) scale(${node.scaleX ?? 1} 1)`;
    let graphic = "";
    if (node.graphic) {
      const g = node.graphic;
      const paint = `${g.fill ? ` fill="${g.fill}"` : ""}${g.stroke ? ` stroke="${g.stroke}" stroke-width="${g.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : ""}`;
      graphic = g.holes
        ? `<defs><clipPath id="${id}"><path d="${g.path}"/></clipPath></defs><path d="${g.path} ${g.holes}" fill-rule="evenodd" clip-path="url(#${id})"${paint}/>`
        : `<path d="${g.path}"${paint}/>`;
    }
    return `<g transform="${transform}">${graphic}${(node.children ?? []).map(walk).join("")}</g>`;
  };
  return `<g fill="${ink}">${nodes.map(walk).join("")}</g>`;
}
export function characterSvg(
  character: CharacterDefinition,
  pose: RigPose = REST_RIG,
  prefix: string = character.id,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${character.viewBox ?? "-180 -310 360 490"}" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">${character.fullName ?? character.name} — แบบดิจิทัลหนังตะลุง</title>${sceneSvg(characterScene(character, pose), "#29251f", prefix)}</svg>`;
}
