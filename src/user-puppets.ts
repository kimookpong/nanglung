import type { CharacterDefinition, Graphic, XY } from "./characters";
import CUTS from "./puppet-cuts.json";
import SPRITES from "./puppet-sprites.json";

// The user's PNGs are the actual artwork. scripts/cut-puppet-sprites.py cuts them
// along src/puppet-cuts.json into outlined sprites; one affine projection per
// piece keeps every sprite aligned to the original image across the joints.
type Art=Pick<CharacterDefinition,"body"|"cloth"|"legs"|"head"|"arms"|"footY"|"viewBox"|"decorations">;
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

const source=(id:PuppetId)=>CUTS[id] as unknown as Source;
export const USER_PUPPETS={prayut:puppet(source("prayut")),thaksin:puppet(source("thaksin")),prawit:puppet(source("prawit")),anutin:puppet(source("anutin")),thanathorn:puppet(source("thanathorn"))};
