import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildRearServiceYard,REAR_SERVICE_YARD as Y} from './industrial/rearServiceYard.js';
import {GYPSUM_STOCKYARD,GYPSUM_SILO_TOWER} from './industrial/siteLayout.js';
import {GYPSUM_CORNER_SILO} from './industrial/processPlan.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  const structures=k.group([0,0,0],scene,true),roofs=k.group([0,0,0],scene,true);
  try{const result=buildRearServiceYard(k,roofs,structures);scene.updateMatrixWorld(true);run({scene,k,structures,roofs,...result});}
  finally{k.dispose();globalThis.document=previous;}
}
const bounds=o=>new T.Box3().setFromObject(o);
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
