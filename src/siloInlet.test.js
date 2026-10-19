import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildCornerSilo} from './industrial/rawInfeed.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {GYPSUM_LIFT,PROCESS_LINES} from './industrial/processPlan.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{buildCornerSilo(k);run(scene,k);}finally{k.dispose();globalThis.document=previous;}
}
function solidMeshes(scene){
  scene.updateMatrixWorld(true);const meshes=[];
  scene.traverse(o=>{
    if(!o.isMesh)return;
    for(let p=o;p;p=p.parent)if(p.userData.dynamic)return;
    o.material.side=T.DoubleSide;meshes.push(o);
  });return meshes;
}
function clearSegment(a,b,meshes,label){
  const delta=b.clone().sub(a),ray=new T.Raycaster(a,delta.clone().normalize(),.001,delta.length()-.001);
  assert.equal(ray.intersectObjects(meshes,false).length,0,label);
}

test('silo approach leaves clearance around the full conveyor and its material',()=>fixture(scene=>{
  const solids=solidMeshes(scene),start=new T.Vector3(...GYPSUM_LIFT[0]),end=new T.Vector3(...GYPSUM_LIFT[1]);
  const d=end.clone().sub(start),side=new T.Vector3(-d.z,0,d.x).normalize();
  const entry=end.clone().addScaledVector(d,-3/Math.hypot(d.x,d.z));
  // Sweep the outer belt rails, underside and crushed-rock envelope through
  // the final three metres: no railing, lid, hood or filter can obstruct it.
  for(const lateral of [-.73,0,.73])for(const height of [-.18,0,.4]){
    const offset=side.clone().multiplyScalar(lateral).add(new T.Vector3(0,height,0));
    clearSegment(entry.clone().add(offset),end.clone().add(offset),solids,`inlet clearance ${lateral}, ${height}`);
  }
}));

test('gypsum leaves the belt tip and falls through an open chute into the silo',()=>fixture((scene,k)=>{
  buildMaterialFlow(k,{pallet:(parent,pos)=>k.group(pos,parent,true)});
  const solids=solidMeshes(scene),points=PROCESS_LINES[0].points.slice(-3).map(p=>new T.Vector3(...p));
  const forward=points[1].clone().sub(points[0]).setY(0).normalize(),side=new T.Vector3(-forward.z,0,forward.x);
  assert.ok(points[1].clone().sub(points[0]).dot(forward)>.25,'discharge must clear the belt end before falling');
  assert.ok(points[2].y<11.3,'material reaches inside the silo');
  for(const lateral of [-.14,0,.14])for(const along of [-.14,0,.14]){
    const offset=side.clone().multiplyScalar(lateral).addScaledVector(forward,along).add(new T.Vector3(0,.12,0));
    clearSegment(points[1].clone().add(offset),points[2].clone().add(offset),solids,'open vertical drop, including the roof');
  }
  clearSegment(points[0].clone().add(new T.Vector3(0,.12,0)),points[1].clone().add(new T.Vector3(0,.12,0)),solids,'clear belt tip');
}));
