import type { CharacterDefinition, Graphic, SceneNode } from "./characters";

export const LEATHER = "#111518", IVORY = "#fff2d8";
export type PuppetArt = Pick<CharacterDefinition, "body" | "cloth" | "legs" | "decorations" | "head" | "arms" | "footY" | "viewBox">;
export const punchedDot = (x: number, y: number, r: number) =>
  `M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;

// Original leaf-and-vine incisions inspired by the user's leather puppet.
// Every motif is a true cutout, clipped to its moving piece by the shared rig.
function foliage(x: number, y: number, s: number, mirror: number) {
  const p = (dx: number, dy: number) => `${(x+dx*s*mirror).toFixed(2)} ${(y+dy*s).toFixed(2)}`;
  return `M${p(-1,8)}Q${p(8,0)} ${p(2,-9)}Q${p(11,-5)} ${p(8,2)}Q${p(6,9)} ${p(-1,8)}Z `+
    `M${p(0,4)}Q${p(-9,2)} ${p(-7,-5)}Q${p(-1,-4)} ${p(0,4)}Z `+
    `M${p(0,-2)}Q${p(-5,-6)} ${p(-2,-10)}Q${p(3,-7)} ${p(0,-2)}Z`;
}

export function carved(graphic: Graphic, spacing = 22): Graphic {
  // Garment paths use absolute M/L/Q/C coordinates. Pin circles and face shapes
  // never enter this function; their relative arc commands need no bounds parser.
  const values = graphic.path.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const xs = values.filter((_, i) => i%2===0), ys = values.filter((_, i) => i%2===1);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const narrow = Math.min(maxX-minX, maxY-minY) < 27;
  const gap = narrow ? 15 : spacing, size = narrow ? .56 : .79;
  let holes = graphic.holes ?? "";
  for (let row=0,y=minY+11;y<maxY-5;y+=gap,row++) {
    for (let col=0,x=minX+8+(row%2)*4;x<maxX-5;x+=gap,col++) {
      holes += foliage(x,y,size,(row+col)%2 ? -1 : 1);
      if (!narrow) holes += punchedDot(x-5,y+9,1);
    }
  }
  return {...graphic, fill:LEATHER, stroke:IVORY, strokeWidth:.75, holes};
}

export function joint(name: string, x = 0, y = 0): SceneNode {
  return {name,graphic:{path:punchedDot(x,y,4.5),fill:LEATHER,stroke:IVORY,strokeWidth:1},children:[
    {name:name+"-rivet",graphic:{path:punchedDot(x,y,1.6),fill:"#cfa56b"}},
  ]};
}

export function leatherCostume(art: PuppetArt): PuppetArt {
  const dressArm = (arm: CharacterDefinition["arms"]["right"]) => ({...arm,art:arm.art ? {
    ...arm.art,upper:carved(arm.art.upper),lower:carved(arm.art.lower),
    upperDetails:arm.art.upperDetails ?? [joint("shoulder-pin")],
    lowerDetails:arm.art.lowerDetails ?? [joint("elbow-pin")],
  } : undefined});
  return {...art,body:carved(art.body),cloth:carved(art.cloth),legs:carved(art.legs),
    arms:{right:dressArm(art.arms.right),left:dressArm(art.arms.left)},
    decorations:art.decorations?.map(n => {
      if (n.name.includes("lapel") && n.graphic?.fill && n.graphic.fill!=="none") return {...n,graphic:carved(n.graphic,18)};
      if (n.name==="blue-tie") return {...n,name:"red-tie",graphic:{...n.graphic!,fill:"#bd3028"}};
      return n;
    }),
  };
}
