import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY_STEPS,JOURNEY_DURATION,JOURNEY_STAGE as S,journeyAt,journeyFade,journeyOpacity} from './journey.js';
test('tour reset is fully covered and fades continuously on both sides',()=>{
  assert.equal(journeyFade(0),1);assert.equal(journeyFade(JOURNEY_DURATION),1);
  assert.equal(journeyFade(2),0);assert.equal(journeyFade(JOURNEY_DURATION-2),0);
  for(let t=0;t<1.4;t+=.01)assert.ok(Math.abs(journeyFade(t)-journeyFade(JOURNEY_DURATION-t))<1e-8);
});
test('manual, paused, blocked and single-step views stay visible at the tour boundary',()=>{
  for(const time of [0,.01,.7,1.4,JOURNEY_DURATION-1.4,JOURNEY_DURATION-.01,JOURNEY_DURATION]){
    assert.equal(journeyOpacity(time,{playing:true}),1,'manual view');
    assert.equal(journeyOpacity(time,{following:true,playing:false}),1,'paused or blocked tour');
    assert.equal(journeyOpacity(time,{following:true,playing:true,loopStep:0}),1,'single step');
    assert.equal(journeyOpacity(time,{following:true,playing:true}),1-journeyFade(time),'guided tour');
  }
});
import {FORKLIFT_JOBS,FORKLIFT_LAYOUT as F} from './industrial/forkliftMotion.js';

test('the batch reaches processing and dispatch in order, then wraps to an empty loading cycle',()=>{
  for(const [i,s] of JOURNEY_STEPS.entries()){assert.equal(journeyAt(s.start).index,i);assert.equal(journeyAt(s.start+s.duration-.01).index,i);}
  assert.equal(journeyAt(JOURNEY_DURATION).index,0);
  assert.equal(journeyAt(JOURNEY_DURATION).rawLoad,0);
  assert.equal(journeyAt(JOURNEY_DURATION).truckLoads,0);
  assert.equal(journeyAt(JOURNEY_DURATION).trainLoads,0);
});
test('the truck unloads to stock and only the loader fills the indoor hopper',()=>{
  assert.equal(journeyAt(JOURNEY_STEPS[1].start).rawLoad,1);
  const unloaded=journeyAt(JOURNEY_STEPS[S.receive].start+10);assert.equal(unloaded.rawLoad,0);assert.equal(unloaded.hopperFill,0);
  for(const id of ['scoop','carry'])assert.equal(journeyAt(JOURNEY_STEPS[S[id]].start+1).hopperFill,0);
  const tipped=journeyAt(JOURNEY_STEPS[S.tip].start+11);assert.equal(tipped.hopperFill,1);
  const feed=JOURNEY_STEPS[S.infeed];assert.equal(journeyAt(feed.start).hopperFill,1);assert.ok(journeyAt(feed.start+feed.duration-.01).hopperFill<.001);
});
test('freight only appears when a forklift deposits it and vehicles depart after all loads',()=>{
  const loading=JOURNEY_STEPS[S.load].start;
  const firstTruck=FORKLIFT_JOBS[0].trips[0].depositAt;
  const firstRail=FORKLIFT_JOBS[1].trips[0].depositAt;
  assert.equal(journeyAt(loading).truckLoads,0);
  assert.equal(journeyAt(loading+firstTruck-.01).truckLoads,0);
  assert.equal(journeyAt(loading+firstTruck+.01).truckLoads,1);
  assert.equal(journeyAt(loading+firstRail-.01).trainLoads,0);
  assert.equal(journeyAt(loading+firstRail+.01).trainLoads,1);
  for(let t=0;t<JOURNEY_STEPS[S.dispatch].start;t+=.25)assert.equal(journeyAt(t).depart,0);
  const departing=journeyAt(JOURNEY_STEPS[S.dispatch].start+1);assert.equal(departing.truckLoads,6);assert.equal(departing.trainLoads,8);assert.ok(departing.depart>0);
});

// Check the physical handoff after changing vehicle geometry, not just counters.
import * as T from 'three';
import {createJourneyMotion} from './industrial/journeyMotion.js';
import {TRUCK_LAYOUT,TRUCK_SCALE} from './industrial/trucks.js';
import {RAIL_LAYOUT} from './industrial/rail.js';
test('forklift loads meet the truck and rail decks without a vertical or lateral jump',()=>{
  const fork=()=>{
    const g=new T.Group(),mast=new T.Group(),lift=new T.Group(),cargo=new T.Group(),bagCargo=new T.Group();
    mast.position.set(F.mastX,F.mastBaseY,0);g.add(mast);mast.add(lift);lift.add(cargo,bagCargo);
    cargo.position.set(F.cargoX-F.mastX,F.palletOffsetY,0);bagCargo.position.copy(cargo.position);
    return {g,fork:lift,cargo,bagCargo,ws:[],update(pose){
      g.position.set(pose.x,pose.y||0,pose.z);g.rotation.y=pose.yaw;
      lift.position.y=pose.height-F.mastBaseY;mast.rotation.z=pose.tilt;
      cargo.visible=pose.carrying&&pose.kind!=='bags';bagCargo.visible=pose.carrying&&pose.kind==='bags';
    }};
  };
  const truckFork=fork(),railForkA=fork(),railForkB=fork();
  const dispatchTruck={g:new T.Group(),hinge:new T.Group(),ws:[],cargo:Array.from({length:6},()=>new T.Group())};
  const logistics={truckFork,railForkA,railForkB,dispatchTruck,hauler:{g:new T.Group(),cargo:new T.Group(),bed:new T.Group(),tailgate:new T.Group(),ws:[]},train:new T.Group(),trainCargo:Array.from({length:8},()=>new T.Group()),railWheels:[],stock:Array.from({length:3},()=>({g:new T.Group(),panel:new T.Group(),bags:new T.Group()})),greenStock:Array.from({length:8},()=>new T.Group())};
  const move=createJourneyMotion(logistics),start=JOURNEY_STEPS[S.load].start;
  move(journeyAt(start+FORKLIFT_JOBS[0].trips[0].depositAt-.001));
  const truckPoint=truckFork.cargo.getWorldPosition(new T.Vector3());
  const truckDeck=new T.Vector3(64-TRUCK_SCALE*(TRUCK_LAYOUT.kingpinX+TRUCK_LAYOUT.trailerOffsetX+TRUCK_LAYOUT.cargoXs[0]),TRUCK_SCALE*TRUCK_LAYOUT.deckHeight,-43-TRUCK_SCALE*TRUCK_LAYOUT.cargoZ);
  assert.ok(truckPoint.distanceTo(truckDeck)<.01);assert.equal(truckFork.cargo.visible,true);
  move(journeyAt(start+FORKLIFT_JOBS[1].trips[0].depositAt-.001));
  const railPoint=railForkA.cargo.getWorldPosition(new T.Vector3());
  const railDeck=new T.Vector3(RAIL_LAYOUT.offsetX+(RAIL_LAYOUT.wagonCentres[0]+RAIL_LAYOUT.cargoXs[0])*RAIL_LAYOUT.scale,RAIL_LAYOUT.deckHeight*RAIL_LAYOUT.scale,RAIL_LAYOUT.z+RAIL_LAYOUT.cargoZ);
  assert.ok(railPoint.distanceTo(railDeck)<.01);assert.equal(railForkA.cargo.visible,true);
  for(const [i,job] of FORKLIFT_JOBS.entries())for(const trip of job.trips){
    const activeFork=[truckFork,railForkA,railForkB][i];
    const cargo=trip.target.kind==='bags'?activeFork.bagCargo:activeFork.cargo;
    const pickup=trip.phases.find(phase=>phase.carrying);
    move(journeyAt(start+trip.start+pickup.start+.0001));
    assert.ok(cargo.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...trip.source))<.01,'pallet lifts from its actual dock height');
    move(journeyAt(start+trip.start+trip.depositAt-.0001));
    assert.ok(cargo.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(trip.target.x,trip.target.y,trip.target.z))<.01,'raised pickup still deposits on the vehicle deck');
  }
  FORKLIFT_JOBS[1].trips.forEach((removed,i)=>{
    const restored=FORKLIFT_JOBS[2].trips[i];
    assert.ok(restored.start+restored.depositAt>removed.start+removed.pickupAt);
    move(journeyAt(start+removed.start+removed.pickupAt-.001));assert.equal(logistics.greenStock[i].visible,true);
    move(journeyAt(start+removed.start+removed.pickupAt+.001));assert.equal(logistics.greenStock[i].visible,false);
    move(journeyAt(start+restored.start+restored.depositAt-.001));assert.equal(logistics.greenStock[i].visible,false);
    move(journeyAt(start+restored.start+restored.depositAt+.001));assert.equal(logistics.greenStock[i].visible,true);
  });
});
