import test from 'node:test';
import assert from 'node:assert/strict';
import {HAUL_PROFILE,RETURN_PROFILE,haulPose} from './industrial/haulMotion.js';
import {DISPATCH_PROFILE,dispatchMotion} from './industrial/trafficLayout.js';
import {steeringAngle} from './industrial/motionPath.js';

test('freight vehicles accelerate, brake and respect the campus speed limit',()=>{
  for(const profile of [HAUL_PROFILE,RETURN_PROFILE,DISPATCH_PROFILE]){
    assert.equal(profile.at(0).speed,0);assert.ok(profile.at(profile.duration).speed<1e-7);
    let previous=profile.at(0);
    for(let t=.1;t<profile.duration;t+=.1){
      const m=profile.at(t);
      assert.ok(Math.abs(m.speed-previous.speed)<=.066,'acceleration stays below 0.66 m/s²');
      assert.ok(m.distance>=previous.distance);previous=m;
    }
  }
  for(let t=0;t<=1;t+=.001){const p=dispatchMotion(t);assert.ok(p.speed<=15/3.6+1e-8);}
});
test('hauler distance drives wheel roll continuously across travel and stops',()=>{
  const arrival=haulPose(false,HAUL_PROFILE.duration),returnStart=haulPose(true,0);
  assert.ok(arrival.position.distanceTo(returnStart.position)<1e-8);
  assert.ok(Math.abs(arrival.travel-returnStart.travel)<1e-8);
  const parked=haulPose(true,RETURN_PROFILE.duration),later=haulPose(true,RETURN_PROFILE.duration+20);
  assert.equal(parked.travel/.562,later.travel/.562);assert.equal(later.speed,0);
});
test('front steering follows bends in both directions and stays below 35 degrees',()=>{
  let turns=0;
  for(let i=0;i<=1000;i++){
    const {curvature}=DISPATCH_PROFILE.at(i/1000*DISPATCH_PROFILE.duration),angle=steeringAngle(3.4,curvature);
    assert.ok(Math.abs(angle)<=35*Math.PI/180+1e-10);
    if(Math.abs(curvature)>.01){assert.equal(Math.sign(angle),Math.sign(curvature));turns++;}
  }
  assert.ok(turns>10);assert.equal(steeringAngle(3.4,0),0);
});

test('default truck loading requests only the tablet cab; HQ requests the full model',async t=>{
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {createTruckBuilder}=await import('./industrial/trucks.js');
  const requests=[];t.mock.method(GLTFLoader.prototype,'load',url=>requests.push(url));
  for(const tablet of [true,false])createTruckBuilder({tablet,m:{},material:()=>({})},()=>{}).load();
  assert.deepEqual(requests,['/models/man-tractor-cab-tablet.glb','/models/man-tractor-cab.glb']);
});

test('equipment cutaway opens and restores truck and loading canopy roofs after batching',async ()=>{
  const T=await import('three'),{createKit}=await import('./industrial/kit.js');
  const {createTruckBuilder}=await import('./industrial/trucks.js');
  const {buildOldCampus}=await import('./industrial/oldCampus.js');
  const {poolSurfaces,batchAssemblies}=await import('./industrial/surfaceBatching.js');
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createLinearGradient:()=>({addColorStop(){}})
  },{get:(o,p)=>o[p]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const builder=createTruckBuilder(k,(parent,pos)=>{
      const g=k.group(pos,parent);k.box(1.3,1,1.1,[0,.5,0],k.m.paper,g);return g;
    });
    const trucks=[builder.build([0,0,0]),builder.build([0,0,10],0,true)];
    builder.mountCab(k.group([0,0,20]));
    const campus=buildOldCampus(k,new Proxy({},{get:()=>()=>{}}));
    const canopy=scene.getObjectByName('old-loading-canopy-roof');
    assert.ok(campus.shells.includes(canopy),'canopy follows the hall cutaway');
    assert.ok(campus.shells.includes(scene.getObjectByName('old-loading-front-screen')),'front wall reveals the parked truck');
    poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
    const visibleInstances=()=>{let n=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)n+=o.getVisibleAt(i)?1:0;});return n;};
    refresh();const closed=visibleInstances();
    for(const roof of [canopy,...trucks.map(t=>t.roof)])assert.ok(roof.userData.dynamic,'roof visibility survives optimization');
    builder.setInteriorVisible(true);canopy.visible=false;refresh();
    assert.ok(visibleInstances()<closed,'roof surfaces actually disappear from rendered batches');
    for(const truck of trucks){
      assert.equal(truck.roof.visible,false);assert.equal(truck.trailer.visible,true);
      assert.equal(truck.cabMount.visible,true);assert.ok(truck.cargo.every(p=>p.visible),'cargo remains visible');
    }
    builder.setInteriorVisible(false);canopy.visible=true;refresh();
    assert.equal(visibleInstances(),closed,'closing restores every roof surface');
  }finally{k.dispose();globalThis.document=previous;}
});
