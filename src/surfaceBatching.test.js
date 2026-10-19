import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

test('batched surfaces preserve exact finish, moving transforms, visibility and cell bounds',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const a=k.group([0,0,0],scene,true),b=k.group([100,0,0],scene,true),red=k.material('#aa3322',.2,.73);
    k.box(1,1,1,[0,0,0],red,a);k.box(1,1,1,[0,0,0],red,b);
    poolSurfaces(k);assert.equal(a.children[0].geometry,b.children[0].geometry);
    const geo=a.children[0].geometry;
    assert.ok(Math.abs(geo.attributes.color.getX(0)-red.color.r)<1e-7);
    assert.ok(Math.abs(geo.attributes.surfaceFinish.getY(0)-.73)<1e-7);
    k.optimize();const update=batchAssemblies(k);update();
    const batch=scene.children.find(o=>o.isBatchedMesh);assert.ok(batch);assert.equal(batch.instanceCount,2);
    assert.equal(batch.geometry.attributes.position.count,24,'identical assemblies share one geometry');
    const matrix=new T.Matrix4();b.position.x=120;update();batch.getMatrixAt(1,matrix);assert.equal(matrix.elements[12],120);
    a.visible=false;update();assert.equal(batch.getVisibleAt(0),false);assert.equal(batch.getVisibleAt(1),true);
  }finally{k.dispose();globalThis.document=previous;}
});

test('newly merged vehicle body parts retain their moving parent origin',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    for(const x of [300,320]){const vehicle=k.group([x,13,-80],scene,true);k.box(2,1,1,[0,0,0],k.m.white,vehicle,.1);k.box(3,1,1,[3,0,0],k.m.white,vehicle,.1);}
    poolSurfaces(k);k.optimize({preserveRepeated:true});
    const update=batchAssemblies(k);update();const batch=scene.children.find(o=>o.isBatchedMesh),matrix=new T.Matrix4();
    assert.ok(batch);batch.getMatrixAt(0,matrix);assert.deepEqual(matrix.elements.slice(12,15),[300,13,-80]);
    batch.getMatrixAt(1,matrix);assert.deepEqual(matrix.elements.slice(12,15),[320,13,-80]);
  }finally{k.dispose();globalThis.document=previous;}
});
