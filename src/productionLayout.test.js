import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {BOARD_START,BOARD_END,BOARD_DRYER,CEILING_LINES,EMPTY_PRODUCTION_BAY} from './industrial/processPlan.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    const flow=buildMaterialFlow(kit,{pallet:(parent,pos)=>kit.group(pos,parent,true)});
    production.root.attach(flow.enclosed);
    run(production,scene);
  }finally{kit.dispose();globalThis.document=previous;}
}

test('third roof bay remains free of production, conveyors, controls and stock',()=>fixture((production,scene)=>{
  const {west,east,north,south}=EMPTY_PRODUCTION_BAY;
  const empty=new T.Box3(new T.Vector3(west,.15,north),new T.Vector3(east,8,south));
  const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
  for(const dt of [0,4,8,16]){
    production.updateMotion(dt,{preview:true,active,showInterior:true});scene.updateMatrixWorld(true);
    const collisions=[];
    // Material-flow conveyors can be attached directly to the scene, so cover
    // the assembled production and transport geometry, not just its root.
    scene.traverseVisible(o=>{
      if(!o.isMesh)return;
      const b=new T.Box3().setFromObject(o);
      if(!empty.intersectsBox(b))return;
      let owner=o;while(owner&&!owner.name)owner=owner.parent;
      collisions.push({name:owner?.name,min:b.min.toArray(),max:b.max.toArray()});
    });
    assert.deepEqual(collisions,[],'the entire railway-side roof bay is empty');
  }
}));

test('two straight ceiling lines and the attached-building board feed stay in the occupied bays',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const dryer=production.root.getObjectByName('machine-GK'),position=dryer.getWorldPosition(new T.Vector3());
  assert.equal(position.z,BOARD_START[2]);assert.equal(position.x,BOARD_DRYER.x);
  assert.ok(position.z-1.9>-29.83&&position.z+1.9<-20.17,'dryer stays under the middle roof');
  assert.equal(production.root.getObjectByName('board-cutter').getWorldPosition(new T.Vector3()).z,position.z);
  assert.ok(BOARD_END[2]>EMPTY_PRODUCTION_BAY.south&&BOARD_END[0]<CEILING_LINES[1].start-6,'robot receiver precedes the second ceiling line');
  assert.equal(production.ceilingLines.length,2);
  for(const layout of CEILING_LINES){
    const points=layout.route.slice(1);
    assert.ok(points.every(p=>p[2]===layout.z),'each ceiling line is straight');
    for(let i=1;i<points.length;i++)assert.ok(points[i][0]>points[i-1][0],'products advance in one direction');
    for(const part of ['lamination','crosscut','perforation','inspection','packer']){
      const unit=production.root.getObjectByName(`interior-${layout.id}-${part}`);
      assert.equal(unit.getWorldPosition(new T.Vector3()).z,layout.z,'every station matches its conveyor');
      assert.equal(new T.Box3().setFromObject(dryer).intersectsBox(new T.Box3().setFromObject(unit)),false,'ceiling line clears the board dryer');
    }
  }
  const feed=production.flows.find(f=>f.material==='slurry');
  assert.ok(feed,'wet preparation remains connected');
  const start=feed.path.getPoint(0).add(production.root.position),end=feed.path.getPoint(1).add(production.root.position);
  assert.ok(start.z>-10.5,'slurry comes from the attached process buildings');
  assert.equal(end.x,BOARD_START[0]);assert.equal(end.z,BOARD_START[2]);
}));
