import { isCharacterId, type CharacterId } from "./characters";
import { clamp, restPose, type HandSide, type Pose, type Settings } from "./core";
import { constrainStageAnchor } from "./stage-geometry";

export const MAX_CAST = 12;
// Recognize retired records only to remove them from saved stages during migration.
const retiredCharacters = new Set(["nunui", "sikaew", "yodthong", "khwanmuang"]);
export function hasRetiredCastMembers(value: unknown): boolean {
  const members=(value as Partial<CastState>|null)?.members;
  return Array.isArray(members)&&members.some(raw=>raw&&retiredCharacters.has(raw.character));
}
export interface CastMember { id: string; character: CharacterId; side: HandSide; pose: Pose; position?: { x: number; baseline: number } }
export interface CastState { version: 1; members: CastMember[]; controls: Record<HandSide, string | null> }
export function initialCast(settings: Settings): CastState {
  return {version:1,members:(["Left","Right"] as const).map(side=>({
    id:`initial-${side}`,character:settings.characters[side],side,
    pose:{...restPose(),facing:side==="Left"?1:-1},
  })),controls:{Left:"initial-Left",Right:"initial-Right"}};
}
function safePose(value: unknown, side: HandSide): Pose {
  const p=(value && typeof value==="object" ? value : {}) as Partial<Pose>;
  const num=(v:unknown,d:number,min:number,max:number)=>typeof v==="number"&&Number.isFinite(v)?clamp(v,min,max):d;
  return {x:num(p.x,.5,.12,.88),y:num(p.y,.53,.33,.73),tilt:num(p.tilt,0,-.6,.6),
    mouth:num(p.mouth,0,0,1),head:num(p.head,0,0,.55),rightArm:num(p.rightArm,.16,0,1),leftArm:num(p.leftArm,.12,0,1),
    facing:p.facing===1||p.facing===-1?p.facing:side==="Left"?1:-1};
}
export function parseCast(value: unknown, settings: Settings): CastState {
  if (!value || typeof value!=="object") return initialCast(settings);
  const input=value as Partial<CastState>;
  if(input.version!==1||!Array.isArray(input.members))return initialCast(settings);
  const hasRetiredMembers=hasRetiredCastMembers(input);
  const members:CastMember[]=[],ids=new Set<string>();
  for(const raw of input.members.slice(0,MAX_CAST)) {
    if(!raw||typeof raw.id!=="string"||!/^[-\w]{1,80}$/.test(raw.id)||ids.has(raw.id)||!isCharacterId(raw.character))continue;
    const side=raw.side==="Right"?"Right":"Left";
    const member:CastMember={id:raw.id,character:raw.character,side,pose:safePose(raw.pose,side)};
    if(raw.position&&Number.isFinite(raw.position.x)&&Number.isFinite(raw.position.baseline)) {
      const anchor=constrainStageAnchor(raw.position.x*1280,raw.position.baseline,side);
      member.position={x:anchor.x/1280,baseline:anchor.baseline};
    }
    members.push(member);ids.add(raw.id);
  }
  if(!members.length)return input.members.length===0||hasRetiredMembers?{version:1,members:[],controls:{Left:null,Right:null}}:initialCast(settings);
  const valid=(id:unknown,side:HandSide)=>members.find(m=>m.id===id&&m.side===side)?.id??null;
  const controls={Left:valid(input.controls?.Left,"Left")??valid(input.controls?.Right,"Left"),Right:valid(input.controls?.Right,"Right")??valid(input.controls?.Left,"Right")};
  if(!controls.Left&&!controls.Right&&!hasRetiredMembers&&!(input.controls?.Left===null&&input.controls?.Right===null))controls[members[0].side]=members[0].id;
  return {version:1,members,controls};
}
export function memberForHand(cast:CastState,side:HandSide) { return cast.members.find(m=>m.id===cast.controls[side]&&m.side===side); }
/** Moving a selected actor transfers its binding to the hand on the new side. */
export function moveMember(cast:CastState,id:string,side:HandSide):boolean {
  const member=cast.members.find(member=>member.id===id);
  if(!member||member.side===side)return false;
  member.side=side;
  member.pose.facing=side==="Left"?1:-1;
  if(member.position) member.position.x=1-member.position.x;
  const controlled=cast.controls.Left===id||cast.controls.Right===id;
  for(const hand of ["Left","Right"] as const)if(cast.controls[hand]===id)cast.controls[hand]=null;
  if(controlled)cast.controls[side]=id;
  return true;
}
/** Actor side determines physical hand in both one-hand and two-hand modes. */
export function selectMember(cast:CastState,id:string,fallbackHand:HandSide):HandSide {
  const member=cast.members.find(m=>m.id===id);
  if(!member)return fallbackHand;
  const other=member.side==="Left"?"Right":"Left";
  if(cast.controls[other]===id)cast.controls[other]=null;
  cast.controls[member.side]=id;
  return member.side;
}
/** Persist a drop in stage coordinates, rebasing hand offsets without changing the rig. */
export function positionMember(cast:CastState,id:string,x:number,baseline:number):HandSide|null {
  const member=cast.members.find(m=>m.id===id);
  if(!member||!Number.isFinite(x)||!Number.isFinite(baseline))return null;
  if(!member.position)member.pose.tilt=clamp(member.pose.tilt+placement(cast,member).lean,-.6,.6);
  const side=x<640?"Left":"Right";
  moveMember(cast,id,side);
  const anchor=constrainStageAnchor(x,baseline,side);
  member.position={x:anchor.x/1280,baseline:anchor.baseline};
  member.pose.x=.5;member.pose.y=.53;
  return side;
}
export function addMember(cast:CastState,character:CharacterId,side:HandSide,id:string):CastMember|null {
  if(cast.members.length>=MAX_CAST||cast.members.some(m=>m.id===id))return null;
  const member:CastMember={id,character,side,pose:{...restPose(),facing:side==="Left"?1:-1}};
  cast.members.push(member);return member;
}
export function removeMember(cast:CastState,id:string):boolean {
  if(cast.members.length<=1||!cast.members.some(m=>m.id===id))return false;
  cast.members=cast.members.filter(m=>m.id!==id);
  for(const hand of ["Left","Right"] as const)if(cast.controls[hand]===id) {
    const other=hand==="Left"?"Right":"Left";
    cast.controls[hand]=cast.members.find(m=>m.side===hand&&m.id!==cast.controls[other])?.id??null;
  }
  return true;
}
export function placement(cast:CastState,member:CastMember) {
  const group=cast.members.filter(m=>m.side===member.side),index=group.indexOf(member),count=group.length;
  const inner=member.side==="Left"?.40:.60,span=Math.min(.24,.12*(count-1));
  const outer=inner+(member.side==="Left"?-span:span);
  const x=count===1?(member.side==="Left"?.32:.68):outer+(inner-outer)*index/(count-1);
  // Keep the reference actor's size; additional cast members share a compact bank.
  return {x:member.position?.x??x,baseline:member.position?.baseline??680,scale:1.02,lean:member.position?0:(member.side==="Left"?1:-1)*(count>1?(index===0?.04:-.015):.015),side:member.side};
}
