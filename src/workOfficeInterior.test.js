import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildWorkOfficeInterior} from './industrial/workOfficeInterior.js';
import {buildOldCampus} from './industrial/oldCampus.js';
import {OLD_WORK_OFFICE as H} from './industrial/siteLayout.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createLinearGradient:()=>({addColorStop(){}})
  },{get:(o,p)=>o[p]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{run(buildWorkOfficeInterior(k,scene),scene,k);}finally{k.dispose();globalThis.document=previous;}
}

test('two office work floors fit the original facade and keep furniture and entrance clear',()=>fixture((office,scene)=>{
  scene.updateMatrixWorld(true);
  assert.deepEqual(office.floors.map(f=>f.position.y),[H.ground,H.upper]);
  for(const floor of office.floors)assert.equal(office.desks.filter(d=>d.parent===floor).length,8);
  for(const [i,item] of office.furniture.entries()){
    const b=new T.Box3().setFromObject(item);
    assert.ok(b.min.x>H.x-H.width/2&&b.max.x<H.x+H.width/2);
    assert.ok(b.min.z>H.z-H.depth/2&&b.max.z<H.z+H.depth/2);
    assert.ok(b.max.y<(item.parent===office.floors[0]?H.upper-.16:H.height));
    for(const other of office.furniture.slice(0,i)){
      if(item.parent===other.parent)assert.equal(b.intersectsBox(new T.Box3().setFromObject(other)),false,'furniture does not intersect');
    }
  }
  // The real courtyard entrance leads directly into the ground-floor aisle.
  const entry=new T.Box3(new T.Vector3(H.x-H.width/2,.4,H.entryZ-.7),
    new T.Vector3(H.x+1,2.5,H.entryZ+.7));
  for(const item of office.furniture.filter(o=>o.parent===office.floors[0]))
    assert.equal(new T.Box3().setFromObject(item).intersectsBox(entry),false,'entrance aisle is open');
  assert.equal(office.treads.length,16);
  const tops=office.treads.map(t=>t.userData.top),rise=(H.upper-H.ground)/16;
  tops.forEach((y,i)=>assert.ok(Math.abs(y-(i?tops[i-1]:H.ground)-rise)<1e-8));
  assert.ok(Math.abs(tops.at(-1)-H.upper)<1e-8,'stairs reach the upper floor');
  const mid=office.root.getObjectByName('office-stair-mid-landing');
  assert.ok(Math.abs(new T.Box3().setFromObject(mid).max.y-tops[7])<1e-6);
  assert.ok(Math.abs(new T.Box3().setFromObject(office.landing).max.y-H.upper)<1e-6);
  for(const tread of office.treads){
    const b=new T.Box3().setFromObject(tread);
    assert.ok(b.min.x>H.x-H.width/2&&b.max.x<H.x+H.width/2);
    assert.ok(b.min.z>H.z-H.depth/2&&b.max.z<H.z+H.depth/2);
  }
}));

test('office shell, glazing and entrance canopy open and restore after batching',()=>fixture((office,scene,k)=>{
  const campus=buildOldCampus(k,new Proxy({},{get:()=>()=>{}}));
  const shell=scene.getObjectByName('old-work-office-shell');
  const canopy=scene.getObjectByName('old-work-office-entrance');
  assert.ok(campus.shells.includes(shell)&&campus.shells.includes(canopy));
  office.root.visible=false;
  poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
  const visibleCount=()=>{let count=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)count+=o.getVisibleAt(i)?1:0;});return count;};
  refresh();const closed=visibleCount();
  shell.visible=false;canopy.visible=false;refresh();const openEmpty=visibleCount();
  assert.ok(openEmpty<closed,'roof and facade actually disappear');
  office.root.visible=true;refresh();
  assert.ok(visibleCount()>openEmpty,'workspaces appear in cutaway');
  office.root.visible=false;shell.visible=true;canopy.visible=true;refresh();
  assert.equal(visibleCount(),closed,'exterior restores exactly');
}));
