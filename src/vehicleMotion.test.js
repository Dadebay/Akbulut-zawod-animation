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
  assert.equal(arrival.travel,returnStart.travel);
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
