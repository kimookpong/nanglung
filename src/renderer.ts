import type { Point, Pose, Settings } from "./core";
import {
  armKinematics,
  characterScene,
  getCharacter,
  type SceneNode,
  type CharacterDefinition,
  type CharacterId,
} from "./characters";

const palettes = {
  amber: {
    center: "#fff0c6",
    edge: "#d9a966",
    ink: "#26211c",
    accent: "#a03d2a",
    glow: "#f4c66f",
  },
  ivory: {
    center: "#fffdf1",
    edge: "#d9d2b4",
    ink: "#252b29",
    accent: "#435c48",
    glow: "#e7ddaa",
  },
  night: {
    center: "#a3b6be",
    edge: "#435563",
    ink: "#162128",
    accent: "#26353d",
    glow: "#afc8d4",
  },
};
type Palette = typeof palettes.amber;

const paths = new Map<string, Path2D>();
function shape(c: CanvasRenderingContext2D, data: string) {
  let path = paths.get(data);
  if (!path) {
    path = new Path2D(data);
    paths.set(data, path);
  }
  c.fill(path);
}
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function drawScene(c: CanvasRenderingContext2D, nodes: SceneNode[]) {
  for (const node of nodes) {
    c.save();
    c.translate(node.x ?? 0, node.y ?? 0);
    c.scale(node.scaleX ?? 1, 1);
    c.rotate(node.rotation ?? 0);
    if (node.graphic) {
      const g = node.graphic;
      if (g.fill && g.fill !== "none") c.fillStyle = g.fill;
      if (g.fill !== "none" && g.holes) {
        let clip = paths.get(g.path);
        if (!clip) {
          clip = new Path2D(g.path);
          paths.set(g.path, clip);
        }
        const data = g.path + " " + g.holes;
        let punched = paths.get(data);
        if (!punched) {
          punched = new Path2D(data);
          paths.set(data, punched);
        }
        c.save();
        c.clip(clip);
        c.fill(punched, "evenodd");
        c.restore();
      } else if (g.fill !== "none") shape(c, g.path);
      if (g.stroke) {
        let outline = paths.get(g.path);
        if (!outline) { outline = new Path2D(g.path); paths.set(g.path, outline); }
        c.strokeStyle = g.stroke;
        c.lineWidth = g.strokeWidth ?? 1;
        c.lineCap = "round";
        c.lineJoin = "round";
        c.stroke(outline);
      }
    }
    if (node.children) drawScene(c, node.children);
    c.restore();
  }
}

export function paintCharacter(
  c: CanvasRenderingContext2D,
  character: CharacterDefinition,
  pose: Pose,
  ink: string,
  rods: boolean,
  accessories = true,
) {
  c.save();
  c.fillStyle = ink;
  c.strokeStyle = ink;
  if (rods) {
    c.save();
    c.globalAlpha = 0.65;
    c.lineWidth = 1.6;
    for (const key of ["right", "left"] as const) {
      const arm = character.arms[key],
        v = key === "right" ? pose.rightArm : pose.leftArm;
      const [x, y] = armKinematics(arm, v).wrist;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + arm.side * 20, 390);
      c.stroke();
    }
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(0, -25);
    c.lineTo(0, 390);
    c.stroke();
    c.restore();
  }
  drawScene(c, characterScene(character, pose, accessories));
  c.restore();
}

export interface StageActor {
  key: string;
  pose: Pose;
  character: CharacterId;
}
type ActorBuffer = {
  puppet: HTMLCanvasElement;
  previous: HTMLCanvasElement;
  active: CharacterId | null;
  previousCharacter: CharacterDefinition | null;
  changedAt: number;
};
export class StageRenderer {
  private context: CanvasRenderingContext2D;
  private background = document.createElement("canvas");
  private logo = new Image();
  private theme = "";
  private actors = new Map<string, ActorBuffer>();
  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext("2d")!;
    canvas.width = this.background.width = 1280;
    canvas.height = this.background.height = 720;
    // Cache the supplied logo with the scenery, including fullscreen and themes.
    this.logo.onload = () => { this.theme = ""; };
    this.logo.src = `${import.meta.env.BASE_URL}branding/nanglung-logo.png`;
  }
  draw(pose: Pose, settings: Settings) {
    this.drawActors([{ key: "single", pose, character: settings.character }], settings);
  }
  drawActors(actors: StageActor[], settings: Settings) {
    const palette = palettes[settings.theme];
    if (this.theme !== settings.theme) {
      this.drawBackdrop(palette);
      this.theme = settings.theme;
    }
    const c = this.context;
    c.clearRect(0, 0, 1280, 720);
    c.drawImage(this.background, 0, 0);
    for (const actor of actors) {
      let buffers = this.actors.get(actor.key);
      if (!buffers) {
        const puppet = document.createElement("canvas"), previous = document.createElement("canvas");
        puppet.width = previous.width = 700;
        puppet.height = previous.height = 800;
        buffers = { puppet, previous, active: null, previousCharacter: null, changedAt: -Infinity };
        this.actors.set(actor.key, buffers);
      }
      const character = getCharacter(actor.character), pose = actor.pose;
      const now = performance.now();
      if (buffers.active !== character.id) {
        const previous = buffers.previous.getContext("2d")!;
        previous.clearRect(0, 0, 700, 800);
        previous.drawImage(buffers.puppet, 0, 0);
        buffers.previousCharacter = buffers.active ? getCharacter(buffers.active) : null;
        buffers.active = character.id;
        buffers.changedAt = now;
      }
      const pc = buffers.puppet.getContext("2d")!;
      pc.clearRect(0, 0, 700, 800);
      pc.save();
      pc.translate(350, 400);
      paintCharacter(pc, character, pose, palette.ink, settings.rods, settings.accessories);
      pc.restore();
      const blend = Math.min(1, (now - buffers.changedAt) / 240);
      const eased = blend * blend * (3 - 2 * blend);
      const scale = actors.length > 1 ? 0.86 : 1;
      const draw = (buffer: HTMLCanvasElement, def: CharacterDefinition, alpha: number) => {
        c.save();
        c.globalAlpha = alpha;
        c.translate(pose.x * 1280, pose.y * 720 + 170 - def.footY * scale);
        c.rotate(pose.tilt);
        c.scale(pose.facing * scale, scale);
        c.drawImage(buffer, -350, -400);
        c.restore();
      };
      if (buffers.previousCharacter && blend < 1) draw(buffers.previous, buffers.previousCharacter, 1 - eased);
      draw(buffers.puppet, character, buffers.previousCharacter ? eased : 1);
    }
    c.fillStyle = "#382b24";
    c.fillRect(0, 680, 1280, 40);
    c.fillStyle = "#bd914a";
    c.fillRect(0, 679, 1280, 2);
    c.fillStyle = "#f6d89144";
    c.fillRect(0, 683, 1280, 1);
    c.font = "11px monospace";
    c.textAlign = "center";
    c.fillStyle = "#f6d89199";
    c.fillText("N A N G L U N G   ·   S H A D O W   T H E A T R E", 640, 704);
  }
  private drawBackdrop(p: Palette) {
    const c = this.background.getContext("2d")!;
    const light = c.createRadialGradient(640, 330, 30, 640, 330, 760);
    light.addColorStop(0, p.center);
    light.addColorStop(0.6, p.center);
    light.addColorStop(1, p.edge);
    c.fillStyle = light;
    c.fillRect(0, 0, 1280, 720);
    c.strokeStyle = "#5a401708";
    c.lineWidth = 0.7;
    for (let y = 0; y < 680; y += 4) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(1280, y);
      c.stroke();
    }
    c.strokeStyle = "#fff7dc19";
    for (let x = 0; x < 1280; x += 6) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 680);
      c.stroke();
    }
    // Botanical silhouettes at the edges of the illuminated cloth.
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side === -1 ? 120 : 1160, 680);
      c.scale(side, 1);
      c.fillStyle = p.ink;
      c.globalAlpha = 0.09;
      shape(c, "M0 0 Q25 -145 2 -250 Q16 -155 8 0Z");
      for (let i = 0; i < 9; i++) {
        const y = -20 - i * 23;
        shape(
          c,
          `M5 ${y} Q${65 - i * 3} ${y - 30} ${72 - i * 5} ${y - 65} Q30 ${y - 55} 5 ${y}Z`,
        );
        shape(
          c,
          `M5 ${y - 6} Q-50 ${y - 22} -62 ${y - 52} Q-8 ${y - 48} 5 ${y - 6}Z`,
        );
      }
      c.restore();
    }
    // A restrained proscenium, with scalloped cloth and punched ornament.
    c.fillStyle = p.accent;
    shape(
      c,
      "M0 0 H1280 V28 Q1210 81 1140 29 Q1070 81 1000 29 Q930 81 860 29 Q790 81 720 29 Q640 86 560 29 Q490 81 420 29 Q350 81 280 29 Q210 81 140 29 Q70 81 0 28Z",
    );
    c.fillRect(0, 0, 15, 680);
    c.fillRect(1265, 0, 15, 680);
    c.fillStyle = "#f0c36e";
    c.fillRect(0, 0, 1280, 3);
    for (let x = 36; x < 1280; x += 35) {
      c.save();
      c.translate(x, 17);
      c.rotate(Math.PI / 4);
      c.fillRect(-2, -2, 4, 4);
      c.restore();
    }
    if (this.logo.complete && this.logo.naturalWidth > 0) {
      const width = 260, height = width * this.logo.naturalHeight / this.logo.naturalWidth;
      const x = (1280 - width) / 2, y = 14;
      // A cream sign keeps the original artwork intact against every backdrop.
      c.save();
      c.shadowColor = "#26190d55";
      c.shadowBlur = 12;
      c.shadowOffsetY = 4;
      c.fillStyle = "#faf4e2";
      c.beginPath();
      c.roundRect(x - 7, y - 7, width + 14, height + 14, 5);
      c.fill();
      c.shadowColor = "transparent";
      c.strokeStyle = "#c49a58";
      c.lineWidth = 1.5;
      c.stroke();
      c.drawImage(this.logo, x, y, width, height);
      c.restore();
    }
    c.fillStyle = "#754e2630";
    c.font = "12px monospace";
    c.textAlign = "left";
    c.fillText("๐๑ / เวทีหนังตะลุง", 44, 95);
    c.textAlign = "right";
    c.fillText("ห้านิ้วต่อหนึ่งตัวละคร", 1236, 95);
  }
}

export const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
export function drawLandmarks(
  canvas: HTMLCanvasElement,
  points: Point[] | null,
  mirror: boolean,
  color = "#f2d69d",
  clear = true,
) {
  const c = canvas.getContext("2d")!;
  if (clear) c.clearRect(0, 0, canvas.width, canvas.height);
  if (!points) return;
  const x = (i: number) =>
    (mirror ? 1 - points[i].x : points[i].x) * canvas.width;
  const y = (i: number) => points[i].y * canvas.height;
  c.lineWidth = 2;
  c.strokeStyle = color;
  for (const [a, b] of CONNECTIONS) {
    c.beginPath();
    c.moveTo(x(a), y(a));
    c.lineTo(x(b), y(b));
    c.stroke();
  }
  for (let i = 0; i < points.length; i++) {
    c.fillStyle = [4, 8, 12, 16, 20].includes(i) ? "#f3a58a" : "#fff9e7";
    circle(c, x(i), y(i), [4, 8, 12, 16, 20].includes(i) ? 4 : 2.5);
  }
}

export function drawHands(canvas: HTMLCanvasElement, hands: { side: string; points: Point[] }[], mirror: boolean) {
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  for (const hand of hands) {
    const color = hand.side === "Left" ? "#8fe3d4" : "#f5c477";
    drawLandmarks(canvas, hand.points, mirror, color, false);
    c.fillStyle = color;
    c.font = "bold 16px sans-serif";
    c.textAlign = "center";
    const x = (mirror ? 1 - hand.points[0].x : hand.points[0].x) * canvas.width;
    c.fillText(hand.side === "Left" ? "L" : "R", x, Math.min(canvas.height - 8, hand.points[0].y * canvas.height + 24));
  }
}
