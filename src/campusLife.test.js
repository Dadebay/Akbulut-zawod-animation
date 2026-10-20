import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {SHIFT_WALKS,OLD_HALL_WALKS,oldForkMotion,operatorWork,operatorGesture} from './industrial/campusLife.js';
import {pedestrianMotion} from './industrial/pedestrianMotion.js';
import {dispatchPose,truckFootprint,PARKED_TRUCKS} from './industrial/trafficLayout.js';
import {FORKLIFT_JOBS,sampleForklift,forkliftFootprint} from './industrial/forkliftMotion.js';
import {ARRIVAL_PROFILE,ARRIVAL_CAR_OFFSETS,arrivalTrainPose,SECOND_TRACK_Z} from './industrial/arrivalTrain.js';
import {QUARRY_SCOOPS,QUARRY_LOADING_SECONDS,quarryCycle} from './quarryCycle.js';
import {treeWindDisplacement} from './industrial/treeWind.js';
const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
function overlap(a,b){
  for(const p of [a,b])for(let i=0;i<p.length;i++){
    const n=[p[i][1]-p[(i+1)%p.length][1],p[(i+1)%p.length][0]-p[i][0]],aa=a.map(v=>v[0]*n[0]+v[1]*n[1]),bb=b.map(v=>v[0]*n[0]+v[1]*n[1]);
    if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
  }return true;
}
test('shift groups and old-hall workers remain outside swept vehicle lanes',()=>{
  const truckSweep=Array.from({length:501},(_,i)=>truckFootprint(dispatchPose(i/500),.35)).flat();
  const parked=PARKED_TRUCKS.map(({position:[x,,z],angle})=>rect(-6.2,0,17.6,2.7).map(([a,b])=>[x+a*Math.cos(angle)+b*Math.sin(angle),z-a*Math.sin(angle)+b*Math.cos(angle)]));
  const oldFork=oldForkMotion(),forkSweep=Array.from({length:1601},(_,i)=>forkliftFootprint(oldFork(i*.15),.3));
  for(const walk of [...SHIFT_WALKS,...OLD_HALL_WALKS]){
    const sample=pedestrianMotion(walk);
    for(let t=0;t<150;t+=.3){
      const p=sample(t).position,body=rect(p.x,p.z,.7,.7);
      for(const vehicle of [...truckSweep,...parked])assert.equal(overlap(body,vehicle),false,`freight/pedestrian ${p.toArray()}`);
      if(OLD_HALL_WALKS.includes(walk))for(const vehicle of forkSweep)assert.equal(overlap(body,vehicle),false,'old hall forklift aisle');
    }
  }
});
test('operators inspect nearby panels with different walking and hand cycles',()=>{
  const work=operatorWork([10,0,10],3),sample=pedestrianMotion(work.walk),positions=new Set(),hands=[];
  for(let t=0;t<60;t+=.2){const gait=sample(t);positions.add(gait.position.x.toFixed(1));hands.push(operatorGesture(t,3,gait,work.panel).hand);assert.ok(Math.abs(gait.position.x-10)<=.91);}
  assert.ok(positions.size>10);assert.ok(Math.min(...hands)<-.5);assert.ok(Math.max(...hands)>-.01);
});
test('operator walking areas keep body clearance from the actual machinery and conveyor meshes',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    buildMaterialFlow(kit,{pallet:(parent,position)=>kit.group(position,parent)});
    scene.updateMatrixWorld(true);
    const obstacles=[];
    scene.traverse(mesh=>{
      if(!mesh.isMesh||mesh.material.depthTest===false)return;
      mesh.geometry.computeBoundingBox();
      const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      if(bounds.max.y>.3&&bounds.min.y<2.1)obstacles.push({mesh,bounds});
    });
    const triangle=new T.Triangle();
    for(const [seed,operator] of production.operators.entries()){
      const position=[operator.pos[0]+8,operator.pos[1],operator.pos[2]-25];
      const work=operatorWork(position,seed,operator.walkAxis);
      const [west,east,north,south,,y]=work.walk.bounds;
      // The whole walking rectangle plus shoulders, arm swing and a margin;
      // this covers turns and pauses without relying on a few sampled frames.
      const body=new T.Box3(new T.Vector3(west-.45,y+.3,north-.45),new T.Vector3(east+.45,y+1.85,south+.45));
      for(const {mesh,bounds} of obstacles){
        if(!bounds.intersectsBox(body))continue;
        const {position:vertices}=mesh.geometry.attributes,index=mesh.geometry.index,count=index?index.count:vertices.count;
        for(let i=0;i<count;i+=3){
          [triangle.a,triangle.b,triangle.c].forEach((v,j)=>v.fromBufferAttribute(vertices,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
          assert.equal(body.intersectsTriangle(triangle),false,`operator ${seed} (${operator.zone}) at ${position} intersects ${mesh.geometry.type}`);
        }
      }
    }
  }finally{kit.dispose();globalThis.document=previous;}
});
test('all forklifts stay below ten km/h and tilt their carried load back',()=>{
  for(const job of FORKLIFT_JOBS)for(let t=0;t<job.duration;t+=.1){const p=sampleForklift(job,t);assert.ok(Math.abs(p.speed)<=10/3.6);if(p.carrying&&Math.abs(p.speed)>.2)assert.ok(p.tilt>=0,'rearward tilt');}
});
test('incoming raw-material train brakes on the second track without overlapping its wagons',()=>{
  for(let t=0;t<ARRIVAL_PROFILE.duration+10;t+=.2){
    const poses=ARRIVAL_CAR_OFFSETS.map(offset=>arrivalTrainPose(t,offset));
    assert.ok(poses[0].speed<=3.001);
    for(let i=1;i<poses.length;i++)assert.ok(poses[i].position.distanceTo(poses[i-1].position)>14.5*.72); // 28% shorter cars
  }
  const stopped=arrivalTrainPose(ARRIVAL_PROFILE.duration+5);assert.equal(stopped.speed,0);assert.equal(stopped.position.z,SECOND_TRACK_Z);assert.equal(stopped.switch,0);
});
test('quarry fills in four 18-second scoops and wind remains bounded at tree tips',()=>{
  assert.equal(QUARRY_SCOOPS,4);assert.equal(QUARRY_LOADING_SECONDS,72);
  for(let i=0;i<=4;i++)assert.equal(quarryCycle(i/4).rawLoad,i/4);
  for(let t=0;t<30;t+=.1){assert.ok(Math.abs(treeWindDisplacement(0,1,t))<1e-12);assert.ok(Math.abs(treeWindDisplacement(7.5,1,t))<=.1);}
});

test('shift companions keep their spacing through turns and waiting periods',()=>{
  const walkers=SHIFT_WALKS.map(pedestrianMotion);
  for(let t=0;t<160;t+=.1){const poses=walkers.map(w=>w(t).position);for(let i=1;i<poses.length;i++)assert.ok(poses[i].distanceTo(poses[i-1])>.69);}
});
