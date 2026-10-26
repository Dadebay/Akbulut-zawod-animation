import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildCornerSilo} from './industrial/rawInfeed.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {GYPSUM_LIFT,PROCESS_LINES,GYPSUM_CORNER_SILO,GYPSUM_SILO_TOWER,GYPSUM_SILO_TRANSFER,GYPSUM_STORAGE} from './industrial/processPlan.js';
import {buildGypsumReceivingHall} from './industrial/gypsumReceivingHall.js';
import {GYPSUM_RECEIVING_HALL} from './industrial/siteLayout.js';

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

test('raw material travels 5 to 4 to 3 to 1 with straight exterior transfers',()=>fixture((scene,k)=>{
  const [tail,head]=GYPSUM_LIFT;
  assert.equal(tail[0],GYPSUM_RECEIVING_HALL.west,'belt exits the receiving-hall wall');
  assert.equal(tail[2],head[2],'5→4 belt has no horizontal dogleg');
  assert.equal(head[0],GYPSUM_CORNER_SILO[0]);assert.equal(head[2],GYPSUM_CORNER_SILO[2]);
  const route=GYPSUM_SILO_TRANSFER;
  assert.deepEqual(route[0],[GYPSUM_CORNER_SILO[0],1.3,GYPSUM_CORNER_SILO[2]]);
  assert.deepEqual(route[2],[GYPSUM_SILO_TOWER.x,1.3,GYPSUM_SILO_TOWER.z]);
  assert.equal(route[3][0],route[2][0]);assert.equal(route[3][2],route[2][2]);
  assert.ok(route[3][1]>route[2][1]+9,'lift happens inside tower 3');
  assert.equal(route[4][0],GYPSUM_STORAGE.x);
  assert.equal(route[3][1],route[4][1]);assert.equal(route[3][2],route[4][2],'3→1 is a straight elevated span');
  assert.ok(route[3][0]-route[4][0]>15,'3 no longer touches 1');
  const roofs=k.group(),walls=k.group();buildGypsumReceivingHall(k,roofs,walls);
  const solids=solidMeshes(walls);
  for(const z of [-.78,0,.78])for(const y of [-.18,0,.4]){
    clearSegment(new T.Vector3(tail[0]+.5,tail[1]+y,tail[2]+z),new T.Vector3(tail[0]-.5,tail[1]+y,tail[2]+z),solids,'5→4 passes through the actual wall opening');
  }
  const silo=scene.getObjectByName('gypsum-corner-silo'),siloSolids=solidMeshes(silo);
  clearSegment(new T.Vector3(route[0][0],1.3,route[0][2]-1),new T.Vector3(route[0][0],1.3,route[0][2]-2.4),siloSolids,'4→3 clears the silo ladder and legs');
}));

test('enclosed calcite equipment keeps its world position and follows cutaway visibility after optimization',()=>fixture((scene,k)=>{
  const flow=buildMaterialFlow(k,{pallet:(parent,pos)=>k.group(pos,parent,true)});
  const before=new T.Box3().setFromObject(flow.enclosed);
  const interior=k.group([8,0,-25],scene,true);interior.attach(flow.enclosed);
  k.optimize({preserveRepeated:true});scene.updateMatrixWorld(true);
  const after=new T.Box3().setFromObject(flow.enclosed);
  assert.ok(before.min.distanceTo(after.min)<.001&&before.max.distanceTo(after.max)<.001,'cutaway parenting does not move the process connections');
  const visibleMeshes=()=>{let count=0;interior.traverseVisible(o=>{if(o.isMesh)count++;});return count;};
  interior.visible=false;assert.equal(visibleMeshes(),0,'no enclosed feed protrudes through the exterior facade');
  interior.visible=true;assert.ok(visibleMeshes()>0,'the feed remains available in the interior view');
}));

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
