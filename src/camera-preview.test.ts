import { describe, expect, it } from "vitest";
import { cameraPreviewBox } from "./camera-preview";

describe("camera picture-in-picture",()=>{
  for(const [width,height] of [[1280,720],[1000,800],[500,280],[280,160],[280,70],[120,40]])
    it(`fits inside the painted screen at ${width}x${height}`,()=>{
      const box=cameraPreviewBox(width,height),scale=Math.min(width/1280,height/720);
      const screenLeft=(width-1280*scale)/2,screenTop=(height-720*scale)/2;
      const left=width-box.right-box.width,top=height-box.bottom-box.height;
      expect(box.width).toBeLessThanOrEqual(196);
      expect(box.width/box.height).toBeCloseTo(4/3);
      expect(left).toBeGreaterThanOrEqual(screenLeft);
      expect(top).toBeGreaterThanOrEqual(screenTop);
      expect(width-box.right).toBeLessThanOrEqual(width-screenLeft);
      expect(height-box.bottom).toBeLessThanOrEqual(height-screenTop);
    });
  it("stays below the content's letterbox inset rather than the whole container edge",()=>{
    expect(cameraPreviewBox(1280,960)).toMatchObject({right:10,bottom:130});
    expect(cameraPreviewBox(0,0)).toEqual({width:0,height:0,right:0,bottom:0});
  });
});
