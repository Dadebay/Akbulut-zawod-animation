import {createParkedCarBuilder} from './parkedCars.js';
import {createWorkerBuilder} from './workers.js';
import {roundedRoute,routeProfile} from './motionPath.js';
import {VISITOR_PARK as PARK} from './siteLayout.js';

export const SERVICE_ROUTE_BOUNDS=[PARK.west+7,PARK.east-18,PARK.north+15,PARK.south-20,7.5];
export function serviceMotion(wheels=[]){
  const route=roundedRoute(...SERVICE_ROUTE_BOUNDS),profile=routeProfile(route,{speed:3,acceleration:.9,lateral:1.1,wheels}),period=profile.duration+5;
  return {route,profile,period,sample(time){
    const elapsed=time%period,m=profile.at(Math.min(elapsed,profile.duration)),p=route.getPointAt(m.u),t=route.getTangentAt(m.u),yaw=-Math.atan2(t.z,t.x);
    return {...m,elapsed,yaw,x:p.x+1.42*Math.cos(yaw),z:p.z-1.42*Math.sin(yaw)};
  }};
}

export function buildServiceTraffic(k){
  // A single service car stays inside the open visitor apron, clear of parked
  // cars, lamp bases, pedestrian routes and the factory's freight movements.
  const car=createParkedCarBuilder(k)(PARK.west+16,PARK.north+15,0,5,true),rig=car.carRig;
  const motion=serviceMotion(rig.wheels),{profile,period}=motion;
  const driver=createWorkerBuilder(k)({parent:car,position:[0,-.28,.35],yaw:Math.PI/2,seated:true,hardHat:false,seed:1});driver.g.scale.setScalar(.85);
  const wheelbase=2.78;
  function update(time){
    const m=motion.sample(time),{elapsed,yaw}=m;
    car.position.set(m.x,.01,m.z);car.rotation.y=yaw;
    rig.steering.forEach(pivot=>{pivot.rotation.y=Math.atan2(wheelbase*m.curvature,1+pivot.position.z*m.curvature);});
    rig.wheels.forEach(({wheel},i)=>wheel.rotation.z=-(m.wheelTravel[i]+Math.floor(time/period)*profile.wheelTravel[i])/.31);
    rig.brakeLights.visible=elapsed>=profile.duration||profile.at(Math.min(profile.duration,elapsed+.15)).speed<m.speed-.005;
    driver.update(time,{steer:Math.atan(wheelbase*m.curvature)});
  }
  update(0);return {g:car,update};
}
