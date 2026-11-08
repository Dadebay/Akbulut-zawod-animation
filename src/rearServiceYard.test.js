import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildRearServiceYard,REAR_SERVICE_YARD as Y} from './industrial/rearServiceYard.js';
import {buildProcessingBuildings} from './industrial/processingBuildings.js';
import {GYPSUM_STOCKYARD,GYPSUM_SILO_TOWER} from './industrial/siteLayout.js';
import {GYPSUM_CORNER_SILO} from './industrial/processPlan.js';

function fixture(run,build=buildRearServiceYard){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  const structures=k.group([0,0,0],scene,true),roofs=k.group([0,0,0],scene,true);
  try{const result=build(k,roofs,structures);scene.updateMatrixWorld(true);run({scene,k,structures,roofs,...result});}
  finally{k.dispose();globalThis.document=previous;}
}
const bounds=o=>new T.Box3().setFromObject(o);
test('marked hall annex meets the shaft and has a low roof recessed beneath its parapet',()=>fixture(({scene})=>{
  const annex=Y.buildings.find(b=>b.name==='rear-hall-link'),shaft=Y.buildings.find(b=>b.name==='rear-high-shaft');
  const room=Y.buildings.find(b=>b.name==='rear-service-room');
  assert.ok(Math.abs(annex.x-annex.width/2-shaft.x-shaft.width/2)<1e-8,'no gap against the shaft');
  assert.equal(annex.z-annex.depth/2,-10.5,'joins the production hall');
  assert.equal(annex.z+annex.depth/2,room.z-room.depth/2,'joins the lower service room');
  assert.ok(annex.x+annex.width/2>room.x+room.width/2+1.5,'annex projects beyond building 2');
  const roof=scene.getObjectByName('rear-hall-link-roof');
  const height=(x,z)=>new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObject(roof,true)[0]?.point.y;
  const centre=height(annex.x,annex.z);
  assert.ok(centre>5.4&&centre<5.6,'roof deck is below the old 6.4 m slab');
  for(const x of [annex.x-annex.width/2+.06,annex.x+annex.width/2-.06]){
    assert.ok(height(x,annex.z)-centre>.7,'deep parapet on both sides');
  }
  for(const z of [annex.z-4,annex.z+4])assert.ok(Math.abs(height(annex.x,z)-centre)<.04,'level inset roof');
}));
test('flat roof finishes do not share an exterior face with the parapet',()=>fixture(({scene})=>{
  for(const b of Y.buildings.filter(b=>!b.roofRise&&!b.sharedRoof)){
    const roof=scene.getObjectByName(`${b.name}-roof`);
    for(const [axis,span] of [['x',b.width],['z',b.depth]])for(const side of [-1,1])for(const dy of [.03,.06,.09]){
      const origin=new T.Vector3(b.x,b.height+dy,b.z),direction=new T.Vector3();
      origin[axis]+=side*(span/2+1);direction[axis]=-side;
      const ray=new T.Raycaster(origin,direction,0,1.01);
      const faces=new Set(ray.intersectObject(roof,true).map(hit=>hit.object));
      assert.equal(faces.size,1,`${b.name}: one exterior roof-edge surface on ${axis} ${side} at ${dy}`);
    }
    const ray=new T.Raycaster(new T.Vector3(b.x,b.height+1,b.z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObject(roof,true)[0];
    assert.ok(hit&&Math.abs(hit.point.y-b.height-.12)<.025,`${b.name}: roof deck remains closed`);
  }
}));
test('overhead parts 1, 2 and 3 join the hall with a continuous L roof around the shaft',()=>fixture(({scene})=>{
  const main=Y.buildings.find(b=>b.name==='process-high-roof-block');
  const shaft=Y.buildings.find(b=>b.name==='rear-high-shaft');
  const link=Y.buildings.find(b=>b.name==='rear-hall-link');
  const back=Y.buildings.find(b=>b.name==='rear-hall-return');
  for(const b of [main,link,back])assert.ok(Math.abs(b.z-b.depth/2+10.5)<1e-8,'all three legs meet the hall');
  assert.ok(Math.abs(back.x-back.width/2-(main.x+main.width/2))<1e-8,'return meets part 3');
  assert.ok(Math.abs(back.z+back.depth/2-(shaft.z-shaft.depth/2))<1e-8,'return meets the back of part 1');
  const roof=scene.getObjectByName('rear-hall-link-roof');
  const height=(x,z,object=scene)=>new T.Raycaster(new T.Vector3(x,40,z),new T.Vector3(0,-1,0)).intersectObject(object,true)[0]?.point.y;
  // A ground-visible hole or an old interior parapet must not divide the L.
  for(const z of [-9.8,-8.2,-6.5,-5.2])for(const x of [-20.2,-18,-16,-14.8,-14.7,-14.5,-12,-8]){
    const y=height(x,z,roof);assert.ok(y>5.5&&y<5.56,`continuous low roof at ${x}, ${z}: ${y}`);
  }
  assert.ok(height(shaft.x,shaft.z)>29,'small part 1 remains taller than the surrounding roof');
  for(const z of [-9,-5,0]){
    const ridge=height(main.x,z),left=height(main.x-main.width*.4,z),right=height(main.x+main.width*.4,z);
    assert.ok(ridge>left+.5&&ridge>right+.5,'part 3 has two slopes meeting at its ridge');
    assert.ok(Math.abs(left-right)<.04,'matching roof slopes');
  }
}));
test('all thirteen reference parts remain distinct, with exposed stepped roofs instead of one large slab',()=>fixture(({scene})=>{
  const parts=[];scene.traverse(o=>{if(o.userData.referencePart)parts.push(o.userData.referencePart);});
  assert.deepEqual(parts.sort((a,b)=>a-b),Array.from({length:13},(_,i)=>i+1));
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,45);
  const height=(x,z)=>{
    ray.ray.origin.set(x,40,z);
    return ray.intersectObjects(scene.children,true)[0]?.point.y;
  };
  // Rays hit the actual assembled roof, so an old solid or roof cannot hide
  // either the low shoulder (2) or the split high roofs (3, 4 and 5).
  assert.ok(height(-29,16)>12&&height(-29,16)<14,'part 2 stays below the long block');
  assert.ok(height(-28,2)>26&&height(-28,2)<28,'part 3 is the front pitched roof');
  assert.ok(height(-18,2)>25&&height(-18,2)<26.5,'part 4 is a separate lower pitched roof');
  assert.ok(height(-29,-6)>28&&height(-29,-6)<29,'part 5 has its own high flat roof');
  assert.ok(height(-17,-2)>29,'part 6 remains the taller shaft');
  for(const z of [15,22,28])assert.ok(height(-18,z)>18&&height(-18,z)<20,'continuous low silo-side roof');
  for(const name of ['rear-service-room']){
    const b=Y.buildings.find(v=>v.name===name),back=height(b.x-b.width/2+.35,b.z),front=height(b.x+b.width/2-.35,b.z);
    assert.ok(back-front>.9,`${name}: roof falls toward the yard`);
    const sideRay=new T.Raycaster(new T.Vector3(b.x-b.width/2+.5,b.height+.5,b.z+b.depth/2+1),new T.Vector3(0,0,-1),0,2);
    assert.ok(sideRay.intersectObject(scene.getObjectByName(name),true).length,`${name}: no open triangular gap under the roof`);
  }
  const bridge=bounds(scene.getObjectByName('rear-silo-transfer-bridge'));
  assert.ok(bridge.intersectsBox(bounds(scene.getObjectByName('rear-south-block'))),'bridge meets the new long block');
  assert.ok(bridge.intersectsBox(bounds(scene.getObjectByName('gypsum-corner-silo-tower'))),'bridge meets the silo tower');
},buildProcessingBuildings));
test('the narrower front tower and small rear annex share a low base beside the open passage',()=>fixture(({scene})=>{
  const fronts=['process-high-roof-block','process-front-roof-block','process-low-shoulder'].map(name=>bounds(scene.getObjectByName(name)).min.x);
  for(const x of fronts)assert.ok(Math.abs(x-fronts[0])<.001,'no setback between the three front walls');
  const tower=bounds(scene.getObjectByName('processing-leftCore'));
  const base=bounds(scene.getObjectByName('processing-leftBase'));
  assert.ok(tower.min.x>=base.min.x-.1&&tower.max.x<base.max.x-2,'the tower leaves a visible strip of the base on its right');
  const widthRatio=(tower.max.x-tower.min.x)/(base.max.x-base.min.x);
  assert.ok(widthRatio>.78&&widthRatio<.86,'part 1 is narrower than part 2 in the reference');
  const annex=bounds(scene.getObjectByName('processing-leftLink'));
  assert.ok(annex.intersectsBox(tower),'the small part 3 joins the tower');
  assert.ok(annex.max.x-annex.min.x<3&&annex.max.z<tower.min.z+3,'part 3 stays compact at the rear corner');
  assert.ok(annex.min.x>=base.min.x&&annex.max.x<base.max.x&&annex.min.z>=base.min.z&&annex.max.z<base.max.z,'part 3 fits entirely on part 2');
  assert.ok(Math.abs(annex.min.y-base.max.y)<.001,'part 3 starts on top of part 2, without a separate ground-level wall');
  assert.ok(annex.max.y<tower.max.y&&annex.max.y>10,'part 3 roof is below the tower roof');
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,45);
  for(const x of [-33.8,-32.5,-31.3])for(const z of [-9.5,-8,-6,0]){
    ray.ray.origin.set(x,40,z);
    const hit=ray.intersectObjects(scene.children,true)[0];
    assert.ok(!hit||hit.point.y<.2,`open passage beside the compact rear annex at ${x}, ${z}`);
  }
  for(let i=1;i<=3;i++){
    const door=bounds(scene.getObjectByName(`processing-service-door-${i}`));
    assert.ok(door.min.x>base.min.x&&door.max.x<base.max.x,'all three doors stay inside the widened base facade');
  }
},buildProcessingBuildings));
test('the L-shaped courtyard wing has an open ground-level passage beside the rear blocks',()=>fixture(({scene})=>{
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,40);
  // Sample the whole passage, including the short link, tower side and low annex.
  // No wall, roof, coping or leftover doorway may bridge this strip of paving.
  for(const x of [-36.4,-35,-33.5,-31.5])for(let z=20.4;z<38;z+=.6){
    ray.ray.origin.set(x,35,z);
    const hit=ray.intersectObjects(scene.children,true)[0];
    assert.ok(hit&&hit.point.y<.2&&hit.point.y>-.1,`open paved passage at ${x}, ${z}; hit height ${hit?.point.y}`);
  }
},buildProcessingBuildings));
test('rear reference utilities stand on the ground and remain separate from the stockyard and silo',()=>fixture(({yard,scene})=>{
  const field=bounds(scene.getObjectByName('rear-gravel-field'));
  assert.ok(field.max.y<.1,'the gravel field must not return to a building roof');
  assert.ok(field.max.x<GYPSUM_STOCKYARD.west,'stone piles retain their own apron');
  assert.ok(GYPSUM_CORNER_SILO[0]-2.35>field.min.x&&GYPSUM_CORNER_SILO[2]+2.35<field.max.z,'silo stands inside the gravel pad');
  const vents=[],covers=[];yard.traverse(o=>{if(o.name==='rear-gooseneck-vent')vents.push(o);if(o.name==='rear-green-inspection-cover')covers.push(o);});
  assert.equal(vents.length,6);assert.equal(covers.length,3);
  const rows=[...new Set(vents.map(v=>v.position.z))].sort((a,b)=>a-b);
  assert.equal(rows.length,2,'one row at each end');
  assert.ok(rows[0]<Y.bed.z-Y.bed.depth*.3&&rows[1]>Y.bed.z+Y.bed.depth*.3,'middle of the bed stays open');
  const columns=rows.map(z=>vents.filter(v=>v.position.z===z).map(v=>v.position.x).sort((a,b)=>a-b));
  assert.equal(columns[0].length,3);assert.deepEqual(columns[0],columns[1],'three aligned columns');
  for(const part of [...vents,...covers]){
    const b=bounds(part);assert.ok(b.min.y>=Y.bed.top-.001&&b.max.y<2);
    assert.ok(b.min.x>Y.bed.x-Y.bed.width/2&&b.max.x<Y.bed.x+Y.bed.width/2);
    assert.ok(b.min.z>Y.bed.z-Y.bed.depth/2&&b.max.z<Y.bed.z+Y.bed.depth/2);
  }
  const walkway=bounds(scene.getObjectByName('rear-raised-vent-bed'));
  for(const name of ['rear-control-cabin','rear-yellow-station-1','rear-yellow-station-2','gypsum-corner-silo-tower']){
    assert.equal(bounds(scene.getObjectByName(name)).intersectsBox(walkway),false,`${name}: maintenance path`);
  }
  const station=bounds(scene.getObjectByName('rear-yellow-station-1'));
  assert.ok(station.max.x<walkway.min.x,'yellow station is beside the left edge of the bed');
  assert.ok(station.max.z-station.min.z>2*(station.max.x-station.min.x),'long side points along the passage');
  assert.ok(walkway.min.x-Y.gravel.upperWest>4,'open gravel strip beside the narrower bed');
}));
test('the marked hall has an open paved gap before the recessed gravel edge',()=>fixture(({scene})=>{
  const hall=Y.buildings.find(b=>b.name==='rear-hall-link'),east=hall.x+hall.width/2;
  assert.ok(Y.gravel.upperWest-east>=5,'wide paved passage between the facade and gravel edge');
  const field=scene.getObjectByName('rear-gravel-field');
  for(const z of [0,4,9,13,18,22])for(let x=east+.15;x<Y.gravel.upperWest-.15;x+=.2){
    const ray=new T.Raycaster(new T.Vector3(x,1,z),new T.Vector3(0,-1,0));
    assert.equal(ray.intersectObject(field,false).length,0,'the gap contains no gravel surface');
  }
  const stones=scene.getObjectByName('rear-field-gravel-stones'),matrix=new T.Matrix4(),point=new T.Vector3();
  for(let i=0;i<stones.count;i++){
    stones.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
    if(point.z<Y.gravel.transferPadNorth)assert.ok(point.x>Y.gravel.upperWest+.14,'gravel stones respect the setback');
  }
  const ray=new T.Raycaster(new T.Vector3(GYPSUM_SILO_TOWER.x,1,GYPSUM_SILO_TOWER.z),new T.Vector3(0,-1,0));
  assert.ok(ray.intersectObject(field,false).length,'the lower transfer pad remains beneath the tower');
}));
test('rear architecture leaves the production hall and perimeter service lane clear',()=>{
  for(const b of [...Y.buildings,GYPSUM_SILO_TOWER]){
    assert.ok(b.z-b.depth/2>=-10.5,'does not enter the production hall');
    assert.ok(b.z+b.depth/2<=36.5,'at least 3.5 m before the perimeter fence');
    if(b===GYPSUM_SILO_TOWER)assert.ok(b.x-b.width/2>Y.gravel.west,'transfer tower stands on the gravel pad');
    else assert.ok(b.x+b.width/2<Y.gravel.west,'process blocks remain outside the gravel island');
  }
});
test('marked end annex attaches to building 1 and the transfer tower remains across the open passage',()=>fixture(({scene})=>{
  const main=Y.buildings.find(b=>b.name==='rear-south-block'),annex=Y.buildings.find(b=>b.name==='rear-low-annex');
  assert.equal(annex.z-annex.depth/2,main.z+main.depth/2,'2 joins the end of 1');
  assert.equal(annex.x+annex.width/2,main.x+main.width/2,'their east walls align');
  assert.ok(annex.x-annex.width/2<main.x-main.width/2-4,'2 extends to the west');
  const bridge=bounds(scene.getObjectByName('rear-silo-transfer-bridge'));
  assert.ok(bridge.max.x-bridge.min.x>9,'3 is separated from 1 by an actual transfer span');
  assert.ok(Math.abs((bridge.min.z+bridge.max.z)/2-GYPSUM_SILO_TOWER.z)<.001,'straight cross-yard gallery');
  assert.ok(GYPSUM_SILO_TOWER.z+GYPSUM_SILO_TOWER.depth/2<GYPSUM_CORNER_SILO[2]-2.35,'3 stands behind 4 without overlap');
}));
test('rear exterior and raised utilities follow the existing cutaway after batching',()=>fixture(({k,scene,structures,roofs})=>{
  k.optimize();structures.visible=false;roofs.visible=false;
  const visible=[];scene.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
  assert.equal(visible.length,0,'no exterior utilities overlap the illustrative cutaway racks');
  structures.visible=true;roofs.visible=true;scene.traverseVisible(o=>{if(o.isMesh)visible.push(o);});
  assert.ok(visible.length>0,'exterior restores');
}));
