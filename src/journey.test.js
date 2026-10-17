import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY_STEPS,JOURNEY_DURATION,JOURNEY_STAGE as S,journeyAt} from './journey.js';

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
  assert.equal(journeyAt(loading).truckLoads,0);assert.equal(journeyAt(loading+6).truckLoads,0);
  assert.equal(journeyAt(loading+6.3).truckLoads,1);assert.equal(journeyAt(loading+9.4).trainLoads,2);
  for(let t=0;t<JOURNEY_STEPS[S.dispatch].start;t+=.25)assert.equal(journeyAt(t).depart,0);
  const departing=journeyAt(JOURNEY_STEPS[S.dispatch].start+1);assert.equal(departing.truckLoads,6);assert.equal(departing.trainLoads,8);assert.ok(departing.depart>0);
});

// Check the physical handoff after changing vehicle geometry, not just counters.
import * as T from 'three';
import {createJourneyMotion} from './industrial/journeyMotion.js';
import {TRUCK_LAYOUT} from './industrial/trucks.js';
import {RAIL_LAYOUT} from './industrial/rail.js';
test('forklift loads meet the truck and rail decks without a vertical or lateral jump',()=>{
  const fork=()=>{const g=new T.Group(),lift=new T.Group(),cargo=new T.Group(),bagCargo=new T.Group();g.add(lift);lift.add(cargo,bagCargo);cargo.position.set(1.65,.08,0);bagCargo.position.copy(cargo.position);return {g,fork:lift,cargo,bagCargo,ws:[]};};
  const truckFork=fork(),railForkA=fork(),railForkB=fork();
  const dispatchTruck={g:new T.Group(),hinge:new T.Group(),ws:[],cargo:Array.from({length:6},()=>new T.Group())};
  const logistics={truckFork,railForkA,railForkB,dispatchTruck,hauler:{g:new T.Group(),cargo:new T.Group(),bed:new T.Group(),tailgate:new T.Group(),ws:[]},train:new T.Group(),trainCargo:Array.from({length:8},()=>new T.Group()),railWheels:[],stock:Array.from({length:3},()=>({g:new T.Group(),panel:new T.Group(),bags:new T.Group()}))};
  const move=createJourneyMotion(logistics),start=JOURNEY_STEPS[S.load].start;
  move(journeyAt(start+8*.70));
  const truckPoint=truckFork.cargo.getWorldPosition(new T.Vector3());
  const truckDeck=new T.Vector3(64-TRUCK_LAYOUT.kingpinX-TRUCK_LAYOUT.trailerOffsetX-TRUCK_LAYOUT.cargoXs[0],TRUCK_LAYOUT.deckHeight,-43);
  assert.ok(truckPoint.distanceTo(truckDeck)<1e-6);assert.equal(truckFork.cargo.visible,true);
  move(journeyAt(start+12*.70));
  const railPoint=railForkA.cargo.getWorldPosition(new T.Vector3());
  const railDeck=new T.Vector3(RAIL_LAYOUT.wagonCentres[0]+RAIL_LAYOUT.cargoXs[0],RAIL_LAYOUT.deckHeight,RAIL_LAYOUT.z);
  assert.ok(railPoint.distanceTo(railDeck)<1e-6);assert.equal(railForkA.cargo.visible,true);
});
