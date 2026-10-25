import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWalkPhysics,walkDelta,WALK_BODY} from './industrial/walkPhysics.js';
import {createDoorMotion,buildWalkDoor} from './industrial/doors.js';
import {subtractWalkBox,createWalkWorld} from './industrial/walkWorld.js';
import {WALK_BUILDINGS,WALK_STARTS,portalPose} from './industrial/walkLayout.js';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {buildSite} from './industrial/site.js';
import {buildLogistics} from './industrial/logistics.js';
import {buildOldCampusInterior} from './industrial/oldCampusInterior.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {PROCESS_LINES,GYPSUM_STORAGE} from './industrial/processPlan.js';
import {REAR_SERVICE_YARD} from './industrial/rearServiceYard.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
test('walking speed is frame-rate independent and diagonal input is normalized',()=>{
  for(const fps of [15,30,60,144])for(const keys of [new Set(['KeyW']),new Set(['KeyW','KeyD'])]){
    const p=V(),world=createWalkPhysics({ground:0});
    for(let i=0;i<fps;i++)world.move(p,walkDelta(keys,0,1/fps),1/fps);
    assert.ok(Math.abs(p.length()-WALK_BODY.speed)<1e-6);
  }
});
test('thin walls block fast movement and allow sliding without crossing corners',()=>{
  const w=createWalkPhysics({ground:0});w.add({x:0,z:0,hx:.025,hz:4,bottom:0,top:3});
  const p=V(-1,0,0);w.move(p,V(5,0,2),.1);
  assert.ok(p.x<-.29);assert.ok(p.z>1.9);
});
test('steps ascend and descend while a low ceiling prevents stepping up',()=>{
  const w=createWalkPhysics({ground:0});
  for(let i=0;i<6;i++)w.add({x:i*.4+.2,z:0,hx:.2,hz:1,bottom:0,top:(i+1)*.2});
  const p=V(-.5,0,0);
  for(let i=0;i<135;i++)w.move(p,V(.02,0,0),1/60);
  assert.ok(p.y>1.1,`reached ${p.toArray()}`);
  for(let i=0;i<180;i++)w.move(p,V(-.02,0,0),1/60);
  assert.equal(p.y,0);
  const low=createWalkPhysics({ground:0});low.add({x:1,z:0,hx:.7,hz:1,bottom:1.8,top:2});low.add({x:1,z:0,hx:.7,hz:1,bottom:0,top:.2});
  const q=V();low.move(q,V(1,0,0),.1);assert.ok(q.x<.3);
});
test('a doorway cut retains its jambs and lintel and leaves a true opening',()=>{
  const wall=new T.Box3(V(-4,0,-.1),V(4,3,.1)),hole=new T.Box3(V(-.6,0,-1),V(.6,2.3,1));
  const parts=subtractWalkBox(wall,hole);assert.equal(parts.length,3);
  assert.ok(parts.every(p=>!p.containsPoint(V(0,1,0))));assert.ok(parts.some(p=>p.containsPoint(V(0,2.8,0))));
});
test('closing doors reverse when their sweep is occupied',()=>{
  const door=createDoorMotion({open:true});door.toggle();door.update(.1,()=>true);
  assert.equal(door.progress,1);assert.equal(door.target,1);
  door.toggle();door.update(.4);assert.ok(door.progress<1);door.toggle();door.update(.4);assert.equal(door.progress,1);
});

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({measureText:()=>({width:100}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{return run(k,scene);}finally{k.dispose();globalThis.document=previous;}
}
test('animated door leaves retain collision and visibility after surface batching',()=>fixture((k,scene)=>{
  const physics=createWalkPhysics(),root=k.group([0,0,0],scene,true);
  const door=buildWalkDoor(k,physics,{id:'test',label:'test',x:0,y:0,z:0,yaw:0,width:1.2,height:2.3},root);
  poolSurfaces(k);k.optimize({preserveRepeated:true});const update=batchAssemblies(k);
  assert.ok(physics.overlap(V(0,0,0),door.leaves[0].body));
  door.toggle();door.update(1,V(0,0,-2));update();
  assert.equal(physics.overlap(V(0,0,0),door.leaves[0].body),null);
  assert.ok(Math.abs(door.leaves[0].pivot.rotation.y)>1.5);
}));

test('both campuses have a clear entrance for every registered building',()=>fixture((k,scene)=>{
  const production=buildProduction(k);production.root.position.set(8,0,-25);
  const logistics=buildLogistics(k,[]),site=buildSite(k),oldInterior=buildOldCampusInterior(k,logistics.pallet);
  const materialFlow=buildMaterialFlow(k,logistics);production.root.attach(materialFlow.enclosed);
  const world=createWalkWorld(k,{site,production,oldInterior,logistics,materialFlow});world.setActive(true);
  assert.equal(world.buildings.length,WALK_BUILDINGS.length);assert.ok(world.doors.length>=55);
  for(const start of WALK_STARTS){const p=V(...start.position);p.y=world.physics.floorAt(p,p.y+.6);assert.ok(world.physics.clear(p),`${start.id}: clear spawn ${p.toArray()}`);}
  for(const b of WALK_BUILDINGS){
    const accessible=b.doors.some((d,index)=>{
      const pose=portalPose(b,d),normal=V(Math.sin(pose.yaw),0,Math.cos(pose.yaw));
      const gate=world.doors.find(d=>d.ids.includes(`${b.id}-${index}`));
      if(gate){if(!gate.motion.target)gate.toggle();gate.update(2,null);}
      const p=V(pose.x,pose.y,pose.z).addScaledVector(normal,1.15);p.y=world.physics.floorAt(p,p.y+.26);
      if(!world.physics.clear(p))return false;
      for(let i=0;i<130;i++)world.physics.move(p,normal.clone().multiplyScalar(-.02),1/60);
      return p.clone().sub(V(pose.x,0,pose.z)).dot(normal)<-.35;
    });
    assert.ok(accessible,`${b.id}: must have an unobstructed entrance`);
  }
  for(const [label,start,delta,count,height] of [
    ['front tower',[-50.1,.04,.2],[0,0,-.02],290,3.2],
    ['office first flight',[-12.5,.32,-91.6],[0,0,.02],180,1.62],
    ['office upper flight',[-11.3,1.62,-87.9],[0,0,-.02],190,2.92],
  ]){
    const p=V(...start);for(let i=0;i<count;i++)world.physics.move(p,V(...delta),1/60);
    assert.ok(Math.abs(p.y-height)<.05,`${label}: reached ${p.toArray()}`);
  }
}));

test('silo distribution pipes and their nozzle connections stay inside the current rear facade',()=>{
  const branches=PROCESS_LINES.find(l=>l.id==='gypsum').branches;
  const inside=([x,y,z])=>[-.45,.45].every(dx=>[-.45,.45].every(dz=>REAR_SERVICE_YARD.buildings.some(b=>x+dx>b.x-b.width/2&&x+dx<b.x+b.width/2&&z+dz>b.z-b.depth/2&&z+dz<b.z+b.depth/2&&y+.45<b.height)));
  for(const path of branches){
    // The ground transfer from the outdoor corner silo is intentionally exposed.
    for(const p of path.filter(p=>p[1]>2))assert.ok(inside(p),`upper pipe outside facade: ${p}`);
  }
  assert.deepEqual(branches.map(p=>p.at(-1)),[-1.55,2.45].map(x=>[GYPSUM_STORAGE.x+x,10.13,GYPSUM_STORAGE.z]));
});
