import {roundedRoute,routeProfile,angleDifference} from './motionPath.js';

// Separate side-by-side paths keep the group apart even during their shared stop.
export const SHIFT_WALKS=[-.7,0,.7].map(lane=>({bounds:[-95,-68,-25.4+lane,-24.6+lane,.35,.09],speed:1.05,pause:8,offset:0}));
export const OLD_HALL_WALKS=[
  [-2,5,-113,-111],[14,22,-113,-111],[33,42,-113,-111],
  [4,12,-93.5,-91.5],[25,33,-93.5,-91.5]
].map((bounds,i)=>({bounds:[...bounds,.8,.03],speed:.75,pause:5+i,offset:i*3}));
export const OLD_FORK_BOUNDS=[12,49,-102,-98,2];
export function oldForkMotion(){
  const route=roundedRoute(...OLD_FORK_BOUNDS),profile=routeProfile(route,{speed:1.4,acceleration:.5,lateral:.45}),period=profile.duration+8;
  return time=>{
    const m=profile.at(Math.min(time%period,profile.duration)),p=route.getPointAt(m.u),t=route.getTangentAt(m.u),distance=m.distance+Math.floor(time/period)*profile.length;
    return {x:p.x,z:p.z,yaw:-Math.atan2(t.z,t.x),height:.18,tilt:0,carrying:false,kind:'panel',curvature:m.curvature,steer:Math.atan(1.6*m.curvature),wheelTravel:[distance,distance,distance,distance],reverse:false,lookBack:0,speed:m.speed};
  };
}
export function operatorWork(position,seed,axis='x'){
  const [x,y,z]=position;
  const dx=axis==='z'?.4:.9,dz=axis==='z'?.9:.4;
  return {walk:{bounds:[x-dx,x+dx,z-dz,z+dz,.35,y],speed:.55,pause:9+seed%4,offset:seed*2.3},panel:axis==='z'?[x+.8,z+(seed%2?.9:-.9)]:[x+(seed%2?.9:-.9),z-.8],seed};
}
export function operatorGesture(time,seed,gait,panel){
  const idle=1-Math.min(1,gait.speed/.15),phase=time*.8+seed*1.9;
  const look=angleDifference(gait.yaw,Math.atan2(panel[0]-gait.position.x,panel[1]-gait.position.z));
  return {look:Math.max(-.75,Math.min(.75,look))*idle,hand:-.65*idle*(.5+.5*Math.sin(phase))};
}
