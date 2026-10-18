import * as T from 'three';
import {clamp01,JOURNEY_STAGE as S} from '../journey.js';
import {FORKLIFT_JOBS,loadingCounts,sampleForklift} from './forkliftMotion.js';
import {DISPATCH_ROUTE,dispatchPose} from './trafficLayout.js';
import {INCOMING_HAUL as incoming,RETURN_HAUL as emptyReturn,RAW_STOP} from './siteLayout.js';
import {QUARRY} from './quarryLayout.js';

const angleAt=(path,p)=>{const d=path.getTangentAt(clamp01(p));return -Math.atan2(d.z,d.x);};
const mixAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*clamp01(t);
function place(record,path,progress){const p=clamp01(progress);record.g.position.copy(path.getPointAt(p));record.g.rotation.y=angleAt(path,p);}

export function createJourneyMotion(logistics,vehicleSurface){
  const {hauler,dispatchTruck,train,trainCargo,railWheels,truckFork,railForkA,railForkB,stock,loadingStock}=logistics;
  const forks=[truckFork,railForkA,railForkB];
  // Use the three actual axles and both wheel tracks, including the middle
  // rear axle. Sampling only the centreline missed the bank under one side.
  const contacts=hauler.ws.map(w=>({x:w.position.x,z:w.position.z,height:0}));
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
    // The display stock occupies the same belt used by moving packing pallets.
    loadingStock?.forEach(pallet=>{pallet.visible=index!==S.pack;});
    if(index===0){hauler.g.position.set(QUARRY.x,QUARRY.y,QUARRY.z);hauler.g.rotation.y=0;}
    else if(index===1){place(hauler,incoming,progress);hauler.g.rotation.y=mixAngle(0,hauler.g.rotation.y,progress*10);}
    else if(index===2){hauler.g.position.set(...RAW_STOP);hauler.g.rotation.y=Math.PI;}
    else if(index===3)place(hauler,emptyReturn,progress);
    else{hauler.g.position.set(QUARRY.x,QUARRY.y,QUARRY.z);hauler.g.rotation.y=0;}
    groundHauler();
    hauler.cargo.visible=j.rawLoad>.001;hauler.cargo.scale.y=Math.max(.02,j.rawLoad);
    hauler.bed.rotation.z=index===2?(progress<.2?progress/.2*.72:progress<.75?.72:(1-progress)/.25*.72):0;
    hauler.tailgate.rotation.z=-hauler.bed.rotation.z-Math.min(.2,hauler.bed.rotation.z*.5);
    hauler.updateHoist?.();
    hauler.ws.forEach(w=>w.rotation.z=index===1||index===3?-j.elapsed*2:0);
    dispatchTruck.cargo.forEach((p,i)=>p.visible=i<j.truckLoads);
    const railLoads=index===S.load?loadingCounts(j.elapsed).rail:index>S.load?[4,4]:[0,0];
    trainCargo.forEach((p,i)=>p.visible=i%4<railLoads[Math.floor(i/4)]);
    updateForks(j);
    train.position.x=index===S.dispatch?-470*Math.pow(j.depart,1.5):0;
    train.visible=index!==S.dispatch||j.depart<.98;
    railWheels.forEach(w=>w.rotation.z=-train.position.x/.4);
    if(index===S.dispatch){const pose=dispatchPose(j.depart);dispatchTruck.g.position.set(pose.x,0,pose.z);dispatchTruck.g.rotation.y=pose.yaw;dispatchTruck.hinge.rotation.y=pose.trailerYaw-pose.yaw;dispatchTruck.ws.forEach(w=>w.rotation.z=-j.depart*DISPATCH_ROUTE.getLength()/.48);}
    else{dispatchTruck.g.position.set(64,0,-43);dispatchTruck.g.rotation.y=Math.PI;dispatchTruck.hinge.rotation.y=0;}
    dispatchTruck.g.visible=index!==S.dispatch||j.depart<.98;
  };
}
