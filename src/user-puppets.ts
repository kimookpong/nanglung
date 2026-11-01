import type { CharacterDefinition, Graphic, SceneNode, XY } from "./characters";
import CUTS from "./puppet-cuts.json";
import SPRITES from "./puppet-sprites.json";

// The user's PNGs are the actual artwork. scripts/cut-puppet-sprites.py cuts them
// along src/puppet-cuts.json into outlined sprites; one affine projection per
// piece keeps every sprite aligned to the original image across the joints.
type Art=Pick<CharacterDefinition,"body"|"cloth"|"legs"|"head"|"arms"|"footY"|"viewBox"|"decorations"|"underlay">;
type Projection={origin?:XY;angle?:number;side?:1|-1};
type ArmSource={shoulder:XY;elbow:XY;wrist:XY;upper:string;lower:string;hand:string};
type Source={id:PuppetId;head:string;jaw:string;headPivot:XY;jawPivot:XY;body:string;point:ArmSource;palm:ArmSource};
type PuppetId=keyof typeof SPRITES;
type Box={x:number;y:number;w:number;h:number};
const SCALE=.285,ORIGIN:XY=[535,1030];
function matrix(p:Projection={}) {
  const [ox,oy]=p.origin??ORIGIN,a=p.angle??0,s=p.side??-1;
  const aa=SCALE*s*Math.cos(a),b=-SCALE*s*Math.sin(a),c=SCALE*Math.sin(a),d=SCALE*Math.cos(a);
  return [aa,b,c,d,-aa*ox-c*oy,-b*ox-d*oy] as const;
}
function point(x:number,y:number,p:Projection={}):XY {
  const [a,b,c,d,e,f]=matrix(p);return [a*x+c*y+e,b*x+d*y+f];
}
function path(data:string,p:Projection={}) {
  return data.replace(/([MLCQZ])([^MLCQZ]*)/g,(_,command:string,values:string)=>{
    if(command==="Z")return "Z ";
    const numbers=values.match(/-?\d*\.?\d+/g)?.map(Number)??[],out:string[]=[];
    for(let i=0;i<numbers.length;i+=2)out.push(...point(numbers[i],numbers[i+1],p).map(v=>String(Math.round(v*1000)/1000)));
    return command+out.join(" ")+" ";
  }).trim();
}
function piece(id:PuppetId,name:string,p:Projection={}):Graphic {
  const {x,y,w,h}=(SPRITES[id] as Record<string,Box>)[name],[a,b,c,d,e,f]=matrix(p);
  return {path:path(`M${x} ${y}L${x+w} ${y}L${x+w} ${y+h}L${x} ${y+h}Z`,p),
    image:{src:`/characters/sprites/${id}-${name}.webp`,width:w,height:h,matrix:[a,b,c,d,e+a*x+c*y,f+b*x+d*y]}};
}
function arm(id:PuppetId,key:"point"|"palm",source:ArmSource,side:1|-1,rest:number,raised:XY):CharacterDefinition["arms"]["right"] {
  const {shoulder,elbow,wrist}=source;
  const a=Math.atan2(elbow[1]-shoulder[1],-side*(elbow[0]-shoulder[0]));
  const f=Math.atan2(wrist[1]-elbow[1],-side*(wrist[0]-elbow[0]));
  const project=(origin:XY,angle:number):Projection=>({origin,angle,side:side===1?-1:1});
  const [end,elbowEnd]=raised;
  return {shoulder:point(...shoulder),side,upper:Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1])*SCALE,
    lower:Math.hypot(wrist[0]-elbow[0],wrist[1]-elbow[1])*SCALE,width:12,hand:side===1?"point":"palm",
    shoulderAngles:[(a-rest*end)/(1-rest),end],elbowAngles:[(f-a-rest*elbowEnd)/(1-rest),elbowEnd],
    art:{upper:piece(id,`${key}-upper`,project(shoulder,a)),lower:piece(id,`${key}-lower`,project(elbow,f)),hand:piece(id,`${key}-hand`,project(wrist,f))}};
}
// The pointing arm is in front of the face: it rises forward to a raised
// finger out ahead of the nose instead of sweeping across the face.
const POINT_RAISED:XY=[-.2,-.6],PALM_RAISED:XY=[-1.1,-.55];
function puppet(s:Source):Art {
  return {footY:143,viewBox:PUPPET_VIEWBOX,
    body:piece(s.id,"body"),cloth:{path:"",fill:"none"},legs:{path:"",fill:"none"},decorations:[],
    head:{anchor:point(...s.headPivot),graphic:piece(s.id,"head",{origin:s.headPivot}),eye:{path:""},
      jawAnchor:point(...s.jawPivot,{origin:s.headPivot}),jaw:piece(s.id,"jaw",{origin:s.jawPivot}),jawLimit:.23,headLimit:.12},
    arms:{right:arm(s.id,"point",s.point,1,.16,POINT_RAISED),left:arm(s.id,"palm",s.palm,-1,.12,PALM_RAISED)},
  };
}
/** One frame for every puppet so cards and exported SVGs share a scale. */
export const PUPPET_VIEWBOX="-240 -310 480 470";

// Satirical gimmicks are vector overlays on the sprites, outlined like leather.
// Paths are in source-image pixels and projected into the piece they ride on.
const LEATHER="#17130f",GOLD="#d6a23a",GOLD_DARK="#8a5a14";
const node=(name:string,graphic:Graphic,x=0,y=0):SceneNode=>({name,x,y,graphic});
const leather=(path:string,fill:string,strokeWidth=1.6):Graphic=>({path,fill,stroke:LEATHER,strokeWidth});
const circle=(x:number,y:number,r:number)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0Z`;

/** ลุงตู่: a tall-crowned officer's cap, as worn by a ruling junta; tilts with the head. */
function juntaCap(s:Source):SceneNode[] {
  // path() projects M/L/Q only, so the badge ring is a polygon rather than arcs.
  const head={origin:s.headPivot},at=(d:string)=>path(d,head);
  const ring=(x:number,y:number,r:number)=>`M${Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*r,y+Math.sin(i*Math.PI/12)*r].join(" ")).join("L")}Z`;
  return [
    // Tall saddle crown: the front rises well above the head, the back drops.
    node("cap-crown",leather(at("M275 58Q256 -40 296 -122Q470 -118 640 -44Q694 6 652 94Z"),"#3c4630")),
    node("cap-crown-shade",{path:at("M298 50Q288 -40 314 -106Q318 -24 334 52Z"),fill:"#56633f"}),
    node("cap-band",leather(at("M275 56L652 92L654 158L270 114Z"),"#1d1a16")),
    node("cap-cord",leather(at("M278 70L650 104L650 116L276 84Z"),GOLD,.8)),
    node("cap-visor",leather(at("M272 104Q214 108 160 142Q226 162 290 128Z"),"#121010")),
    node("cap-visor-leaves",{path:at("M186 138Q204 128 218 134Q234 122 250 128Q264 118 280 120"),fill:"none",stroke:GOLD,strokeWidth:1.4}),
    node("cap-badge",leather(at(`${ring(330,-24,26)} M290 -6Q310 22 330 10Q350 22 370 -6Q350 8 330 0Q310 8 290 -6Z`),GOLD,1)),
    node("cap-badge-star",{path:at("M330 -40L335 -30L346 -29L338 -22L340 -11L330 -17L320 -11L322 -22L314 -29L325 -30Z"),fill:"#a8281f"}),
  ];
}
/** ลุงป้อม: an oversized gold watch on the pointing wrist, with sparkles. */
function luxuryWatch(lower:number):SceneNode[] {
  const x=lower-9,k=1.5,sparkle=(cx:number,cy:number,r:number)=>`M${cx} ${cy-r}L${cx+r*.25} ${cy-r*.25}L${cx+r} ${cy}L${cx+r*.25} ${cy+r*.25}L${cx} ${cy+r}L${cx-r*.25} ${cy+r*.25}L${cx-r} ${cy}L${cx-r*.25} ${cy-r*.25}Z`;
  return [
    node("watch-strap",leather(`M${-5.5*k} ${-13*k}L${5.5*k} ${-13*k}L${5.5*k} ${13*k}L${-5.5*k} ${13*k}Z`,GOLD),x),
    node("watch-links",{path:[-8,-4,4,8].map(y=>`M${-5.5*k} ${y*k}H${5.5*k}`).join(""),fill:"none",stroke:GOLD_DARK,strokeWidth:.8},x),
    node("watch-bezel",leather(circle(0,0,10.5*k),GOLD,1.3),x),
    node("watch-diamonds",{path:Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return circle(Math.cos(a)*8.9*k,Math.sin(a)*8.9*k,1.1*k);}).join(" "),fill:"#fffdf3"},x),
    node("watch-face",leather(circle(0,0,7.2*k),"#f6efd8",.7),x),
    node("watch-hands",{path:`M0 0L0 ${-5.4*k}M0 0L${3.8*k} ${1.6*k}`,fill:"none",stroke:LEATHER,strokeWidth:1.3},x),
    node("watch-sparkles",{path:`${sparkle(13*k,-14*k,4.5*k)} ${sparkle(-12*k,-13*k,3*k)} ${sparkle(15*k,11*k,2.6*k)}`,fill:"#fff6c8",stroke:GOLD,strokeWidth:.6},x),
  ];
}
/** ลุงหนู: a long, ringed rat's tail, tapered and curling, behind the body. */
function ratTail():SceneNode[] {
  const bez=(p:XY[],t:number):XY=>{const u=1-t;return [0,1].map(k=>u*u*u*p[0][k]+3*u*u*t*p[1][k]+3*u*t*t*p[2][k]+t*t*t*p[3][k]) as unknown as XY;};
  const spine:XY[]=[];
  const segments:XY[][]=[[[668,995],[800,1015],[860,1185],[960,1215]],[[960,1215],[1062,1245],[1092,1178],[1046,1148]]];
  segments.forEach((seg,i)=>{for(let k=i?1:0;k<=24;k++)spine.push(bez(seg,k/24));});
  const width=(i:number)=>20-17*i/(spine.length-1);
  const side=(i:number,sign:number):XY=>{const a=spine[Math.max(0,i-1)],b=spine[Math.min(spine.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [spine[i][0]-dy/l*width(i)*sign,spine[i][1]+dx/l*width(i)*sign];};
  const left=spine.map((_,i)=>side(i,1)),right=spine.map((_,i)=>side(i,-1)).reverse();
  const outline=`M${[...left,...right].map(p=>p.join(" ")).join("L")}Z`;
  const rings=spine.filter((_,i)=>i>3&&i%4===0).map((_,k)=>{const i=4+k*4;const [a,b]=[side(i,.85),side(i,-.85)];return `M${a.join(" ")}L${b.join(" ")}`;}).join(" ");
  return [
    node("tail",leather(path(outline),"#d79a8c",1.4)),
    node("tail-rings",{path:path(rings),fill:"none",stroke:"#9c5f55",strokeWidth:.8}),
  ];
}
/** ลุงแม้ว: lettering across the black jacket — the joke is the colour. */
function redShirtLettering():SceneNode[] {
  const [x,y]=point(566,652);
  return [node("shirt-lettering",{path:"",text:{lines:["เสื้อนี้สีแดง"],size:14,fill:"#e0262c",stroke:"#fff1d2",strokeWidth:1.2}},x,y)];
}

const source=(id:PuppetId)=>CUTS[id] as unknown as Source;
function withGimmicks(id:PuppetId):Art {
  const s=source(id),art=puppet(s);
  if(id==="prayut")art.head.details=juntaCap(s);
  if(id==="prawit")art.arms.right.art!.lowerDetails=luxuryWatch(art.arms.right.lower);
  if(id==="anutin")art.underlay=ratTail();
  if(id==="thaksin")art.decorations=redShirtLettering();
  return art;
}
export const USER_PUPPETS={prayut:withGimmicks("prayut"),thaksin:withGimmicks("thaksin"),prawit:withGimmicks("prawit"),anutin:withGimmicks("anutin"),thanathorn:withGimmicks("thanathorn")};
