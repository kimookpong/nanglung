import { describe, expect, it } from "vitest";
import { addMember, initialCast, memberForHand, parseCast, placement, removeMember, selectMember, MAX_CAST } from "./cast";
import { defaultSettings, PuppetController, restPose } from "./core";
import { actorPoint, stagePoint } from "./stage-geometry";

describe("persistent stage cast",()=>{
  it("migrates the saved pair without changing hand profiles or anatomical ownership",()=>{
    const settings=defaultSettings();settings.characters.Left="thanathorn";settings.profiles.Left.calibrated=true;
    const cast=parseCast(null,settings);
    expect(memberForHand(cast,"Left")?.character).toBe("thanathorn");
    expect(memberForHand(cast,"Right")?.character).toBe("theng");
    expect(settings.profiles.Left.calibrated).toBe(true);
    expect(cast.members.map(m=>m.pose.facing)).toEqual([1,-1]);
  });
  it("adds independent copies and changes only the chosen hand while old poses stay frozen",()=>{
    const cast=initialCast(defaultSettings()),old=memberForHand(cast,"Right")!;
    old.pose.mouth=.8;old.pose.facing=-1;
    const added=addMember(cast,"theng","Left","copy")!;
    expect(selectMember(cast,added.id,"Right")).toBe("Right");
    expect(memberForHand(cast,"Right")).toBe(added);
    expect(cast.controls.Left).toBe("initial-Left");
    expect(old.pose.mouth).toBe(.8);expect(old.pose.facing).toBe(-1);
    added.pose.mouth=.2;expect(old.pose.mouth).toBe(.8);
  });
  it("focuses an already controlled actor rather than assigning both hands to it",()=>{
    const cast=initialCast(defaultSettings());
    expect(selectMember(cast,cast.controls.Left!,"Right")).toBe("Left");
    expect(cast.controls).toEqual({Left:"initial-Left",Right:"initial-Right"});
  });
  it("keeps the same physical hand when a single-hand performer clicks the other bank",()=>{
    const cast=initialCast(defaultSettings());
    expect(selectMember(cast,"initial-Left","Right",false)).toBe("Right");
    expect(cast.controls).toEqual({Left:null,Right:"initial-Left"});
    expect(cast.members).toHaveLength(2);
  });
  it("repairs deleted control bindings and retains one final actor",()=>{
    const cast=initialCast(defaultSettings());addMember(cast,"anutin","Right","extra");
    expect(removeMember(cast,"initial-Right")).toBe(true);
    expect(cast.controls.Right).toBe("extra");
    removeMember(cast,"initial-Left");
    expect(cast.controls.Left).toBeNull();expect(cast.controls.Right).toBe("extra");
    expect(removeMember(cast,"extra")).toBe(false);
  });
  it("preserves cast poses and bindings on reload, rejecting malformed IDs and values",()=>{
    const settings=defaultSettings(),cast=initialCast(settings);
    addMember(cast,"thaksin","Left","maew-copy");selectMember(cast,"maew-copy","Right");
    cast.members[2].pose.head=.4;
    expect(parseCast(JSON.parse(JSON.stringify(cast)),settings)).toEqual(cast);
    const invalid=parseCast({version:1,members:[...cast.members,{id:'bad"<script>',character:"theng"},{id:"initial-Left",character:"theng"}],controls:{Left:"maew-copy",Right:"maew-copy"}},settings);
    expect(invalid.members).toHaveLength(3);expect(invalid.controls.Right).toBeNull();
    const dirty=parseCast({version:1,members:[{id:"safe",character:"anutin",side:"Right",pose:{x:NaN,mouth:Infinity,head:500,facing:2}}]},settings);
    expect(dirty.members[0].pose).toEqual({...restPose(),head:.55,facing:-1});
  });
  it("limits memory growth and lays both banks out within the scene",()=>{
    const cast=initialCast(defaultSettings());
    for(let i=0;i<30;i++)addMember(cast,"prawit",i%2?"Left":"Right",`copy-${i}`);
    expect(cast.members).toHaveLength(MAX_CAST);
    for(const m of cast.members){const p=placement(cast,m);expect(p.x).toBeGreaterThanOrEqual(.12);expect(p.x).toBeLessThanOrEqual(.88);expect(p.scale).toBe(1.02);expect(p.baseline).toBeLessThan(720);}
    expect(new Set(cast.members.filter(m=>m.side==="Left").map(m=>placement(cast,m).x)).size).toBe(6);
  });
});
describe("picking coordinates",()=>{
  it("accounts for contain letterboxing and rejects the black bars",()=>{
    const rect={left:100,top:50,width:800,height:600};
    expect(stagePoint(500,350,rect)).toEqual({x:640,y:360});
    expect(stagePoint(500,60,rect)).toBeNull();
    expect(stagePoint(99,350,rect)).toBeNull();
  });
  it("inverts rotation, scale and facing at the same puppet-local point",()=>{
    for(const facing of [-1,1] as const)for(const angle of [-.4,0,.5]){
      const t={x:500,y:400,scale:1.46,facing,angle},px=25,py=-100;
      const dx=px*t.scale*facing,dy=py*t.scale;
      const p=actorPoint(t.x+dx*Math.cos(angle)-dy*Math.sin(angle),t.y+dx*Math.sin(angle)+dy*Math.cos(angle),t);
      expect(p.x).toBeCloseTo(px+350);expect(p.y).toBeCloseTo(py+400);
    }
  });
});
describe("control transfer",()=>{
  it("rebases the first hand sample without teleporting or accepting a held pinky",()=>{
    const controller=new PuppetController(),settings=defaultSettings();
    const pose={...restPose(),x:.25,y:.65,facing:-1 as const,mouth:.8};
    controller.adoptPose(pose,1000);
    for(let time=1010;time<1500;time+=20)controller.ingest({x:.9,y:.1,angle:0,fingers:[0,0,0,0,1]},time,time,settings,true);
    expect(controller.target.x).toBeCloseTo(.25);expect(controller.target.y).toBeCloseTo(.65);
    expect(controller.target.facing).toBe(-1);expect(controller.pose).toEqual(pose);
    expect(controller.target.mouth).toBeLessThan(.1);
  });
});
