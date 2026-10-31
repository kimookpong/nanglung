export interface StageTransform { x:number; y:number; scale:number; facing:1|-1; angle:number }
/** Canvas uses contain: reject clicks in letterboxing rather than shifting targets. */
export function stagePoint(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number}) {
  const scale=Math.min(rect.width/1280,rect.height/720);
  if(scale<=0)return null;
  const x=(clientX-rect.left-(rect.width-1280*scale)/2)/scale;
  const y=(clientY-rect.top-(rect.height-720*scale)/2)/scale;
  return x>=0&&x<=1280&&y>=0&&y<=720?{x,y}:null;
}
export function actorPoint(x:number,y:number,t:StageTransform) {
  const dx=x-t.x,dy=y-t.y,cos=Math.cos(t.angle),sin=Math.sin(t.angle);
  return {x:(dx*cos+dy*sin)/(t.scale*t.facing)+350,y:(-dx*sin+dy*cos)/t.scale+400};
}
