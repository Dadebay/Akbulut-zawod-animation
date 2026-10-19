import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';

test('batching retains indices, incompatible layouts, shadow flags and moving assemblies',()=>{
  const oldDocument=globalThis.document;
  const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(obj,key)=>obj[key]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>context})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const moving=kit.group([10,0,0],scene,true);
    const a=kit.box(1,1,1,[1,0,0],kit.m.white,moving);
    kit.box(1,1,1,[3,0,0],kit.m.white,moving);
    const noUV=new T.BoxGeometry(1,1,1);noUV.deleteAttribute('uv');
    const incompatible=kit.mesh(noUV,kit.m.white,[0,0,0],moving);
    const noShadow=kit.box(1,1,1,[5,0,0],kit.m.white,moving);noShadow.castShadow=false;
    kit.optimize();
    const meshes=moving.children.filter(o=>o.isMesh);
    assert.equal(meshes.length,3);
    assert.equal(incompatible.parent,moving);assert.equal(noShadow.castShadow,false);
    const batch=meshes.find(o=>o!==incompatible&&o!==noShadow);
    assert.equal(batch.geometry.index.count,72);
    assert.equal(batch.geometry.attributes.position.count,48);
    assert.equal(a.parent,null);
    batch.geometry.computeBoundingBox();
    assert.equal(batch.geometry.boundingBox.min.x,.5);
    moving.position.x=20;scene.updateMatrixWorld(true);
    assert.equal(new T.Box3().setFromObject(batch).min.x,20.5);
  }finally{kit.dispose();globalThis.document=oldDocument;}
});

test('spatial instance batches preserve colors, transforms and distance culling',()=>{
  const oldDocument=globalThis.document;
  const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(obj,key)=>obj[key]??(()=>{})});
  globalThis.document={createElement:()=>({getContext:()=>context})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const field=kit.instances(new T.BoxGeometry(1,1,1),kit.m.white,1000),matrix=new T.Matrix4();field.userData.detailDistance=90;
    for(let i=0;i<1000;i++){field.setMatrixAt(i,matrix.makeTranslation(i<500?0:200,0,0));field.setColorAt(i,new T.Color(i<500?'#ff0000':'#0000ff'));}
    kit.optimize();const batches=scene.children.filter(o=>o.isInstancedMesh);
    assert.equal(batches.length,2);assert.equal(batches.reduce((s,o)=>s+o.count,0),1000);
    const color=new T.Color();batches[0].getColorAt(0,color);assert.equal(color.getHexString(),'ff0000');batches[1].getColorAt(0,color);assert.equal(color.getHexString(),'0000ff');
    batches[1].getMatrixAt(0,matrix);assert.equal(matrix.elements[12],200);
    kit.updateDetailVisibility({position:new T.Vector3(0,4,0)});assert.equal(batches[0].visible,true);assert.equal(batches[1].visible,false);
    kit.updateDetailVisibility({position:new T.Vector3(200,4,0)});assert.equal(batches[0].visible,false);assert.equal(batches[1].visible,true);
  }finally{kit.dispose();globalThis.document=oldDocument;}
});

test('material cache shares equal parameters but isolates animated state and textures',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})})})};
  const kit=createKit(new T.Scene());
  try{
    assert.equal(kit.material('#123456',.1,.7,{opacity:.5,transparent:true}),kit.material('#123456',.1,.7,{transparent:true,opacity:.5}));
    assert.notEqual(kit.material('#123456',.1,.7,{unique:true}),kit.material('#123456',.1,.7,{unique:true}));
    assert.notEqual(kit.material('#fff',0,.7,{map:new T.Texture()}),kit.material('#fff',0,.7,{map:new T.Texture()}));
    kit.box(1,1,1,[0,0,0]);kit.box(1,1,1,[2,0,0]);kit.box(1,1,1,[130,0,0]);kit.box(1,1,1,[132,0,0]);
    kit.optimize();assert.equal(kit.scene.children.filter(o=>o.isMesh).length,2,'distant cells retain independent culling');
  }finally{kit.dispose();globalThis.document=previous;}
});
