/** Keep picture-in-picture inside the painted 16:9 screen, including letterboxing. */
export function cameraPreviewBox(width: number, height: number) {
  const scale=Math.min(Math.max(0,width)/1280,Math.max(0,height)/720);
  const screenWidth=1280*scale,screenHeight=720*scale,gap=Math.min(10,screenHeight/10);
  const previewWidth=Math.max(0,Math.min(196,Math.max(84,screenWidth*.2),screenWidth-2*gap,(screenHeight-2*gap)*4/3));
  return {width:previewWidth,height:previewWidth*.75,right:(width-screenWidth)/2+gap,bottom:(height-screenHeight)/2+gap};
}
