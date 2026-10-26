import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {prepareCadInteriors,CAD_INTERIOR_CATALOG as catalog} from './industrial/cadInteriors.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';
import {EMPTY_PRODUCTION_BAY,CEILING_LINES} from './industrial/processPlan.js';

async function library(){
  const b=await readFile(new URL('../public/models/cad-interiors.glb',import.meta.url));
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
async function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(k);production.root.position.set(8,0,-25);
    return await run(k,production,scene);
  }finally{k.dispose();globalThis.document=previous;}
}

test('CAD library retains source identities, metre bounds and a bounded download',async()=>{
  const bytes=await readFile(new URL('../public/models/cad-interiors.glb',import.meta.url));
  assert.ok(bytes.length<2.5*1024*1024);
  const asset=await library();let triangles=0;
  for(const [name,record] of Object.entries(catalog.models)){
    const node=asset.scene.getObjectByName(name);assert.ok(node,name);
    assert.equal(node.userData.cadSource.objectId,record.objectId);
    const bounds=new T.Box3().setFromObject(node),size=bounds.getSize(new T.Vector3());
    for(let i=0;i<3;i++)assert.ok(Math.abs(size.getComponent(i)-record.size[i])<.03,`${name}: metre dimensions`);
    assert.ok(Math.abs(bounds.min.y)<.03,`${name}: local base`);
    node.traverse(o=>{if(o.isMesh){triangles+=o.geometry.index.count/3;o.geometry.dispose();}});
  }
  assert.ok(triangles>90000&&triangles<270000);
});

test('native silo shells remain continuous instead of importing the torn handoff preview',async()=>{
  const asset=await library();asset.scene.updateMatrixWorld(true);
  assert.equal(catalog.nativeSource.sha256,'50f09d90d5007baa3d5415e3cf98922f1892f5c17a8c5602fa6410652a6b0bfa');
  for(const name of ['silo','tallSilo']){
    const shape=asset.scene.getObjectByName(name),size=catalog.models[name].size;
    const radius=Math.max(size[0],size[2])*.7;let hits=0,total=0;
    for(const height of [.5,.67])for(let i=0;i<48;i++){
      const a=i*Math.PI/24,direction=new T.Vector3(Math.cos(a),0,Math.sin(a));
      const origin=direction.clone().multiplyScalar(radius);origin.y=size[1]*height;
      hits+=Number(new T.Raycaster(origin,direction.negate(),0,radius).intersectObject(shape,true).length>0);total++;
    }
    assert.ok(hits/total>.95,`${name}: ${hits}/${total} near-side shell intersections`);
  }
});

test('CAD equipment fits existing rooms and preserves production tools, ports and the empty third bay',()=>fixture(async(k,production)=>{
  const inventory=JSON.stringify(production.interiorInventory);
  const outdoorBounds=new T.Box3().setFromObject(production.outdoor);
  const cad=prepareCadInteriors(k,production.root);
  assert.equal(cad.slots.length,58);
  const ports=cad.slots.map(s=>Object.values(s.machine.userData.ports||{}).map(p=>({p,position:p.position.clone(),connected:p.connected})));
  assert.equal(cad.install(await library()),58);
  const empty=new T.Box3(new T.Vector3(EMPTY_PRODUCTION_BAY.west,0,EMPTY_PRODUCTION_BAY.north),new T.Vector3(EMPTY_PRODUCTION_BAY.east,40,EMPTY_PRODUCTION_BAY.south));
  for(const [i,{machine,bounds,fallback}] of cad.slots.entries()){
    const id=machine.userData.equipment.id,shape=machine.getObjectByName(`cad-${id}`);
    machine.updateWorldMatrix(true,true);
    const world=new T.Box3().setFromObject(shape),envelope=bounds.clone().applyMatrix4(machine.matrixWorld).expandByScalar(.01);
    assert.ok(envelope.containsBox(world),`${id}: fits original machine envelope`);
    for(const adapter of machine.children.filter(o=>o.name.startsWith('cad-adapter-'))){
      assert.ok(envelope.containsBox(new T.Box3().setFromObject(adapter,true)),`${id}: adapter stays in original envelope`);
    }
    assert.equal(world.intersectsBox(empty),false,`${id}: empty third bay`);
    assert.ok(machine.userData.cadCollision.clone().applyMatrix4(machine.matrixWorld).expandByScalar(.01).containsBox(world),`${id}: collision covers shell`);
    assert.equal(fallback.visible,false);
    assert.equal(machine.userData.cadInterior.status,'ready');
    for(const {p,position,connected} of ports[i]){assert.ok(p.position.equals(position));assert.equal(p.connected,connected);assert.equal(p.machine,machine);}
  }
  for(const id of ['board-slurry-mixer',`${CEILING_LINES[0].id}-crosscut`,`${CEILING_LINES[1].id}-perforation`,'rear-thermal-drum','twin-roll-feed']){
    const object=production.root.getObjectByName(`interior-${id}`);assert.ok(object,id);assert.equal(object.userData.cadInterior,undefined,`${id}: keep its own mechanism`);
  }
  assert.equal(JSON.stringify(production.interiorInventory),inventory);
  assert.ok(new T.Box3().setFromObject(production.outdoor).equals(outdoorBounds),'exterior geometry unchanged');
}));

test('asynchronous CAD installation hides batched fallback geometry and follows cutaway visibility',()=>fixture(async(k,production,scene)=>{
  const cad=prepareCadInteriors(k,production.root);
  poolSurfaces(k);k.optimize({preserveRepeated:true});const update=batchAssemblies(k);update();
  const visible=()=>{let count=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)count+=Number(o.getVisibleAt(i));});return count;};
  const before=visible();cad.install(await library());update();
  assert.ok(visible()<before-50,'original shells disappear from GPU batches');
  for(const slot of cad.slots){
    const shape=slot.machine.getObjectByName(`cad-${slot.machine.userData.equipment.id}`);
    assert.ok(shape&&shape.parent===slot.machine);
    assert.ok(slot.fallback.parent===slot.machine);
  }
  assert.ok(production.root.getObjectByName('interior-tower-day-bin').children.some(o=>o.isGroup&&o.userData.cadRetain),'support frame survives batching');
  const existing=new Set(scene.children.filter(o=>o.isBatchedMesh));
  const updateCad=batchAssemblies(k,{roots:cad.renderRoots});updateCad();
  const newBatches=scene.children.filter(o=>o.isBatchedMesh&&!existing.has(o));
  assert.equal(newBatches.length,2,'all CAD skins and adapters use two shared batches');
  production.root.visible=false;update();updateCad();
  for(const batch of newBatches)for(let i=0;i<batch.instanceCount;i++)assert.equal(batch.getVisibleAt(i),false,'CAD hides with exterior view');
  for(const slot of cad.slots){let visible=true;for(let p=slot.machine;p;p=p.parent)visible&&=p.visible;assert.equal(visible,false);}
}));

test('missing or cancelled CAD loads leave all existing equipment available',()=>fixture(async(k,production)=>{
  const cad=prepareCadInteriors(k,production.root),broken=await library();
  broken.scene.getObjectByName('filter').removeFromParent();
  assert.throws(()=>cad.install(broken),/Missing CAD template/);
  assert.ok(cad.slots.every(s=>s.fallback.visible&&s.machine.userData.cadInterior.status==='fallback'));
  const late=await library();let disposed=0;late.scene.traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>disposed++);});
  cad.cancel();assert.equal(cad.install(late),0);assert.ok(disposed>=12);
  assert.ok(cad.slots.every(s=>s.fallback.visible));
}));
