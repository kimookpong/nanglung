import type { CharacterDefinition, Graphic, SceneNode, XY } from "./characters";

// Art coordinates follow the reference supplied by the user. Convert them into
// the existing puppet rig; the reference bitmap is not shipped with the app.
const SCALE = 0.48;
const INK = "#111314", WHITE = "#fffdf6", BLUE = "#34479b", CYAN = "#349ccc", RED = "#df363b";
type Projection = { origin?: XY; angle?: number; side?: number };
type Paint = Pick<Graphic, "fill" | "stroke" | "strokeWidth">;
function point(x: number, y: number, projection: Projection = {}): XY {
  const [ox, oy] = projection.origin ?? [350, 600];
  const angle = projection.angle ?? 0, side = projection.side ?? 1;
  const dx = (x - ox) * side, dy = y - oy;
  return [SCALE * (dx * Math.cos(angle) + dy * Math.sin(angle)), SCALE * (-dx * Math.sin(angle) + dy * Math.cos(angle))];
}
function path(data: string, projection: Projection = {}) {
  // The source art deliberately uses absolute M/L/C/Q/Z commands only.
  return data.replace(/([MLCQZ])([^MLCQZ]*)/g, (_, command: string, values: string) => {
    if (command === "Z") return "Z ";
    const numbers = values.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
    const mapped: string[] = [];
    for (let i = 0; i < numbers.length; i += 2) {
      const p = point(numbers[i], numbers[i + 1], projection);
      mapped.push(...p.map(v => String(Math.round(v * 1000) / 1000)));
    }
    return command + mapped.join(" ") + " ";
  }).trim();
}
function art(data: string, paint: Paint = {}, projection: Projection = {}): Graphic {
  return { path: path(data, projection), fill: INK, ...paint, ...(paint.strokeWidth ? { strokeWidth: paint.strokeWidth * SCALE } : {}) };
}
function detail(name: string, data: string, paint: Paint, projection: Projection = {}): SceneNode {
  return { name, graphic: art(data, paint, projection) };
}
function dot(x: number, y: number, r: number) {
  const k = r * 0.55228475;
  return `M${x-r} ${y}C${x-r} ${y-k} ${x-k} ${y-r} ${x} ${y-r}C${x+k} ${y-r} ${x+r} ${y-k} ${x+r} ${y}C${x+r} ${y+k} ${x+k} ${y+r} ${x} ${y+r}C${x-k} ${y+r} ${x-r} ${y+k} ${x-r} ${y}Z`;
}
const headProjection: Projection = { origin: [385, 250] };
const clothPath = "M241 465Q253 488 282 507Q328 536 391 539L389 724L214 721L217 535Q218 491 241 465Z";
const clothChecks = Array.from({ length: 10 }, (_, row) => Array.from({ length: 9 }, (_, col) => {
  const x = 224 + col * 18, y = 490 + row * 19;
  return `M${x} ${y}L${x+12} ${y}L${x+12} ${y+12}L${x} ${y+12}Z`;
}).join(" ")).join(" ");
const eyelashes = Array.from({ length: 38 }, (_, i) => {
  const a = i / 38 * Math.PI * 2;
  const x = 410 + Math.cos(a) * 34, y = 111 + Math.sin(a) * 22;
  return `M${x} ${y}Q${x+Math.cos(a)*4-Math.sin(a)*2} ${y+Math.sin(a)*4+Math.cos(a)*2} ${x+Math.cos(a)*8-Math.sin(a)*3} ${y+Math.sin(a)*8+Math.cos(a)*3}`;
}).join(" ");
const collarBeads = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  return dot(329 + t * 92, 234 + 28 * Math.sin(t * Math.PI * 0.86), 4.3);
}).join(" ");
const cheekCuts = "M346 207Q345 216 341 219 M358 208Q359 219 353 226 M372 199Q374 211 367 220 M385 200Q387 214 381 223 M399 198Q402 210 395 221 M411 199Q415 212 406 225 M374 227Q373 238 369 241 M389 226Q387 237 383 242 M405 225Q401 238 397 243";
const earCuts = "M327 98C313 94 306 102 306 111 M322 109Q331 105 330 114Q329 122 316 121 M302 120Q291 127 297 136Q304 141 311 135 M312 128Q321 125 321 135Q320 146 307 146 M298 148Q292 157 303 163Q314 165 317 156 M324 143Q332 148 324 157 M308 172Q312 183 323 177 M325 165Q336 167 330 180 M334 181Q345 188 336 195 M339 164Q347 172 341 181 M335 149Q344 153 342 161 M336 127Q344 136 341 145 M337 109Q346 117 345 125 M337 96Q347 100 350 111 M321 190Q327 201 336 199";

function referenceArm(
  shoulder: XY, elbow: XY, wrist: XY, side: 1 | -1, rest: number,
  hand: "point" | "ring", upperPath: string, lowerPath: string, handPath: string, handCuts: string, fingertip?: string,
): CharacterDefinition["arms"]["right"] {
  const angle = Math.atan2(elbow[1] - shoulder[1], side * (elbow[0] - shoulder[0]));
  const foreAngle = Math.atan2(wrist[1] - elbow[1], side * (wrist[0] - elbow[0]));
  const shoulderEnd = hand === "point" ? -0.95 : -0.8, elbowEnd = -0.45;
  const project = (origin: XY, a: number): Projection => ({ origin, angle: a, side });
  const handProjection = project(wrist, foreAngle);
  return {
    shoulder: point(...shoulder),
    upper: Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]) * SCALE,
    lower: Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1]) * SCALE,
    width: hand === "point" ? 9 : 8,
    side, hand,
    shoulderAngles: [(angle - rest * shoulderEnd) / (1 - rest), shoulderEnd],
    elbowAngles: [(foreAngle - angle - rest * elbowEnd) / (1 - rest), elbowEnd],
    art: {
      upper: art(upperPath, {}, project(shoulder, angle)),
      lower: art(lowerPath, {}, project(elbow, foreAngle)),
      hand: { ...art(handPath, {}, handProjection), ...(hand === "ring" ? { holes: path("M570 615Q582 607 610 615Q600 632 583 636Q567 637 567 627Q565 621 570 615Z", handProjection) } : {}) },
      handDetails: [
        detail("finger-cuts", handCuts, { fill: "none", stroke: WHITE, strokeWidth: 4 }, handProjection),
        ...(fingertip ? [detail("red-fingertip", fingertip, { fill: RED }, handProjection)] : []),
      ],
    },
  };
}

export const THENG_ART: Pick<CharacterDefinition, "body" | "cloth" | "legs" | "decorations" | "head" | "arms" | "accessory" | "footY" | "viewBox"> = {
  footY: 141,
  viewBox: "-260 -320 520 530",
  body: art("M281 224Q300 211 324 235L350 253Q381 276 416 258Q447 256 461 284Q469 306 449 341L449 396Q443 421 451 452Q465 492 446 520Q426 545 389 545L310 530Q277 519 282 482L294 412Q272 377 277 331L265 289Q256 246 281 224Z"),
  cloth: art(clothPath, { fill: WHITE }),
  legs: art("M231 718L287 721L280 766Q276 796 262 825Q258 837 273 839Q295 841 309 856L309 871L292 889Q274 891 259 877L218 867Q205 863 209 846Q210 830 219 811Q225 778 231 718Z M311 722L376 723Q369 757 361 790L360 821Q367 840 390 850Q408 858 430 859L423 868L424 879L411 894Q394 894 381 878L350 871L326 854Q319 865 305 860L299 853L312 839Q320 825 314 794Z"),
  accessory: {
    name: "มีดเหน็บ", attachment: "waist", anchor: [0, 0],
    graphic: art("M246 433Q237 415 248 406Q263 395 279 411Q300 430 307 459Q310 482 288 493L263 479L251 458Z", { fill: BLUE, stroke: WHITE, strokeWidth: 3 }),
  },
  decorations: [
    { name: "cloth-checks", graphic: { ...art(clothPath, { fill: BLUE }), holes: path(clothChecks) } },
    detail("cloth-red-edges", "M241 465Q220 494 218 538L215 684L388 689L389 542", { fill: "none", stroke: RED, strokeWidth: 6 }),
    detail("blue-waist-sash", "M256 444Q246 445 250 460Q267 492 313 520Q343 539 390 543Q402 546 398 556Q396 563 382 559Q330 553 295 529Q258 506 242 470Q234 449 248 443Z", { fill: CYAN }),
    detail("waist-stitching", "M248 466Q269 500 312 526Q346 546 387 548", { fill: "none", stroke: WHITE, strokeWidth: 3 }),
    detail("cloth-cuff", "M215 688L389 692L389 727L214 723Z", { fill: CYAN }),
    detail("cloth-cuff-fringe", Array.from({ length: 22 }, (_, i) => `M${219+i*7.7} 695L${222+i*7.7} 718L${225+i*7.7} 695`).join(" "), { fill: "none", stroke: WHITE, strokeWidth: 1.8 }),
    detail("cloth-cuff-beads", Array.from({ length: 28 }, (_, i) => dot(219+i*6, 686+i*0.016, 2)).join(" ") + Array.from({ length: 27 }, (_, i) => dot(230+i*5.8, 724+i*0.008, 1.6)).join(" "), { fill: WHITE }),
    detail("torso-cuts", "M273 286Q266 300 273 312 M278 322Q291 334 310 329 M285 347Q294 356 311 352 M294 374Q300 384 314 380 M299 398Q304 409 318 405 M303 420Q311 430 324 425 M381 339Q394 352 411 346 M389 369Q399 379 408 375 M438 315Q444 326 436 335 M437 495Q421 496 418 511Q417 519 424 522 M430 504Q423 511 430 518 M319 839Q312 847 321 851 M282 871Q287 868 291 873 M287 878Q293 875 298 880 M398 872Q405 869 410 874 M394 879Q401 875 405 880 M390 885Q395 881 399 886", { fill: "none", stroke: WHITE, strokeWidth: 4 }),
  ],
  head: {
    anchor: point(385, 250),
    graphic: art("M338 85Q370 49 404 54Q428 53 447 64Q479 63 500 79Q517 91 505 103Q499 110 486 108Q487 119 495 129L495 135L450 153Q430 163 424 178L421 209L416 244L404 263L354 252L332 221Q309 211 305 192Q288 182 287 160Q282 135 292 116Q298 91 321 87Z", {}, headProjection),
    eye: {
      path: path("M372 127Q387 98 419 96Q433 96 440 101Q431 121 412 126Q393 134 372 127Z", headProjection),
      holes: path(dot(413, 111, 11.5), headProjection),
    },
    jawAnchor: point(427, 178, headProjection),
    jaw: art("M427 178Q450 165 494 145Q509 143 516 157Q521 168 509 176Q483 187 443 206L426 197L420 188Z", {}, { origin: [427, 178] }),
    jawLimit: 0.3,
    headLimit: 0.16,
    details: [
      detail("ear-curls", earCuts, { fill: "none", stroke: WHITE, strokeWidth: 4 }, headProjection),
      detail("eye-lashes", eyelashes, { fill: "none", stroke: WHITE, strokeWidth: 1.8 }, headProjection),
      detail("eye-glint", dot(418, 107, 3.5), { fill: WHITE }, headProjection),
      detail("nose-cut", "M477 98Q466 98 469 107Q472 112 478 109", { fill: "none", stroke: WHITE, strokeWidth: 3 }, headProjection),
      detail("neck-cuts", cheekCuts, { fill: "none", stroke: WHITE, strokeWidth: 4 }, headProjection),
      detail("upper-red-lip", "M426 174Q438 158 493 137L497 142Q448 163 429 180Z", { fill: RED, stroke: WHITE, strokeWidth: 1 }, headProjection),
      detail("blue-collar", "M326 225Q333 222 343 234Q372 261 414 244Q424 239 429 248Q434 258 421 263Q371 284 335 252Q314 237 326 225Z", { fill: CYAN }, headProjection),
      detail("collar-beads", collarBeads, { fill: WHITE }, headProjection),
      detail("collar-lower-stitch", "M337 254Q373 283 423 267", { fill: "none", stroke: WHITE, strokeWidth: 3 }, headProjection),
    ],
    jawDetails: [detail("lower-red-lip", "M428 179Q448 166 494 146L497 151Q452 171 431 184Z", { fill: RED, stroke: WHITE, strokeWidth: 1 }, { origin: [427, 178] })],
  },
  arms: {
    right: referenceArm([285, 260], [211, 414], [129, 585], -1, 0.16, "point",
      "M274 225Q294 211 308 232Q320 245 302 280L236 418Q228 435 212 426L199 416Q190 409 202 385L250 263Q259 236 274 225Z",
      "M199 401Q214 403 230 416L160 570Q152 588 137 596L114 582Q117 570 126 548Z",
      "M120 563Q147 562 158 582Q161 602 142 615L119 632Q110 638 99 634L83 638Q68 642 61 630L57 614Q56 631 62 650Q62 664 38 665Q28 659 35 642L39 598Q44 583 65 573Q86 560 120 563Z",
      "M91 580Q73 575 66 589 M82 597Q68 596 67 609 M95 611Q82 607 80 620 M107 618Q97 615 92 624 M211 389Q218 399 229 400",
      "M39 640Q53 632 58 641Q63 652 52 661Q44 668 35 662Q31 655 39 640Z"),
    left: referenceArm([438, 294], [476, 453], [527, 614], 1, 0.12, "ring",
      "M424 271Q449 250 461 281L493 431Q500 449 487 458Q469 470 461 443L430 328Q417 306 424 271Z",
      "M462 439Q481 436 490 451L531 590Q535 606 546 603L552 615L536 633Q513 632 503 607L468 484Q461 464 462 439Z",
      "M519 599Q531 614 547 604Q558 592 570 595L620 603Q633 605 619 619L604 635L617 653Q630 665 636 669Q636 676 619 672L602 664Q616 680 632 684Q641 690 632 693Q612 692 593 680Q608 699 628 704Q640 711 632 715Q609 714 592 701Q565 683 547 662Q524 642 519 621Z",
      "M476 454Q482 462 491 458"),
  },
};
