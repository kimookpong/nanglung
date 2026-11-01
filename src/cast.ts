import { isCharacterId, type CharacterId } from "./characters";
import { clamp, restPose, type HandSide, type Pose, type Settings } from "./core";

export const MAX_CAST = 12;
export interface CastMember { id: string; character: CharacterId; side: HandSide; pose: Pose }
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
  const members:CastMember[]=[],ids=new Set<string>();
  for(const raw of input.members.slice(0,MAX_CAST)) {
    if(!raw||typeof raw.id!=="string"||!/^[-\w]{1,80}$/.test(raw.id)||ids.has(raw.id)||!isCharacterId(raw.character))continue;
    const side=raw.side==="Right"?"Right":"Left";
    members.push({id:raw.id,character:raw.character,side,pose:safePose(raw.pose,side)});ids.add(raw.id);
  }
  if(!members.length)return input.members.length===0?{version:1,members:[],controls:{Left:null,Right:null}}:initialCast(settings);
  const valid=(id:unknown)=>typeof id==="string"&&ids.has(id)?id:null;
  const Left=valid(input.controls?.Left),Right=valid(input.controls?.Right);
  const controls={Left,Right:Right===Left?null:Right};
  if(!controls.Left&&!controls.Right&&!(input.controls?.Left===null&&input.controls?.Right===null))controls[settings.hand]=members[0].id;
  return {version:1,members,controls};
}
export function memberForHand(cast:CastState,side:HandSide) { return cast.members.find(m=>m.id===cast.controls[side]); }
/** Stage side is independent of the physical hand that controls this actor. */
export function moveMember(cast:CastState,id:string,side:HandSide):boolean {
  const member=cast.members.find(member=>member.id===id);
  if(!member||member.side===side)return false;
  member.side=side;
  member.pose.facing=side==="Left"?1:-1;
  return true;
}
/** Clicking an actor already driven by the other hand focuses that hand. */
export function selectMember(cast:CastState,id:string,hand:HandSide,dual=true):HandSide {
  if(!cast.members.some(m=>m.id===id))return hand;
  const other=hand==="Left"?"Right":"Left";
  if(cast.controls[other]===id) {
    if(dual)return other;
    cast.controls[other]=null;
  }
  cast.controls[hand]=id;
  return hand;
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
    cast.controls[hand]=cast.members.find(m=>m.id!==cast.controls[other])?.id??null;
  }
  return true;
}
export function placement(cast:CastState,member:CastMember) {
  const group=cast.members.filter(m=>m.side===member.side),index=group.indexOf(member),count=group.length;
  const inner=member.side==="Left"?.40:.60,span=Math.min(.24,.12*(count-1));
  const outer=inner+(member.side==="Left"?-span:span);
  const x=count===1?(member.side==="Left"?.32:.68):outer+(inner-outer)*index/(count-1);
  // Keep the reference actor's size; additional cast members share a compact bank.
  return {x,baseline:680,scale:1.02,lean:(member.side==="Left"?1:-1)*(count>1?(index===0?.04:-.015):.015)};
}
