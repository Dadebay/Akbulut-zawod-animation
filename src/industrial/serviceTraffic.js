import {createParkedCarBuilder} from './parkedCars.js';
import {createWorkerBuilder} from './workers.js';
import {roundedRoute,routeProfile} from './motionPath.js';
import {VISITOR_PARK as PARK} from './siteLayout.js';

export function buildServiceTraffic(k){
  // A single service car stays inside the open visitor apron, clear of parked
  // cars, lamp bases, pedestrian routes and the factory's freight movements.
  const car=createParkedCarBuilder(k)(-108,PARK.north+15,0,5,true),rig=car.carRig;
  const route=roundedRoute(PARK.west+18,PARK.east-27,PARK.north+15,PARK.south-20,7.5);
  const profile=routeProfile(route,{speed:3.0,acceleration:.9,lateral:1.1,wheels:rig.wheels});
  const driver=createWorkerBuilder(k)({parent:car,position:[0,-.28,.35],yaw:Math.PI/2,seated:true,hardHat:false,seed:1});driver.g.scale.setScalar(.85);
  const wheelbase=2.78,rearAxle=-1.42,period=profile.duration+5;
  function update(time){
    const elapsed=time%period,m=profile.at(Math.min(elapsed,profile.duration)),p=route.getPointAt(m.u),t=route.getTangentAt(m.u);
    const yaw=-Math.atan2(t.z,t.x);
    car.position.set(p.x-rearAxle*Math.cos(yaw),.01,p.z+rearAxle*Math.sin(yaw));car.rotation.y=yaw;
    rig.steering.forEach(pivot=>{pivot.rotation.y=Math.atan2(wheelbase*m.curvature,1+pivot.position.z*m.curvature);});
    rig.wheels.forEach(({wheel},i)=>wheel.rotation.z=-(m.wheelTravel[i]+Math.floor(time/period)*profile.wheelTravel[i])/.31);
    rig.brakeLights.visible=elapsed>=profile.duration||profile.at(Math.min(profile.duration,elapsed+.15)).speed<m.speed-.005;
    driver.update(time,{steer:Math.atan(wheelbase*m.curvature)});
  }
  update(0);return {g:car,update};
}
