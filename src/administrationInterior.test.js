import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildAdministrationInterior} from './industrial/administrationInterior.js';
import {buildProduction} from './industrial/production.js';
import {NEW_ADMINISTRATION as A} from './industrial/siteLayout.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

test('administration work rooms contain furniture, exclude production and survive cutaway batching',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const office=buildAdministrationInterior(k),production=buildProduction(k);
    production.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const room=new T.Box3(new T.Vector3(A.x-A.width/2+.18,A.ground,A.z-A.depth/2+.18),new T.Vector3(A.productionWallX-.18,A.height,A.z+A.depth/2-.18));
    assert.equal(office.desks.length,9);
    for(const [i,item] of office.furniture.entries()){
      const b=new T.Box3().setFromObject(item);
      assert.ok(room.clone().expandByScalar(.0001).containsBox(b),`${item.name}: fits office`);
      for(const other of office.furniture.slice(0,i))assert.equal(b.intersectsBox(new T.Box3().setFromObject(other)),false,`${item.name}: separate furniture`);
    }
    const intrusions=[];
    production.root.traverse(o=>{if(o.isMesh&&room.intersectsBox(new T.Box3().setFromObject(o)))intrusions.push(o.parent.name||o.name);});
    assert.deepEqual(intrusions,[],'no machine, conveyor, stock or process pipe enters the office');
    production.root.visible=false;
    poolSurfaces(k);k.optimize({preserveRepeated:true});const update=batchAssemblies(k);
    const visible=()=>{update();let count=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)count+=Number(o.getVisibleAt(i));});return count;};
    const furnished=visible();office.root.visible=false;const hidden=visible();
    assert.ok(furnished>hidden,'office furniture participates in cutaway visibility');
    office.root.visible=true;assert.equal(visible(),furnished);
  }finally{k.dispose();globalThis.document=previous;}
});
