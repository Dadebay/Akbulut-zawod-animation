import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {BOARD_DRYER} from './industrial/processPlan.js';
import {PROCESS_PHYSICS as P,calcineGypsum,createBoardBatch,advanceBoard,boardMass,boardReady,createDrive,createProcessPhysics,HYDRATION_WATER_RATIO} from './industrial/processPhysics.js';
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('calcination conserves mass and requires both heat and temperature',()=>{
  const full=calcineGypsum(100,45000,160);
  near(full.rawKg+full.stuccoKg+full.vapourKg,100);
  assert.ok(full.stuccoKg>84&&full.stuccoKg<85);
  near(full.usedKJ,45000);
  for(const [energy,temperature] of [[0,160],[45000,25]]){
    const cold=calcineGypsum(100,energy,temperature);near(cold.rawKg,100);near(cold.stuccoKg,0);near(cold.vapourKg,0);
  }
  const limited=calcineGypsum(100,22500,160);near(limited.rawKg,50);near(limited.usedKJ,22500);
  near(calcineGypsum(0,45000,160).stuccoKg,0);
});

test('rehydration consumes available water, releases heat and preserves total mass',()=>{
  for(const waterKg of [0,1,11.7]){
    const b=createBoardBatch({stuccoKg:18,waterKg}),initial=boardMass(b);
    advanceBoard(b,600,{setting:true});
    near(boardMass(b),initial);near(b.boundWaterKg,b.reactedKg*HYDRATION_WATER_RATIO);
    assert.ok(b.freeWaterKg>=-1e-9&&b.reactedKg<=18+1e-8);
    if(waterKg)assert.ok(b.temperatureC>25);
    else near(b.reactedKg,0);
    if(waterKg===1)assert.ok(b.reactedKg<18);
  }
});

test('dryer needs set material and heat; it never removes chemically bound water',()=>{
  const b=createBoardBatch(),input=b.sourceGypsumKg+b.waterKg;
  advanceBoard(b,1200,{drying:true,airC:160});near(b.evaporatedKg,0);
  advanceBoard(b,P.settingSeconds,{setting:true});
  const bound=b.boundWaterKg,free=b.freeWaterKg;
  advanceBoard(b,600,{drying:true,airC:25});near(b.freeWaterKg,free);
  advanceBoard(b,5000,{drying:true,airC:160});
  assert.ok(boardReady(b));near(b.boundWaterKg,bound);
  near(boardMass(b)+b.evaporatedKg+b.calcinationVapourKg,input);
  assert.ok(b.temperatureC<=95.000001&&b.freeWaterKg>=0);
  assert.ok(b.heatInputKJ>=b.evaporatedKg*P.evaporationKJPerKg);
});

test('motor ramp is frame-rate independent, bounded and phase continuous on restart',()=>{
  const results=[30,60,120].map(fps=>{
    const drive=createDrive(.6);
    for(let i=0;i<2*fps;i++){drive.update(1/fps,1);assert.ok(drive.speed<=1);}
    for(let i=0;i<2*fps;i++)drive.update(1/fps,0);
    near(drive.speed,0);const phase=drive.position;
    drive.update(0,1);near(drive.position,phase);
    drive.update(.1,1);assert.ok(drive.position>phase&&drive.speed<1);
    return drive.position;
  });
  near(results[0],results[1]);near(results[1],results[2]);
});

test('loss of process heat inhibits feed and temperatures change continuously',()=>{
  const model=createProcessPhysics(),healthy=()=>true;
  assert.ok(model.feedReady(healthy));
  model.update(1,()=>false);assert.ok(model.state.calcinerC>25&&model.state.calcinerC<160);
  assert.equal(model.feedReady(()=>false),false);
  model.update(90,()=>false);assert.ok(model.state.calcinerC<140);
  assert.equal(model.feedReady(healthy),false);
  const paused={...model.state};model.update(0,healthy);assert.deepEqual(model.state,paused);
  model.update(60,healthy);assert.ok(model.feedReady(healthy));
});

test('scene holds wet boards inside dryer, resumes after heat, pauses without moving products',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const kit=createKit(new T.Scene(),{tablet:true});
  try{
    const scene=buildProduction(kit),active=new Map(['CR','TY','BS','GR','GK','GP'].map(zone=>[zone,{status:'running'}]));
    const options={preview:true,active,showInterior:true};
    let held;
    for(let i=0;i<400;i++){
      scene.physics.state.dryerAirC=25;scene.updateMotion(.1,options);
      if(scene.physics.state.waitingForDryer){held=scene.products.find(p=>p.kind==='panel'&&p.object.visible&&Math.abs(p.object.position.x+8-BOARD_DRYER.exitX)<.001);if(held)break;}
    }
    assert.ok(held,'wet product reaches the dryer photoeye');assert.equal(boardReady(held.batch),false);
    const stop=held.object.position.clone();
    for(let i=0;i<20;i++){scene.physics.state.dryerAirC=25;scene.updateMotion(.1,options);}
    near(held.object.position.distanceTo(stop),0);assert.equal(Boolean(held.palletizing),false);
    scene.physics.state.dryerAirC=160;
    for(let i=0;i<200;i++)scene.updateMotion(.1,options);
    assert.ok(boardReady(held.batch));assert.ok(held.object.position.distanceTo(stop)>.1);
    const positions=scene.products.map(p=>p.object.position.clone()),batches=scene.products.map(p=>p.batch?{...p.batch}:null),angles=scene.rotors.map(r=>r.object.rotation[r.axis]);
    scene.updateMotion(0,options);
    scene.products.forEach((p,i)=>{near(p.object.position.distanceTo(positions[i]),0);assert.deepEqual(p.batch||null,batches[i]);});
    scene.rotors.forEach((r,i)=>near(r.object.rotation[r.axis],angles[i]));
    active.get('GK').status='offline';
    const onBelt=scene.products.filter(p=>p.motion&&!p.palletizing&&p.zone==='GK');
    const parked=onBelt.map(p=>p.object.position.clone());
    scene.updateMotion(.5,options);onBelt.forEach((p,i)=>near(p.object.position.distanceTo(parked[i]),0));
    // No independently drifting gear clock: equal tooth travel, opposite sign.
    const drum=scene.rotors.find(r=>r.zone==='BS'&&r.speed>0),pinion=scene.rotors.find(r=>r.zone==='BS'&&Math.abs(r.speed+drum.speed*80/18)<1e-8);
    assert.ok(drum&&pinion);near(drum.object.rotation.x*80+pinion.object.rotation.x*18,0);
  }finally{kit.dispose();globalThis.document=previous;}
});
