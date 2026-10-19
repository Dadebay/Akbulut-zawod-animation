// Shared loading origin for the quarry, its terrain apron, vehicles and tour views.
export const QUARRY={x:316,y:13,z:-81};
export const quarryPoint=(x=0,y=0,z=0)=>[QUARRY.x+x,QUARRY.y+y,QUARRY.z+z];
export const QUARRY_LOAD_POINT=quarryPoint(-2.5,2.35,0);
export const EXCAVATOR_LAYOUT={position:quarryPoint(1,0,7),yaw:2.6,body:[-2.6,2.6,-1.75,1.75]};
// Solve the arm against a fixed body position, never translate the tracks into the truck.
export function excavatorLoadingPose(){
  const [x,y,z]=EXCAVATOR_LAYOUT.position,[tx,ty,tz]=QUARRY_LOAD_POINT;
  const dx=tx-x,dz=tz-z,r=Math.hypot(dx,dz),bucket=.13;
  const heading=Math.atan2(-dz,dx)+Math.asin(.43/r);
  const reach=Math.sqrt(r*r-.43*.43)-.95,height=ty-y-2.15;
  const bx=2.25+1.3*Math.cos(bucket)+.85*Math.sin(bucket);
  const by=-2.5+1.3*Math.sin(bucket)-.85*Math.cos(bucket);
  const a=Math.hypot(2.8,3.55),b=Math.hypot(bx,by),d=Math.hypot(reach,height),aim=Math.atan2(height,reach);
  const first=aim+Math.acos((a*a+d*d-b*b)/(2*a*d));
  const second=aim-Math.acos((b*b+d*d-a*a)/(2*b*d));
  const boom=first-Math.atan2(3.55,2.8);
  return {slew:heading-EXCAVATOR_LAYOUT.yaw,boom,stick:second-boom-Math.atan2(by,bx),bucket};
}
