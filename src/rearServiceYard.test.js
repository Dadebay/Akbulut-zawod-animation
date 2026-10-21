import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildRearServiceYard,REAR_SERVICE_YARD as Y} from './industrial/rearServiceYard.js';
import {buildProcessingBuildings} from './industrial/processingBuildings.js';
import {GYPSUM_STOCKYARD,GYPSUM_SILO_TOWER} from './industrial/siteLayout.js';
import {GYPSUM_CORNER_SILO} from './industrial/processPlan.js';

function fixture(run,build=buildRearServiceYard){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  const structures=k.group([0,0,0],scene,true),roofs=k.group([0,0,0],scene,true);
  try{const result=build(k,roofs,structures);scene.updateMatrixWorld(true);run({scene,k,structures,roofs,...result});}
  finally{k.dispose();globalThis.document=previous;}
}
const bounds=o=>new T.Box3().setFromObject(o);
test('all thirteen reference parts remain distinct, with exposed stepped roofs instead of one large slab',()=>fixture(({scene})=>{
  const parts=[];scene.traverse(o=>{if(o.userData.referencePart)parts.push(o.userData.referencePart);});
  assert.deepEqual(parts.sort((a,b)=>a-b),Array.from({length:13},(_,i)=>i+1));
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,45);
  const height=(x,z)=>{
    ray.ray.origin.set(x,40,z);
    return ray.intersectObjects(scene.children,true)[0]?.point.y;
  };
  // Rays hit the actual assembled roof, so an old solid or roof cannot hide
  // either the low shoulder (2) or the split high roofs (3, 4 and 5).
  assert.ok(height(-29,16)>12&&height(-29,16)<14,'part 2 stays below the long block');
  assert.ok(height(-34,2)>26&&height(-34,2)<28,'part 3 is the front pitched roof');
  assert.ok(height(-18,2)>25&&height(-18,2)<26.5,'part 4 is a separate lower pitched roof');
  assert.ok(height(-29,-6)>28&&height(-29,-6)<29,'part 5 has its own high flat roof');
  assert.ok(height(-17,-2)>29,'part 6 remains the taller shaft');
  for(const z of [15,22,28])assert.ok(height(-18,z)>18&&height(-18,z)<20,'continuous low silo-side roof');
  for(const name of ['rear-service-room']){
    const b=Y.buildings.find(v=>v.name===name),back=height(b.x-b.width/2+.35,b.z),front=height(b.x+b.width/2-.35,b.z);
    assert.ok(back-front>.9,`${name}: roof falls toward the yard`);
    const sideRay=new T.Raycaster(new T.Vector3(b.x-b.width/2+.5,b.height+.5,b.z+b.depth/2+1),new T.Vector3(0,0,-1),0,2);
    assert.ok(sideRay.intersectObject(scene.getObjectByName(name),true).length,`${name}: no open triangular gap under the roof`);
  }
  const bridge=bounds(scene.getObjectByName('rear-silo-maintenance-bridge'));
  assert.ok(bridge.intersectsBox(bounds(scene.getObjectByName('rear-south-block'))),'bridge meets the new long block');
  assert.ok(bridge.intersectsBox(bounds(scene.getObjectByName('gypsum-corner-silo-tower'))),'bridge meets the silo tower');
},buildProcessingBuildings));
test('the L-shaped courtyard wing has an open ground-level passage beside the rear blocks',()=>fixture(({scene})=>{
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,40);
  // Sample the whole passage, including the short link, tower side and low annex.
  // No wall, roof, coping or leftover doorway may bridge this strip of paving.
  for(const x of [-36.4,-35,-33.5,-31.5])for(let z=20.4;z<38;z+=.6){
    ray.ray.origin.set(x,35,z);
    const hit=ray.intersectObjects(scene.children,true)[0];
    assert.ok(hit&&hit.point.y<.2&&hit.point.y>-.1,`open paved passage at ${x}, ${z}; hit height ${hit?.point.y}`);
  }
},buildProcessingBuildings));
test('rear reference utilities stand on the ground and remain separate from the stockyard and silo',()=>fixture(({yard,scene})=>{
  const field=bounds(scene.getObjectByName('rear-gravel-field'));
  assert.ok(field.max.y<.1,'the gravel field must not return to a building roof');
  assert.ok(field.max.x<GYPSUM_STOCKYARD.west,'stone piles retain their own apron');
  assert.ok(field.min.x>GYPSUM_CORNER_SILO[0]+2.35,'silo access pad stays clear');
  const vents=[],covers=[];yard.traverse(o=>{if(o.name==='rear-gooseneck-vent')vents.push(o);if(o.name==='rear-green-inspection-cover')covers.push(o);});
  assert.equal(vents.length,12);assert.equal(covers.length,3);
  for(const part of [...vents,...covers]){
    const b=bounds(part);assert.ok(b.min.y>=Y.bed.top-.001&&b.max.y<2);
    assert.ok(b.min.x>Y.bed.x-Y.bed.width/2&&b.max.x<Y.bed.x+Y.bed.width/2);
    assert.ok(b.min.z>Y.bed.z-Y.bed.depth/2&&b.max.z<Y.bed.z+Y.bed.depth/2);
  }
  const walkway=bounds(scene.getObjectByName('rear-raised-vent-bed'));
  for(const name of ['rear-control-cabin','rear-yellow-station-1','rear-yellow-station-2']){
    assert.equal(bounds(scene.getObjectByName(name)).intersectsBox(walkway),false,`${name}: maintenance path`);
  }
}));
test('rear architecture leaves the production hall and perimeter service lane clear',()=>{
  for(const b of [...Y.buildings,GYPSUM_SILO_TOWER]){
    assert.ok(b.z-b.depth/2>=-10.5,'does not enter the production hall');
    assert.ok(b.z+b.depth/2<=36.5,'at least 3.5 m before the perimeter fence');
    assert.ok(b.x+b.width/2<Y.gravel.west,'buildings do not occupy the gravel island');
  }
});
test('rear exterior and raised utilities follow the existing cutaway after batching',()=>fixture(({k,scene,structures,roofs})=>{
  k.optimize();structures.visible=false;roofs.visible=false;
  const visible=[];scene.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
  assert.equal(visible.length,0,'no exterior utilities overlap the illustrative cutaway racks');
  structures.visible=true;roofs.visible=true;scene.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
  assert.ok(visible.length>0,'exterior restores');
}));
