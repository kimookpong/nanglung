import { describe, expect, it } from "vitest";
import { addMember, initialCast, memberForHand, moveMember, parseCast, placement, positionMember, selectMember } from "./cast";
import { defaultSettings } from "./core";
import { stageAnchor } from "./stage-geometry";

describe("drag placement and side-bound control",()=>{
  it("drops across the center, transfers the correct hand and persists the new position",()=>{
    const settings=defaultSettings(),cast=initialCast(settings),actor=cast.members[0];
    actor.pose.mouth=.7;actor.pose.x=.7;
    expect(positionMember(cast,actor.id,900,610)).toBe("Right");
    expect(cast.controls).toEqual({Left:null,Right:actor.id});
    expect(actor.pose).toMatchObject({x:.5,y:.53,mouth:.7,facing:-1});
    expect(stageAnchor(actor.pose,placement(cast,actor))).toEqual({x:900,baseline:610});
    expect(parseCast(JSON.parse(JSON.stringify(cast)),settings)).toEqual(cast);
  });
  it("keeps a manually placed actor still as other actors are added",()=>{
    const cast=initialCast(defaultSettings()),actor=cast.members[0];
    positionMember(cast,actor.id,300,650);
    for(let i=0;i<5;i++)addMember(cast,"thaksin","Left",`extra-${i}`);
    expect(stageAnchor(actor.pose,placement(cast,actor))).toEqual({x:300,baseline:650});
    expect(placement(cast,actor).scale).toBe(1.02);
  });
  it("keeps hand motion inside the assigned half even at extreme inputs",()=>{
    const cast=initialCast(defaultSettings()),[left,right]=cast.members;
    positionMember(cast,left.id,635,650);positionMember(cast,right.id,645,650);
    left.pose.x=.88;right.pose.x=.12;
    expect(stageAnchor(left.pose,placement(cast,left)).x).toBeLessThan(640);
    expect(stageAnchor(right.pose,placement(cast,right)).x).toBeGreaterThan(640);
  });
  it("repairs old cross-side bindings and rejects invalid ownership at runtime",()=>{
    const settings=defaultSettings(),cast=initialCast(settings);
    cast.controls={Left:"initial-Right",Right:"initial-Left"};
    expect(memberForHand(cast,"Left")).toBeUndefined();
    expect(memberForHand(cast,"Right")).toBeUndefined();
    expect(parseCast(cast,settings).controls).toEqual({Left:"initial-Left",Right:"initial-Right"});
    expect(selectMember(cast,"initial-Right","Left")).toBe("Right");
    expect(cast.controls.Left).toBeNull();
    const crowded=initialCast(settings);crowded.members[0].side="Right";
    expect(parseCast(crowded,settings).controls).toEqual({Left:null,Right:"initial-Right"});
  });
  it("moves saved positions and ownership together through the side checkbox",()=>{
    const cast=initialCast(defaultSettings()),actor=cast.members[0];
    positionMember(cast,actor.id,320,600);
    moveMember(cast,actor.id,"Right");
    expect(actor.position).toEqual({x:.75,baseline:600});
    expect(memberForHand(cast,"Left")).toBeUndefined();
    expect(memberForHand(cast,"Right")).toBe(actor);
  });
});
