import type { CharacterDefinition, Graphic, SceneNode, XY } from "./characters";

// A theatrical caricature, drawn as articulated leather-cut shapes.
// The suit and its decorative pin are an original costume design.
const INK = "#171c27", SUIT = "#263954", DEEP = "#1c2b43", GOLD = "#d5ad5b";
const SKIN = "#d3a377", SHADE = "#ac7c58", LIGHT = "#e8c59c", PAPER = "#fff2cf", BLUE = "#6daec7";
const circle = (x: number, y: number, r: number) => `M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;
const graphic = (path: string, fill = INK, stroke?: string, strokeWidth = 1): Graphic => ({ path, fill, ...(stroke ? { stroke, strokeWidth } : {}) });
const line = (name: string, path: string, color: string, width = 1.2): SceneNode => ({ name, graphic: graphic(path, "none", color, width) });
const fill = (name: string, path: string, color: string, stroke?: string, width = 1): SceneNode => ({ name, graphic: graphic(path, color, stroke, width) });
const dots = (x: number, y: number, count: number, dx: number, dy: number, r = 1.2) => Array.from({ length: count }, (_, i) => circle(x+i*dx, y+i*dy, r)).join(" ");

function sleeve(length: number, width: number): Graphic {
  return graphic(`M-5 ${-width}Q${length*.5} ${-width-2} ${length+4} ${-width*.7}L${length+4} ${width*.7}Q${length*.5} ${width+1} -5 ${width}Z`, SUIT, INK, 1.5);
}
function arm(shoulder: XY, side: 1 | -1, hand: "point" | "palm"): CharacterDefinition["arms"]["right"] {
  const upper = side === 1 ? 61 : 59, lower = 56;
  const point = "M-4 -7L8 -10L30 -15Q37 -16 34 -11L18 -5L26 -2Q31 2 25 5L12 9L0 6Z";
  const palm = "M-4 -7L5 -11L17 -23Q22 -25 21 -19L14 -10L27 -17Q33 -18 30 -13L18 -4L31 -8Q37 -7 32 -3L19 3L30 3Q34 6 27 9L13 12L0 7Z";
  return {
    shoulder, upper, lower, width: 8.5, side, hand,
    shoulderAngles: side === 1 ? [0.92, -1.18] : [1.02, -1.12],
    elbowAngles: side === 1 ? [0.25, -0.56] : [-0.52, -0.4],
    art: {
      upper: sleeve(upper, 9.5), lower: sleeve(lower, 8),
      hand: graphic(hand === "point" ? point : palm, SKIN, INK, 1.3),
      handDetails: [
        fill("shirt-cuff", "M-9 -6L0 -6L0 6L-9 6Z", PAPER, INK, .8),
        line("cuff-gold-edge", "M-9 -6L-9 6", GOLD, 2),
        line("palm-cuts", hand === "point" ? "M8 -4Q15 -2 13 4 M15 0L22 1 M4 3L8 5" : "M7 -4Q15 -2 13 6 M17 2L24 0 M6 5L10 7", SHADE, 1.2),
        fill("cuff-button", circle(-5, 3, 1.2), GOLD),
      ],
    },
  };
}

export const PRAYUT_ART: Pick<CharacterDefinition, "body" | "cloth" | "legs" | "decorations" | "head" | "arms" | "footY" | "viewBox"> = {
  footY: 145,
  viewBox: "-205 -310 410 500",
  body: graphic("M-16 -153L15 -153L35 -140Q44 -136 44 -118L39 -74Q45 -30 39 17L22 29L-4 24L-29 28L-41 17Q-43 -26 -38 -65L-44 -115Q-45 -135 -33 -140Z", SUIT, INK, 2.4),
  cloth: graphic("M-35 18L34 18L30 69L4 73L-5 69L-31 68Z", DEEP, INK, 1.8),
  legs: graphic("M-31 57L-6 60L-11 126L-29 129L-31 119Z M4 60L29 57L27 121L17 129L5 126Z", DEEP, INK, 2),
  decorations: [
    fill("white-shirt", "M-16 -149L15 -149L24 -124L5 -68L-4 -69L-25 -124Z", PAPER, INK, 1),
    fill("shirt-collar", "M-16 -149L0 -137L15 -149L23 -131L9 -116L0 -132L-10 -117L-24 -130Z", "#fff9e7", INK, 1),
    fill("blue-tie", "M-4 -132L4 -132L8 -124L3 -117L11 -76L2 -64L-7 -76L-4 -117L-9 -124Z", BLUE, INK, 1.2),
    line("tie-weave", "M-3 -110L4 -106 M-2 -99L6 -95 M0 -87L7 -83", PAPER, .9),
    fill("left-lapel", "M-34 -139L-18 -149L-8 -91L2 -65L-25 -96L-19 -108L-32 -114Z", "#344c68", INK, 1.2),
    fill("right-lapel", "M15 -149L35 -138L33 -115L23 -109L29 -99L2 -65L10 -97Z", "#304762", INK, 1.2),
    line("lapel-gold-piping", "M-31 -136L-27 -117L-15 -109L-21 -96L1 -70 M30 -136L28 -118L18 -109L23 -100L4 -74", GOLD, 1.4),
    fill("lapel-perforation", dots(-25,-127,5,2.7,5.5,.95) + dots(25,-126,5,-2.5,5,.9), PAPER),
    fill("decorative-pin", "M-29 -130L-25 -134L-21 -130L-25 -126Z", GOLD, INK, .6),
    fill("jacket-buttons", circle(3,-47,2.1)+circle(2,-16,2.1), GOLD, INK, .8),
    line("jacket-opening", "M2 -62Q-3 -28 -1 16", GOLD, 1),
    line("jacket-pockets", "M-30 -49L-13 -47 M13 -46L31 -49 M-29 -46L-14 -44 M14 -43L30 -46", INK, 1.5),
    line("jacket-hem", "M-35 15Q-22 22 -5 18 M9 18Q26 22 35 15", GOLD, 1.4),
    fill("hem-punched-leaves", "M-30 9Q-33 2 -26 1Q-25 6 -30 9Z M-24 12Q-22 3 -17 6Q-17 11 -24 12Z M21 12Q17 6 22 4Q27 8 21 12Z M28 9Q27 1 33 2Q35 7 28 9Z", GOLD),
    line("trouser-creases", "M-18 38L-20 119 M19 39L25 120", "#5e7388", 1.3),
    fill("shoe-left", "M-12 119L-9 131L-7 141Q-23 149 -40 141Q-43 136 -34 132L-24 129L-23 122Z", INK),
    fill("shoe-right", "M16 120L21 128Q32 132 42 131L48 140Q31 147 11 140L6 130L7 121Z", INK),
    line("shoe-cutouts", "M-32 136Q-24 133 -17 135 M23 137Q32 135 39 138", PAPER, 1.2),
  ],
  head: {
    anchor: [0, -151],
    graphic: graphic("M-35 -97Q-21 -118 0 -117Q28 -118 39 -98Q48 -81 40 -64L43 -59L51 -49Q55 -43 47 -39L39 -37L44 -27Q34 -19 13 -24L7 -14L8 8L-9 16L-25 0Q-43 -9 -46 -42L-45 -69Z", SKIN, INK, 2.4),
    eye: {
      path: "M3 -65Q16 -71 29 -65Q16 -62 3 -65Z M-27 -67Q-20 -71 -12 -67Q-19 -64 -27 -67Z",
      holes: circle(18,-66,2.8) + circle(-18,-67.5,2.2),
    },
    ornament: graphic("M-44 -56Q-51 -89 -35 -109Q-15 -122 8 -119Q32 -120 40 -107L40 -78L33 -81L30 -98Q8 -109 -11 -101Q-29 -97 -33 -82L-34 -59Z", INK),
    jawAnchor: [9, -23],
    jaw: graphic("M0 0Q18 4 35 -1Q42 8 33 19Q24 31 9 25Q-2 22 -6 12Z", SKIN, INK, 1.2),
    jawLimit: .36,
    headLimit: .15,
    details: [
      fill("temple-highlight", "M-30 -87Q-16 -100 5 -98Q-13 -91 -23 -75L-24 -51L-31 -56Z", LIGHT),
      fill("cheek-plane", "M6 -51Q19 -58 32 -51L38 -40Q29 -33 10 -37Q4 -41 6 -51Z", "#ddb58a"),
      fill("far-cheek", "M-23 -53Q-9 -61 1 -48Q4 -35 -8 -29Q-23 -27 -27 -40Z", "#d8ad84"),
      fill("ear", "M-36 -55Q-52 -64 -51 -45Q-51 -27 -37 -22L-31 -31L-33 -49Z", SKIN, INK, 1.6),
      line("ear-carving", "M-39 -49Q-48 -55 -47 -43Q-47 -33 -40 -31 M-40 -42Q-34 -44 -38 -36", PAPER, 1.6),
      fill("eyebrows", "M0 -77Q17 -82 32 -75L31 -72Q17 -77 1 -73Z M-28 -78Q-18 -82 -8 -77L-8 -74Q-18 -77 -28 -74Z", INK),
      line("lower-eyelids", "M3 -60Q16 -55 29 -60 M-26 -62Q-19 -58 -13 -62", SHADE, 1.5),
      line("eye-creases", "M4 -72Q16 -78 27 -71 M-27 -73Q-21 -78 -14 -73", SHADE, 1),
      line("forehead-creases", "M-17 -93Q1 -99 18 -93 M-11 -86Q1 -90 15 -86", SHADE, .9),
      line("nose-bridge", "M31 -66Q26 -54 34 -48Q41 -44 47 -49", SHADE, 1.6),
      fill("nostrils", "M42 -43Q47 -47 51 -42Q47 -40 42 -43Z M29 -44Q33 -47 37 -43Z", INK),
      line("cheek-fold", "M30 -40Q20 -36 18 -27 M43 -35L45 -29 M-23 -33Q-18 -24 -10 -21", SHADE, 1.5),
      line("upper-lip", "M13 -24Q29 -20 46 -27", "#783f37", 2.2),
      line("hair-comb", "M-38 -90Q-25 -109 -1 -111 M-28 -102Q-7 -115 16 -110 M-14 -107Q8 -115 30 -105 M-42 -72L-42 -66", "#758085", .95),
      fill("hair-perforations", dots(-41,-86,4,1.1,-4, .75), PAPER),
      fill("eye-glints", circle(19,-67,.75) + circle(-17,-68,.6), PAPER),
    ],
    jawDetails: [
      line("lower-lip", "M4 2Q20 7 36 0", "#9d5b4e", 1.5),
      line("chin-fold", "M8 17Q20 22 31 14", SHADE, 1.3),
      fill("chin-highlight", "M13 12Q23 16 32 8Q29 20 17 20Z", LIGHT),
    ],
  },
  arms: {
    right: arm([34,-134], 1, "point"),
    left: arm([-34,-134], -1, "palm"),
  },
};
