import * as T from 'three';
import {JOURNEY_STAGE as S,JOURNEY_STEPS} from '../journey.js';
import {FORKLIFT_JOBS,loadingCounts,sampleForklift} from './forkliftMotion.js';
import {dispatchMotion} from './trafficLayout.js';
import {RAW_STOP,loadingDeckHeight} from './siteLayout.js';
import {QUARRY} from './quarryLayout.js';
import {steeringAngle} from './motionPath.js';
import {HAUL_PROFILE,haulPose} from './haulMotion.js';
import {TRUCK_SCALE} from './trucks.js';
import {RAIL_LAYOUT} from './railLayout.js';

// Ride the truck over the loading deck and its ramps, pitched along the slope.
function placeOnDeck(g,x,z,yaw){
  const ahead=3*TRUCK_SCALE,behind=8*TRUCK_SCALE,c=Math.cos(yaw),s=Math.sin(yaw);
  const front=loadingDeckHeight(x+ahead*c,z-ahead*s),rear=loadingDeckHeight(x-behind*c,z+behind*s);
  g.position.y=loadingDeckHeight(x,z);g.rotation.z=Math.atan2(front-rear,ahead+behind);
}
export function createJourneyMotion(logistics,vehicleSurface){
  const {hauler,dispatchTruck,train,trainCargo,railWheels,truckFork,railForkA,railForkB,stock}=logistics;
  const forks=[truckFork,railForkA,railForkB];
  // Use the three actual axles and both wheel tracks, including the middle
  // rear axle. Sampling only the centreline missed the bank under one side.
  const contacts=hauler.ws.map(w=>({x:w.userData.contact?.x??w.position.x,z:w.userData.contact?.z??w.position.z,height:0}));
  const meanX=contacts.reduce((sum,p)=>sum+p.x,0)/(contacts.length||1);
  const alongMoment=contacts.reduce((sum,p)=>sum+(p.x-meanX)**2,0);
  const acrossMoment=contacts.reduce((sum,p)=>sum+p.z*p.z,0);
  const contactPoint=new T.Vector3();
  const grounded={x:NaN,z:NaN,yaw:NaN,height:0,rotation:new T.Quaternion()};
  function groundHauler(){
    const {x,z}=hauler.g.position,yaw=hauler.g.rotation.y,c=Math.cos(yaw),s=Math.sin(yaw);
    // The terrain is fixed. A parked truck needs the same contact solution
    // during loading and every later production step, including timeline seeks.
    if(x===grounded.x&&z===grounded.z&&yaw===grounded.yaw){
      hauler.g.position.y=grounded.height;hauler.g.quaternion.copy(grounded.rotation);return;
    }
    hauler.g.rotation.set(0,yaw,0,'YZX');
    if(!vehicleSurface||!contacts.length)return;
    let along=0,across=0;
    for(const point of contacts){
      point.height=vehicleSurface(x+c*point.x+s*point.z,z-s*point.x+c*point.z);
      along+=(point.x-meanX)*point.height;across+=point.z*point.height;
    }
    const pitch=Math.atan(along/alongMoment),roll=-Math.atan(across/acrossMoment*Math.cos(pitch));
    hauler.g.rotation.set(roll,yaw,pitch,'YZX');
    let height=-Infinity;
    function supportAt(along,up,across){
      contactPoint.set(along,up,across).applyQuaternion(hauler.g.quaternion);
      height=Math.max(height,vehicleSurface(x+contactPoint.x,z+contactPoint.z)-contactPoint.y);
    }
    // Re-sample after tilting: the contact patches have moved horizontally.
    // Both tyre edges must remain above the visible road/terrain surface.
    for(const point of contacts)for(const edge of [-.17,.17])supportAt(point.x,0,point.z+edge);
    // Protect the bumper and chassis overhang between axles on curved crests.
    for(const along of [-5.9,-2,2.6])for(const across of [-1.3,0,1.3])supportAt(along,.38,across);
    hauler.g.position.y=height+.025;
    grounded.x=x;grounded.z=z;grounded.yaw=yaw;grounded.height=hauler.g.position.y;
    grounded.rotation.copy(hauler.g.quaternion);
  }
  function updateForks(j){
    forks.forEach((fork,i)=>{
      const job=FORKLIFT_JOBS[i],elapsed=j.index===S.load?j.elapsed:j.index>S.load?job.duration:-1;
      const pose=sampleForklift(job,elapsed);fork.update(pose,j.time);
      const supply=stock[i];
      supply.g.visible=(j.index===S.pack&&j.progress>.95)||(j.index===S.load&&pose.stockVisible);
      supply.panel.visible=pose.kind==='panel';supply.bags.visible=pose.kind==='bags';
    });
  }
  return function update(j){
    const {index,progress}=j;
    const hauling=index===S.haul?haulPose(false,j.elapsed):index>=S.scoop?haulPose(true,j.time-JOURNEY_STEPS[S.scoop].start):null;
    if(hauling){hauler.g.position.copy(hauling.position);hauler.g.rotation.y=hauling.yaw;}
    else if(index===S.receive){hauler.g.position.set(...RAW_STOP);hauler.g.rotation.y=Math.PI;}
    else{hauler.g.position.set(QUARRY.x,QUARRY.y,QUARRY.z);hauler.g.rotation.y=0;}
    groundHauler();
    hauler.steering?.forEach(p=>{p.rotation.y=steeringAngle(5.28,hauling?.curvature||0);});
    hauler.cargo.visible=j.rawLoad>.001;hauler.cargo.scale.y=Math.max(.02,j.rawLoad);hauler.updateCargo?.(j.rawLoad,index===S.receive);
    hauler.bed.rotation.z=index===2?(progress<.2?progress/.2*.72:progress<.75?.72:(1-progress)/.25*.72):0;
    hauler.tailgate.rotation.z=-hauler.bed.rotation.z-Math.min(.2,hauler.bed.rotation.z*.5);
    hauler.updateHoist?.();
    const haulTravel=hauling?.travel??(index===S.receive?HAUL_PROFILE.length:0);
    hauler.ws.forEach(w=>{w.rotation.z=-haulTravel/(w.userData.radius||.562);});
    dispatchTruck.cargo.forEach((p,i)=>p.visible=i<j.truckLoads);
    const railLoads=index===S.load?loadingCounts(j.elapsed).rail:index>S.load?[4,4]:[0,0];
    trainCargo.forEach((p,i)=>p.visible=i%4<railLoads[Math.floor(i/4)]);
    updateForks(j);
    logistics.updateArrival?.(j.time);
    const trainRun=index===S.dispatch?-470*Math.pow(j.depart,1.5):0;
    train.position.x=RAIL_LAYOUT.offsetX+trainRun;
    train.visible=true;
    railWheels.forEach(w=>w.rotation.z=-trainRun/.4);
    if(index===S.dispatch){const pose=dispatchMotion(j.depart);dispatchTruck.updateLights?.(pose,j.time);dispatchTruck.g.position.set(pose.x,0,pose.z);dispatchTruck.g.rotation.y=pose.yaw;placeOnDeck(dispatchTruck.g,pose.x,pose.z,pose.yaw);dispatchTruck.hinge.rotation.y=pose.trailerYaw-pose.yaw;dispatchTruck.ws.forEach(w=>{w.rotation.z=-pose.distance/((w.userData.radius||.51)*TRUCK_SCALE);});dispatchTruck.steering?.forEach(p=>{p.rotation.y=steeringAngle(3.4*TRUCK_SCALE,pose.curvature);});}
    else{dispatchTruck.updateLights?.(null,j.time);dispatchTruck.g.position.set(64,0,-43);dispatchTruck.g.rotation.y=Math.PI;placeOnDeck(dispatchTruck.g,64,-43,Math.PI);dispatchTruck.hinge.rotation.y=0;dispatchTruck.steering?.forEach(p=>{p.rotation.y=0;});}
    dispatchTruck.g.visible=true;
  };
}
