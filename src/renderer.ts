import { actorPoint, stagePoint, stageAnchor, type StagePlacement, type StageTransform } from "./stage-geometry";
import type { Point, Pose, Settings } from "./core";
import { PuppetTurn } from "./puppet-turn";
import { carry, enterFade, exitFade, ENTER_MS, EXIT_MS, MOVE_MS, type Mark } from "./stage-motion";
import { stagePaintOrder } from "./stage-order";
import { depthPoint, PuppetDepthRenderer } from "./puppet-depth";
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
    center: "#fff5cf",
    edge: "#86624e",
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
const artwork = new Map<string,HTMLImageElement>();
let artworkRevision = 0;
function imageAsset(src:string) {
  let image=artwork.get(src);
  if(!image) {
    image=new Image();image.onload=()=>{artworkRevision++;};
    image.src=`${import.meta.env.BASE_URL}${src.replace(/^\//,"")}`;
    artwork.set(src,image);
  }
  return image;
}
/** Resolve once a sprite is decoded (or failed), sharing the renderer's cache. */
export function loadArtwork(src:string):Promise<void> {
  const image=imageAsset(src);
  if(image.complete)return Promise.resolve();
  return new Promise(resolve=>{
    image.addEventListener("load",()=>{image.decode().catch(()=>{}).finally(resolve);},{once:true});
    image.addEventListener("error",()=>resolve(),{once:true});
  });
}
function cachedPath(data:string) {
  let path=paths.get(data);if(!path){path=new Path2D(data);paths.set(data,path);}return path;
}
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
      if(g.image) {
        const image=imageAsset(g.image.src);
        if(image.complete&&image.naturalWidth>0) {
          c.save();c.clip(cachedPath(g.path+(g.holes??"")),"evenodd");
          for(const exclusion of g.exclude??[])c.clip(cachedPath("M-1000 -1000H1000V1000H-1000Z "+exclusion),"evenodd");
          c.transform(...g.image.matrix);c.drawImage(image,0,0,g.image.width,g.image.height);c.restore();
        }
      } else {
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
  placement?: StagePlacement;
  control?: "Left" | "Right";
  selected?: boolean;
}
type ActorBuffer = {
  puppet: HTMLCanvasElement; mask: HTMLCanvasElement; previous: HTMLCanvasElement;
  active: CharacterId | null; previousCharacter: CharacterDefinition | null;
  changedAt:number; signature:string;
  turn:PuppetTurn;
  /** Stage choreography: when it entered, its placement mark and any carry in progress. */
  bornAt:number; mark:Mark|null; carryFrom:Mark|null; carryAt:number;
  /** Last on-stage matrix, so a removed puppet can leave from where it stood. */
  shown:[number,number,number,number,number,number]|null;
};
type Ghost={buffer:HTMLCanvasElement;matrix:[number,number,number,number,number,number];leftAt:number};
const layer=()=>{const canvas=document.createElement("canvas");canvas.width=1280;canvas.height=720;return canvas;};
export class StageRenderer {
  private context:CanvasRenderingContext2D;
  private background=layer();
  private scene=layer();
  private rawPuppet=document.createElement("canvas");
  private depthRenderer=new PuppetDepthRenderer();
  private logo=new Image();
  private theme="";
  private frameSignature="";
  private transitionUntil=0;
  private turning=false;
  private actors=new Map<string,ActorBuffer>();
  private ghosts:Ghost[]=[];
  private hasDrawn=false;
  private reduceMotion=typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  private targets:{key:string;transform:StageTransform;mask:HTMLCanvasElement}[]=[];
  constructor(private canvas:HTMLCanvasElement) {
    this.context=canvas.getContext("2d")!;canvas.width=1280;canvas.height=720;
    this.logo.onload=()=>{this.frameSignature="";};
    this.logo.src=`${import.meta.env.BASE_URL}branding/nanglung-logo.webp`;
    this.rawPuppet.width=700;this.rawPuppet.height=800;
  }
  hitTest(clientX:number,clientY:number):string|null {
    const point=stagePoint(clientX,clientY,this.canvas.getBoundingClientRect());
    if(!point)return null;
    for(const target of [...this.targets].reverse()) {
      const local=actorPoint(point.x,point.y,target.transform),x=Math.floor(local.x),y=Math.floor(local.y);
      if(x<2||y<2||x>=698||y>=798)continue;
      const pixels=target.mask.getContext("2d")!.getImageData(x-2,y-2,5,5).data;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]>80)return target.key;
    }
    return null;
  }
  draw(pose:Pose,settings:Settings) {this.drawActors([{key:"single",pose,character:settings.character}],settings);}
  drawActors(actors:StageActor[],settings:Settings,paused=false,now=performance.now(),dragging?:string) {
    const frameSignature=JSON.stringify([artworkRevision,actors,settings.theme,settings.rods,settings.accessories,paused,dragging]);
    if(frameSignature===this.frameSignature&&!this.transitionUntil&&(!this.turning||paused))return;
    this.frameSignature=frameSignature;
    this.turning=false;
    const palette=palettes[settings.theme];
    if(this.theme!==settings.theme){this.drawBackdrop(palette);this.theme=settings.theme;}
    const liveKeys=new Set(actors.map(a=>a.key));
    for(const [key,buffers] of this.actors)if(!liveKeys.has(key)) {
      // A removed puppet keeps its last picture and is lifted off the screen.
      if(buffers.shown&&!this.reduceMotion){this.ghosts.push({buffer:buffers.puppet,matrix:buffers.shown,leftAt:now});this.animateUntil(now+EXIT_MS);}
      this.actors.delete(key);
    }
    const scene=this.scene.getContext("2d")!;
    scene.clearRect(0,0,1280,720);scene.drawImage(this.background,0,0);
    if(dragging) {
      scene.save();scene.strokeStyle="#fff0cf80";scene.lineWidth=2;scene.setLineDash([10,10]);
      scene.beginPath();scene.moveTo(640,125);scene.lineTo(640,665);scene.stroke();
      scene.font="18px Thonburi,sans-serif";scene.fillStyle="#443024";scene.textAlign="center";
      scene.fillText("ฝั่งซ้าย · มือซ้าย",320,125);scene.fillText("ฝั่งขวา · มือขวา",960,125);scene.restore();
    }
    this.targets=[];
    this.ghosts=this.ghosts.filter(ghost=>{
      const fade=exitFade(now-ghost.leftAt);
      if(fade.done)return false;
      scene.save();scene.globalAlpha=fade.alpha;scene.translate(0,fade.dy);scene.transform(...ghost.matrix);scene.drawImage(ghost.buffer,-350,-400);scene.restore();
      return true;
    });
    const orderedActors=stagePaintOrder(actors);
    for(const actor of orderedActors) {
      let buffers=this.actors.get(actor.key);
      if(!buffers) {
        const puppet=document.createElement("canvas"),mask=document.createElement("canvas"),previous=document.createElement("canvas");
        puppet.width=mask.width=previous.width=700;puppet.height=mask.height=previous.height=800;
        buffers={puppet,mask,previous,active:null,previousCharacter:null,changedAt:-Infinity,signature:"",turn:new PuppetTurn(actor.pose.facing),
          bornAt:this.hasDrawn&&!this.reduceMotion?now:-Infinity,mark:null,carryFrom:null,carryAt:0,shown:null};
        if(this.hasDrawn)this.animateUntil(now+ENTER_MS);
        this.actors.set(actor.key,buffers);
      }
      const character=getCharacter(actor.character),pose=actor.pose;
      const depth={start:character.head.anchor[1]+20,end:character.footY};
      const turn=buffers.turn.sample(pose.facing,now,paused);
      this.turning ||= turn.active;
      if(buffers.active!==character.id) {
        const old=buffers.previous.getContext("2d")!;old.clearRect(0,0,700,800);old.drawImage(buffers.puppet,0,0);
        buffers.previousCharacter=buffers.active?getCharacter(buffers.active):null;
        if(buffers.active)this.transitionUntil=now+240;
        buffers.active=character.id;buffers.changedAt=now;
      }
      const signature=JSON.stringify([artworkRevision,actor.character,pose.mouth,pose.head,pose.rightArm,pose.leftArm,settings.theme,settings.rods,settings.accessories]);
      if(signature!==buffers.signature) {
        for(const [buffer,rods] of [[this.rawPuppet,settings.rods],[buffers.mask,false]] as const) {
          const pc=buffer.getContext("2d")!;pc.clearRect(0,0,700,800);pc.save();pc.translate(350,400);
          paintCharacter(pc,character,pose,palette.ink,rods,settings.accessories);pc.restore();
        }
        this.depthRenderer.render(this.rawPuppet,buffers.puppet,depth);
        buffers.signature=signature;
      }
      const placement=actor.placement;
      const scale=placement?.scale??1.46;
      const anchor=stageAnchor(pose,placement);
      // Placement changes made outside a drag (switching side, the bank
      // reflowing after an add or remove) are carried rather than jumped.
      const mark:Mark|null=placement?{x:placement.x*1280,baseline:placement.baseline}:null;
      let carried={dx:0,dy:0,lean:0};
      if(mark) {
        const moved=buffers.mark&&(buffers.mark.x!==mark.x||buffers.mark.baseline!==mark.baseline);
        if(moved&&dragging!==actor.key&&!this.reduceMotion) {
          const from=buffers.carryFrom?carry(buffers.carryFrom,buffers.mark!,now-buffers.carryAt):null;
          buffers.carryFrom=from&&!from.done?{x:from.x,baseline:from.baseline}:{...buffers.mark!};
          buffers.carryAt=now;this.animateUntil(now+MOVE_MS);
        } else if(moved) buffers.carryFrom=null;
        buffers.mark=mark;
        if(buffers.carryFrom) {
          const step=carry(buffers.carryFrom,mark,now-buffers.carryAt);
          if(step.done)buffers.carryFrom=null;
          else carried={dx:step.x-mark.x,dy:step.baseline-mark.baseline,lean:step.lean};
        }
      }
      const entering=enterFade(now-buffers.bornAt);
      const x=anchor.x+carried.dx,baseline=anchor.baseline+carried.dy+entering.dy;
      const transform:StageTransform={x,y:baseline-depthPoint(0,character.footY,depth).y*scale,scale,facing:pose.facing,angle:pose.tilt+(placement?.lean??0)+carried.lean,horizontalScale:turn.horizontalScale,shear:turn.shear,depth};
      const draw=(buffer:HTMLCanvasElement,def:CharacterDefinition,alpha:number)=>{
        const visibleWidth=Math.abs(turn.horizontalScale)<.006?(turn.horizontalScale<0?-.006:.006):turn.horizontalScale;
        const defDepth={start:def.head.anchor[1]+20,end:def.footY};
        scene.save();scene.globalAlpha=alpha*entering.alpha;scene.translate(x,baseline-depthPoint(0,def.footY,defDepth).y*scale);
        scene.rotate(transform.angle);scene.transform(visibleWidth*scale,0,turn.shear*scale,scale,0,0);
        if(def===character){const m=scene.getTransform();buffers!.shown=[m.a,m.b,m.c,m.d,m.e,m.f];}
        scene.drawImage(buffer,-350,-400);scene.restore();
      };
      const blend=Math.min(1,(now-buffers.changedAt)/240),eased=blend*blend*(3-2*blend);
      if(buffers.previousCharacter&&blend<1)draw(buffers.previous,buffers.previousCharacter,1-eased);
      draw(buffers.puppet,character,buffers.previousCharacter?eased:1);
      this.targets.push({key:actor.key,transform,mask:buffers.mask});
    }
    const c=this.context;
    c.clearRect(0,0,1280,720);
    // Focus belongs to each puppet, following its head-to-foot projection.
    c.drawImage(this.scene,0,0);
    // The logo stays crisp; it is artwork with real alpha, without a sign board.
    if(this.logo.complete&&this.logo.naturalWidth>0) {
      const width=190,height=width*this.logo.naturalHeight/this.logo.naturalWidth;
      c.save();c.globalAlpha=.93;c.drawImage(this.logo,(1280-width)/2,18,width,height);c.restore();
    }
    // Small hand tags identify control without changing the puppet's silhouette.
    for(const actor of orderedActors.filter(a=>a.control)) {
      const target=this.targets.find(t=>t.key===actor.key)!;
      const x=Math.max(65,Math.min(1215,target.transform.x));
      c.save();c.font="14px Thonburi, sans-serif";c.textAlign="center";
      c.fillStyle=actor.selected?"#3d281edb":"#3d281e99";
      c.beginPath();c.roundRect(x-52,680,104,27,13);c.fill();
      c.strokeStyle=actor.control==="Left"?"#9ed8ce":"#e2ba75";c.lineWidth=actor.selected?2:1;c.stroke();
      c.fillStyle="#fff0cf";c.fillText(`${actor.control==="Left"?"L":"R"} · ${getCharacter(actor.character).name}`,x,699);c.restore();
    }
    if(now>=this.transitionUntil)this.transitionUntil=0;
    this.hasDrawn=true;
  }
  /** Keep redrawing every frame until a stage animation has finished. */
  private animateUntil(until:number) { this.transitionUntil=Math.max(this.transitionUntil,until); }
  private drawBackdrop(p:Palette) {
    const c=this.background.getContext("2d")!;
    const light=c.createRadialGradient(630,255,10,640,310,790);
    light.addColorStop(0,p.center);light.addColorStop(.23,p.center);
    light.addColorStop(.55,p.edge);light.addColorStop(1,"#38251f");
    c.fillStyle=light;c.fillRect(0,0,1280,720);
    // Deterministic fine woven grain and a gently sagging seam in the cloth.
    let seed=4201;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<27000;i++) {
      c.fillStyle=random()>.5?"#fff5d20c":"#3e261510";
      c.fillRect(random()*1280,random()*720,random()*2+.3,.7);
    }
    c.lineWidth=.6;c.strokeStyle="#fff1ca10";
    for(let y=0;y<720;y+=3){c.beginPath();c.moveTo(0,y);c.lineTo(1280,y+1);c.stroke();}
    c.strokeStyle="#4d2d192b";c.lineWidth=2;
    c.beginPath();c.moveTo(-10,47);c.bezierCurveTo(390,74,880,19,1290,35);c.stroke();
    c.strokeStyle="#fff1cd33";c.lineWidth=1;c.beginPath();c.moveTo(-10,50);c.bezierCurveTo(390,77,880,22,1290,38);c.stroke();
    const shade=c.createRadialGradient(640,310,240,640,360,790);
    shade.addColorStop(0,"#25150e00");shade.addColorStop(.6,"#25150e0c");shade.addColorStop(1,"#25150e70");
    c.fillStyle=shade;c.fillRect(0,0,1280,720);
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
