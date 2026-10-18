import {roundedRoute,routeProfile,smooth,angleDifference} from './motionPath.js';
import {POND} from './siteLayout.js';

// Paths stay on existing paving, outside the loading aisle and truck route.
export const WALK_ROUTES=[
  {bounds:[-72.4,-67.1,-25.65,-24.35,.60,.08],speed:.90,pause:3,offset:0},
  {bounds:[POND.x-POND.width/2-1.7,POND.x-POND.width/2-1.1,POND.z-POND.depth/2+6,POND.z+POND.depth/2-7,.29,-.085],speed:.85,pause:5,offset:14},
  {bounds:[-54,-42,-41.5,-40.7,.38,-.05],speed:.95,pause:4,offset:8},
  {bounds:[-23,-10,-131,-129.6,.65,0],speed:.90,pause:3.5,offset:6},
];

export function pedestrianMotion(config){
  const route=roundedRoute(...config.bounds),profile=routeProfile(route,{speed:config.speed,acceleration:.55,lateral:.45});
  const length=profile.length,stride=length/Math.max(1,Math.round(length/1.12));
  const period=profile.duration+config.pause;
  function footAt(distance,side){
    const u=((distance%length)+length)%length/length,p=route.getPointAt(u),t=route.getTangentAt(u),yaw=Math.atan2(t.x,t.z);
    return {x:p.x+Math.cos(yaw)*side*.105,z:p.z-Math.sin(yaw)*side*.105,yaw};
  }
  return function sample(time){
    const local=(time+config.offset)%period,m=profile.at(Math.min(local,profile.duration));
    const point=route.getPointAt(m.u),tangent=route.getTangentAt(m.u),yaw=Math.atan2(tangent.x,tangent.z);
    const phase=m.distance/stride,feet=[-1,1].map((side,i)=>{
      const offset=i*.5,step=Math.floor(phase+offset),progress=phase+offset-step;
      const contact=(step-offset+.29)*stride,start=footAt(contact,side),end=footAt(contact+stride,side);
      const swing=Math.max(0,(progress-.58)/.42),blend=smooth(swing);
      const x=start.x+(end.x-start.x)*blend-point.x,z=start.z+(end.z-start.z)*blend-point.z;
      return {x:Math.cos(yaw)*x-Math.sin(yaw)*z,z:Math.sin(yaw)*x+Math.cos(yaw)*z,
        lift:.105*Math.sin(Math.PI*swing),yaw:angleDifference(yaw,start.yaw+angleDifference(start.yaw,end.yaw)*blend)};
    });
    return {position:point,yaw,speed:m.speed,phase:phase*Math.PI*2,feet};
  };
}
