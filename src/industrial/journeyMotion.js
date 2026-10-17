import {clamp01,JOURNEY_STAGE as S} from '../journey.js';
import {FORKLIFT_JOBS,loadingCounts,sampleForklift} from './forkliftMotion.js';
import {DISPATCH_ROUTE,dispatchPose} from './trafficLayout.js';
import {INCOMING_HAUL as incoming,RETURN_HAUL as emptyReturn,RAW_STOP} from './siteLayout.js';

const angleAt=(path,p)=>{const d=path.getTangentAt(clamp01(p));return -Math.atan2(d.z,d.x);};
const mixAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*clamp01(t);
function place(record,path,progress){const p=clamp01(progress);record.g.position.copy(path.getPointAt(p));record.g.rotation.y=angleAt(path,p);}

export function createJourneyMotion(logistics,vehicleSurface){
  const {hauler,dispatchTruck,train,trainCargo,railWheels,truckFork,railForkA,railForkB,stock}=logistics;
  const forks=[truckFork,railForkA,railForkB];
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
    if(index===0){hauler.g.position.set(226,5,39);hauler.g.rotation.y=0;}
    else if(index===1){place(hauler,incoming,progress);hauler.g.rotation.y=mixAngle(0,hauler.g.rotation.y,progress*10);}
    else if(index===2){hauler.g.position.set(...RAW_STOP);hauler.g.rotation.y=Math.PI;}
    else if(index===3)place(hauler,emptyReturn,progress);
    else{hauler.g.position.set(226,5,39);hauler.g.rotation.y=0;}
    hauler.g.rotation.z=0;
    if(vehicleSurface){
      const {x,z}=hauler.g.position,yaw=hauler.g.rotation.y,front=1.4275,rear=-4.55;
      const groundAt=offset=>vehicleSurface(x+Math.cos(yaw)*offset,z-Math.sin(yaw)*offset);
      const frontHeight=groundAt(front),rearHeight=groundAt(rear),pitch=Math.atan2(frontHeight-rearHeight,front-rear);
      hauler.g.rotation.z=pitch;hauler.g.position.y=frontHeight-front*Math.sin(pitch)+.025;
    }
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
