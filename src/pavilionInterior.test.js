import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildOldCampus} from './industrial/oldCampus.js';
import {buildPavilionInterior} from './industrial/pavilionInterior.js';
import {OLD_PAVILION as P} from './industrial/siteLayout.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createLinearGradient:()=>({addColorStop(){}})
  },{get:(o,p)=>o[p]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{run(buildPavilionInterior(k,scene),scene,k);}finally{k.dispose();globalThis.document=previous;}
}

test('dining room and solar office fit their buildings and keep entries open',()=>fixture((pavilion,scene)=>{
  scene.updateMatrixWorld(true);
  assert.equal(pavilion.diningTables.length,7);
  assert.equal(pavilion.diningChairs.length,28);
  assert.equal(pavilion.workstations.length,4);
  const inside=(item,building)=>{
    const b=new T.Box3().setFromObject(item);
    assert.ok(b.min.x>building.x-building.width/2&&b.max.x<building.x+building.width/2);
    assert.ok(b.min.z>building.z-building.depth/2&&b.max.z<building.z+building.depth/2);
    assert.ok(b.max.y<building.height);
  };
  for(const item of [...pavilion.diningTables,...pavilion.diningChairs,pavilion.serving,pavilion.kitchen])inside(item,P.hall);
  for(const item of pavilion.workstations)inside(item,P.annex);
  const hallEntry=new T.Box3(new T.Vector3(P.hall.x+2.25,.1,P.hall.z-P.hall.depth/2),
    new T.Vector3(P.hall.x+3.75,2.3,P.hall.z-1.5));
  for(const item of [...pavilion.diningTables,...pavilion.diningChairs,pavilion.serving,pavilion.kitchen])
    assert.equal(new T.Box3().setFromObject(item).intersectsBox(hallEntry),false,'dining hall entrance clear');
  const officeEntry=new T.Box3(new T.Vector3(P.annex.x-P.annex.width/2,.1,P.annex.z-.6),
    new T.Vector3(P.annex.x-1.25,2.3,P.annex.z+.6));
  for(const item of pavilion.workstations)
    assert.equal(new T.Box3().setFromObject(item).intersectsBox(officeEntry),false,'solar office entrance clear');
}));

test('pavilion exterior and its two interiors alternate after batching',()=>fixture((pavilion,scene,k)=>{
  const campus=buildOldCampus(k,new Proxy({},{get:()=>()=>{}}));
  const shell=scene.getObjectByName('old-pavilion-dining-office-shell');
  assert.ok(campus.shells.includes(shell));
  assert.equal(shell.getObjectByName('old-pavilion-green-hall').userData.label,'NAHARHANA');
  assert.equal(shell.getObjectByName('old-pavilion-attached-solar-annex').userData.label,'OFIS');
  pavilion.root.visible=false;
  poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
  const count=()=>{let n=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)n+=o.getVisibleAt(i)?1:0;});return n;};
  refresh();const closed=count();
  shell.visible=false;refresh();const empty=count();
  assert.ok(empty<closed,'green roof and solar deck disappear');
  pavilion.root.visible=true;refresh();assert.ok(count()>empty,'dining and office furniture appear');
  pavilion.root.visible=false;shell.visible=true;refresh();assert.equal(count(),closed);
}));
