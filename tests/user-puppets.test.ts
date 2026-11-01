import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARACTERS, characterScene, characterSvg, REST_RIG, type SceneNode } from "../src/characters";
import SPRITES from "../src/puppet-sprites.json";

type Matrix=readonly number[];
const multiply=(p:Matrix,q:Matrix)=>[
  p[0]*q[0]+p[2]*q[1],p[1]*q[0]+p[3]*q[1],p[0]*q[2]+p[2]*q[3],p[1]*q[2]+p[3]*q[3],
  p[0]*q[4]+p[2]*q[5]+p[4],p[1]*q[4]+p[3]*q[5]+p[5],
];
const sources={
  prayut:"8e9270fe6e1fa79e680b6f7588ed30a5f34801782119c87cceb95db0bf1c6fa6",
  thaksin:"0c03025b012a2ff0cd18ad395feaa2807baa9207e63df3806a72f044564dbb5e",
  prawit:"2b411c9edd9b1d0b312cd4606ccc7cb8b3fc970d9841245c882542012c008566",
  anutin:"2725897d173496ebd8b4f69bccd9dff77a5ae9560eb4e9e1c6f57d4be0d3bf2c",
  thanathorn:"08b7861905dc8322f7fbe7ba83818d00b603a77bc1425bb3542f95ceb7071f51",
};
describe("supplied puppet artwork",()=>{
  for(const [id,hash] of Object.entries(sources)) {
    it(`${id}: keeps the user's exact PNG as the source of its sprites`,()=>{
      const file=readFileSync(new URL(`../art/puppets/${id}.png`,import.meta.url));
      expect(createHash("sha256").update(file).digest("hex")).toBe(hash);
      expect(file.readUInt32BE(16)).toBe(1024);expect(file.readUInt32BE(20)).toBe(1536);
      expect(file[25]).toBe(id === "thanathorn" ? 2 : 6); // Preserve RGB or RGBA exactly as supplied.
      const boxes=SPRITES[id as keyof typeof SPRITES] as Record<string,{x:number;y:number;w:number;h:number}>;
      expect(Object.keys(boxes).sort()).toEqual(["body","head","jaw","palm-hand","palm-lower","palm-upper","point-hand","point-lower","point-upper"]);
      for(const [name,box] of Object.entries(boxes)) {
        const sprite=readFileSync(new URL(`../public/characters/sprites/${id}-${name}.webp`,import.meta.url));
        expect(sprite.subarray(8,12).toString()).toBe("WEBP");
        expect(box.x+box.w).toBeLessThanOrEqual(1024);expect(box.y+box.h).toBeLessThanOrEqual(1536);
      }
      const svg=readFileSync(new URL(`../public/characters/${id}.svg`,import.meta.url),"utf8");
      expect([...svg.matchAll(/href="data:image\/webp;base64,/g)].length).toBe(9);
      expect(svg).not.toMatch(/href="\/characters\//);
      expect(svg.length).toBeLessThan(600_000);
    });
    it(`${id}: aligns every moving crop to the same original image at its reference pose`,()=>{
      const character=CHARACTERS.find(c=>c.id===id)!;
      const matrices:Matrix[]=[];
      function walk(nodes:SceneNode[],parent:Matrix=[1,0,0,1,0,0]) {
        for(const node of nodes) {
          const a=node.rotation??0,s=node.scaleX??1;
          const local=[Math.cos(a)*s,Math.sin(a)*s,-Math.sin(a),Math.cos(a),node.x??0,node.y??0];
          const world=multiply(parent,local);
          const image=node.graphic?.image;
          if(image) {
            // Undo each sprite's crop offset to recover the original-image matrix.
            const name=image.src.slice(`/characters/sprites/${id}-`.length,-".webp".length);
            const box=(SPRITES[id as keyof typeof SPRITES] as Record<string,{x:number;y:number}>)[name];
            matrices.push(multiply(multiply(world,image.matrix),[1,0,0,1,-box.x,-box.y]));
          }
          walk(node.children??[],world);
        }
      }
      walk(characterScene(character,REST_RIG));
      expect(matrices).toHaveLength(9);
      for(const matrix of matrices)for(let i=0;i<6;i++)expect(matrix[i]).toBeCloseTo(matrices[0][i],5);
      const svg=characterSvg(character);
      expect([...svg.matchAll(/<image /g)].length).toBe(9);
      expect([...svg.matchAll(/<use /g)].length).toBe(9);
      const ids=new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
      for(const [,ref]of svg.matchAll(/href="#([^"]+)"/g))expect(ids.has(ref)).toBe(true);
    });
  }
});
