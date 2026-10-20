import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildOldCampusInterior,OLD_CEILING_LINE} from './industrial/oldCampusInterior.js';
import {OLD_SECOND_CEILING_LINE} from './industrial/oldSecondCeilingLine.js';
import {OLD_LEFT_CAMPUS,OLD_RAIL_DORMITORY} from './industrial/siteLayout.js';
import {OLD_HALL_WALKS,oldForkMotion} from './industrial/campusLife.js';
import {forkliftFootprint} from './industrial/forkliftMotion.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  // Conservative envelope of logistics.pallet, including its bindings/deck.
  const pallet=(parent,position)=>{
    const g=k.group(position,parent);k.box(1.3,1,1.1,[0,.5,0],k.m.paper,g);return g;
  };
  try{run(buildOldCampusInterior(k,pallet),scene,k);}finally{k.dispose();globalThis.document=previous;}
}
const rectangle=b=>[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]];
function overlap(a,b){
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){
    const next=polygon[(i+1)%polygon.length],n=[polygon[i][1]-next[1],next[0]-polygon[i][0]];
    const aa=a.map(p=>p[0]*n[0]+p[1]*n[1]),bb=b.map(p=>p[0]*n[0]+p[1]*n[1]);
    if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;
  }return true;
}

test('old hangar stock stays within its walls and leaves the aisle and loading doors open',()=>fixture(interior=>{
  const h=OLD_LEFT_CAMPUS.warehouse,stock=interior.stock.filter(p=>p.parent===interior.warehouse);
  assert.ok(stock.length>=20);
  for(const load of stock){
    const b=new T.Box3().setFromObject(load);
    assert.ok(b.min.x>h.x-h.width/2+.3&&b.max.x<h.x+h.width/2-.3);
    assert.ok(b.min.z>h.z-h.depth/2+.3&&b.max.z<h.z+h.depth/2-.3);
    assert.ok(b.max.z<h.z-2.5||b.min.z>h.z+2.5,'5 m centre aisle');
    for(const x of [4,24,49])assert.equal(overlap(rectangle(b),[[x-2.5,h.z],[x+2.5,h.z],[x+2.5,-131],[x-2.5,-131]]),false,'loading door access');
  }
}));

test('old ceiling products remain supported and separated across repeated cutting/press cycles',()=>fixture(interior=>{
  const line=OLD_CEILING_LINE;let sawBlank=false,sawCut=false,sawHoles=false;
  const beds=interior.supports.map(g=>new T.Box3().setFromObject(g));
  const supported=(x,z)=>beds.some(b=>x>=b.min.x-.05&&x<=b.max.x+.05&&z>=b.min.z-.05&&z<=b.max.z+.05)||
    [[64,-108.5],[64,-96]].some(([cx,cz])=>Math.hypot(x-cx,z-cz)<=1.44);
  let sawReturn=false;
  for(let time=0;time<180;time+=.1){
    interior.update(time);
    const products=interior.products.filter(p=>p.object.visible).sort((a,b)=>a.object.position.x-b.object.position.x);
    for(let i=0;i<products.length;i++){
      const p=products[i],pos=p.object.position;
      assert.equal(pos.y,line.top);
      // Check all four sheet corners through both rotating transfers, not just
      // its centre or an assumed straight path.
      for(const x of [-.66,.66])for(const z of [-.66,.66]){
        const a=p.object.rotation.y;
        assert.ok(supported(pos.x+x*Math.cos(a)+z*Math.sin(a),pos.z-x*Math.sin(a)+z*Math.cos(a)),'sheet corner is supported');
      }
      for(let j=0;j<i;j++)assert.ok(pos.distanceTo(products[j].object.position)>1.5,'sheets cannot overlap while tools dwell');
      sawReturn||=pos.z>-97&&pos.x<62;
      sawBlank||=p.blank.visible;sawCut||=p.cut.visible;sawHoles||=p.cut.visible&&p.holes.visible;
    }
  }
  assert.ok(sawBlank&&sawCut&&sawHoles&&sawReturn);
}));

test('reference details fit the old hall and leave its loading entrance open',()=>fixture((interior,scene)=>{
  scene.updateMatrixWorld(true);
  let meshes=0;
  interior.details.traverse(o=>{
    if(!o.isMesh)return;meshes++;
    const b=new T.Box3().setFromObject(o);
    assert.ok(b.min.x>=-6&&b.max.x<=68&&b.min.z>=-116.5&&b.max.z<=-88,'old hall envelope');
    if(b.max.y>6.2)assert.ok(b.min.x>=46&&b.max.x<=62&&b.min.z>=-112&&b.max.z<=-100,'tall parts fit raised annex');
    if(b.min.y<5&&b.max.y>.25){
      assert.equal(overlap(rectangle(b),[[37.8,-99],[50.2,-99],[50.2,-87],[37.8,-87]]),false,'loading entrance');
    }
  });
  assert.ok(meshes>150,'photo-inspired detail is present');
}));

test('old hall pedestrian paths and forklift sweep clear the added machinery and stock',()=>fixture((interior,scene)=>{
  scene.updateMatrixWorld(true);const obstacles=[];
  interior.root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const b=new T.Box3().setFromObject(mesh);
    if(b.max.y>.25&&b.min.y<2.3)obstacles.push(rectangle(b));
  });
  for(const {bounds:[x0,x1,z0,z1]} of OLD_HALL_WALKS){
    const body=[[x0-.45,z0-.45],[x1+.45,z0-.45],[x1+.45,z1+.45],[x0-.45,z1+.45]];
    for(const obstacle of obstacles)assert.equal(overlap(body,obstacle),false,'pedestrian aisle');
  }
  const fork=oldForkMotion();
  for(let time=0;time<180;time+=.2){
    const body=forkliftFootprint(fork(time),.3);
    for(const obstacle of obstacles)assert.equal(overlap(body,obstacle),false,`forklift aisle at ${time}`);
  }
}));

test('second production line fits beside the first with supported, separated sheets and a clear loading entrance',()=>fixture((interior,scene)=>{
  const {secondLine}=interior,{start,end,z,top}=OLD_SECOND_CEILING_LINE;
  scene.updateMatrixWorld(true);
  secondLine.root.traverse(o=>{
    if(!o.isMesh)return;
    const b=new T.Box3().setFromObject(o);
    assert.ok(b.min.x>=-6&&b.max.x<37.8&&b.min.z>-107&&b.max.z<-95.2,'second line stays in its own bay');
    assert.ok(b.max.y<6.2,'below the existing roof');
    if(b.min.y<5&&b.max.y>.25)
      assert.equal(overlap(rectangle(b),[[37.8,-99],[50.2,-99],[50.2,-87],[37.8,-87]]),false,'loading entrance');
  });
  const beds=secondLine.supports.map(o=>new T.Box3().setFromObject(o));
  const supported=(x,zz)=>beds.some(b=>x>=b.min.x-.05&&x<=b.max.x+.05&&zz>=b.min.z&&zz<=b.max.z)||
    (Math.abs(x-start)<=.67&&Math.abs(zz-z)<=.67)||(Math.abs(x-end)<=.925&&Math.abs(zz-z)<=.9);
  let blank=false,finished=false;
  for(let time=0;time<140;time+=.1){
    interior.update(time);
    const visible=secondLine.products.filter(p=>p.object.visible);
    for(const [i,p] of visible.entries()){
      const pos=p.object.position;assert.equal(pos.y,top);
      for(const dx of [-.66,.66])for(const dz of [-.66,.66])
        assert.ok(supported(pos.x+dx,pos.z+dz),'each sheet corner stays over a bed or pallet');
      for(let j=0;j<i;j++)assert.ok(pos.distanceTo(visible[j].object.position)>1.5,'sheets cannot overlap at tool stops');
      blank||=p.blank.visible;finished||=p.finish.root.visible;
    }
  }
  assert.ok(blank&&finished,'second line changes raw blanks into finished panels');
}));

test('second line keeps all five finishes through lowering, stacking and packing after batching',()=>fixture((interior,scene,k)=>{
  const line=interior.secondLine,{end,z,top}=OLD_SECOND_CEILING_LINE;
  poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
  const world=o=>o.getWorldPosition(new T.Vector3());
  for(const [batch,type] of ['white','green','yellow','metal','plastic'].entries()){
    const arrival=batch*70-3.5;
    interior.update(arrival-.0001);refresh();
    const sheet=line.products.find(p=>p.object.visible&&p.object.position.distanceTo(new T.Vector3(end,top,z))<.001);
    assert.ok(sheet,'last conveyor sheet reaches the lift table');
    assert.equal(sheet.object.userData.panelType,type);
    interior.update(arrival);refresh();
    assert.equal(line.receiver.userData.panelType,type);
    assert.ok(world(line.layers[0].root).distanceTo(new T.Vector3(end,top,z))<.001,'no drop at conveyor handoff');
    interior.update(arrival+63.7999);refresh();
    const before=world(line.receiver);
    interior.update(arrival+63.8);refresh();
    assert.equal(line.receiver.visible,false,'completed lot leaves the lift table');
    assert.ok(before.distanceTo(world(line.outbound))<.001,'no jump from stacker onto packing rollers');
    assert.equal(line.outbound.userData.panelType,type);
    interior.update(arrival+67.0);refresh();
    assert.equal(line.straps.visible,true,'lot is strapped before dispatch');
  }
}));

test('finishing equipment fits the hall and leaves its loading opening clear',()=>fixture((interior,scene)=>{
  scene.updateMatrixWorld(true);
  interior.finishing.root.traverse(o=>{
    if(!o.isMesh)return;
    const b=new T.Box3().setFromObject(o);
    assert.ok(b.min.x>=-6&&b.max.x<=68&&b.min.z>=-116.5&&b.max.z<=-87.5,`${o.parent.name}: hall envelope`);
    assert.ok(b.max.y<6.2,'equipment stays below the roof');
    if(b.min.y<5&&b.max.y>.25)
      assert.equal(overlap(rectangle(b),[[37.8,-99],[50.2,-99],[50.2,-87],[37.8,-87]]),false,'loading opening');
  });
  // The feeder crosses the operator walkway only with its panel lifted.
  for(let time=0;time<14;time+=.05){
    interior.update(time);scene.updateMatrixWorld(true);
    for(const payload of interior.finishing.payloads){
      if(!payload.visible)continue;
      const b=new T.Box3().setFromObject(payload);
      for(const {bounds:[x0,x1,z0,z1]} of OLD_HALL_WALKS){
        if(overlap(rectangle(b),[[x0-.45,z0-.45],[x1+.45,z0-.45],[x1+.45,z1+.45],[x0-.45,z1+.45]]))
          assert.ok(b.min.y>2.5,'carried sheets clear operators');
      }
    }
  }
}));

test('panels transfer from the return rollers onto a visible stack and then through packing',()=>fixture((interior,scene)=>{
  const {stacker,layers,receiver,outbound,straps}=interior.finishing;
  const world=o=>o.getWorldPosition(new T.Vector3());
  interior.update(6.9999);scene.updateMatrixWorld(true);
  const lastSheet=interior.products.find(p=>p.object.visible&&p.object.position.distanceTo(new T.Vector3(57,1.18,-96))<.001);
  assert.ok(lastSheet,'return conveyor reaches the pickup point');
  const pickup=world(lastSheet.object);
  interior.update(7);scene.updateMatrixWorld(true);
  assert.ok(world(stacker.payload).distanceTo(pickup)<.001,'no jump at pickup');
  interior.update(10.1999);scene.updateMatrixWorld(true);
  const before=world(stacker.payload);
  interior.update(10.2);scene.updateMatrixWorld(true);
  assert.equal(stacker.payload.visible,false);
  assert.equal(layers.filter(o=>o.visible).length,2);
  assert.ok(before.distanceTo(world(layers[1]))<.001,'carried sheet lands on the pallet');
  interior.update(66.2);
  assert.equal(receiver.visible,false,'completed batch leaves the stacking bay');
  assert.ok(Math.abs(outbound.position.x-57)<.001);
  interior.update(72.2);
  assert.equal(receiver.visible,true,'empty pallet receives the next batch');
  assert.ok(Math.abs(outbound.position.x-63.2)<.001,'batch stops inside the strapping arch');
  assert.equal(straps.visible,false);
  interior.update(73.3);assert.equal(straps.visible,true);
  interior.update(78);assert.equal(outbound.position.x,66,'packed panels reach dispatch');
}));

test('pickup, stacking and packing remain animated after batching and freeze on pause',()=>fixture((interior,scene,k)=>{
  poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
  const visibleCount=()=>{
    let count=0;scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++)count+=o.getVisibleAt(i)?1:0;});return count;
  };
  interior.update(3.1);refresh();const before=visibleCount();
  interior.update(3.3);refresh();
  assert.notEqual(visibleCount(),before,'sheet ownership changes remain visible after batching');
  const transforms=()=>{
    const result=[];interior.root.traverse(o=>{if(o.userData.dynamic)result.push([...o.position,...o.quaternion,...o.scale,o.visible]);});return result;
  };
  const paused=transforms();interior.update(3.3);refresh();
  assert.deepEqual(transforms(),paused,'zero time change freezes all machinery and pallets');
}));

test('all ceiling finishes stay with their ten-sheet lot from conveyor through packing after batching',()=>fixture((interior,scene,k)=>{
  poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
  const types=['white','green','yellow','metal','plastic'];
  for(const [batch,type] of types.entries()){
    const pickupTime=batch*70;
    interior.update(pickupTime-.0001);refresh();
    const sheet=interior.products.find(p=>p.object.visible&&p.object.position.distanceTo(new T.Vector3(57,1.18,-96))<.001);
    assert.ok(sheet,'a sheet reaches the stacker');
    assert.equal(sheet.object.userData.panelType,type,'conveyor lot');
    interior.update(pickupTime);refresh();
    assert.equal(interior.finishing.stacker.payload.userData.panelType,type,'vacuum pickup keeps finish');
    interior.update(pickupTime+3.2);refresh();
    assert.equal(interior.finishing.layers[0].userData.panelType,type,'receiving stack keeps finish');
    interior.update(pickupTime+66.2);refresh();
    assert.equal(interior.finishing.outbound.userData.panelType,type,'packed lot keeps finish');
    const selected=sheet.finish.variants.filter(g=>g.visible);
    assert.equal(selected.length,1,'one surface variant remains visible after batching');
  }
}));

test('railway dormitory has four twin rooms with clear doors and a shared corridor',()=>fixture(({dormitory},scene)=>{
  scene.updateMatrixWorld(true);
  const h=OLD_RAIL_DORMITORY,{corridor}=dormitory;
  assert.equal(dormitory.rooms.length,4);
  const corridorBody=[[h.x+corridor.west+.08,h.z+corridor.north+.08],[h.x+corridor.east-.08,h.z+corridor.north+.08],
    [h.x+corridor.east-.08,h.z+corridor.south-.08],[h.x+corridor.west+.08,h.z+corridor.south-.08]];
  for(const room of dormitory.rooms){
    assert.equal(room.beds.length,2);assert.equal(room.root.userData.capacity,2);
    const [west,east,north,south]=room.bounds;
    const furniture=[...room.beds,room.wardrobe,room.desk,room.door].map(g=>new T.Box3().setFromObject(g));
    furniture.forEach((b,i)=>{
      assert.ok(b.min.x>h.x+west&&b.max.x<h.x+east,'furniture stays in its own room');
      assert.ok(b.min.z>=h.z+north-.03&&b.max.z<h.z+south,'furniture stays behind its doorway');
      for(let j=0;j<i;j++)assert.equal(b.intersectsBox(furniture[j]),false,'beds and furniture do not intersect');
    });
    const [x,z]=room.entry;
    const doorway=[[h.x+x-.40,h.z+z-.1],[h.x+x+.40,h.z+z-.1],[h.x+x+.40,h.z+z+.9],[h.x+x-.40,h.z+z+.9]];
    for(const b of furniture)assert.equal(overlap(rectangle(b),doorway),false,'open door passage');
  }
  dormitory.root.traverse(o=>{
    if(!o.isMesh)return;
    const b=new T.Box3().setFromObject(o);
    if(b.max.y>.2&&b.min.y<2.1)assert.equal(overlap(rectangle(b),corridorBody),false,'shared corridor stays clear');
  });
}));

test('warehouse panel cells and coloured stocks fit the hangar and keep five metres of aisle',()=>fixture(({warehousePanels},scene)=>{
  scene.updateMatrixWorld(true);const h=OLD_LEFT_CAMPUS.warehouse;
  assert.deepEqual(new Set(warehousePanels.stock.map(p=>p.userData.panelType)),new Set(['green','yellow','metal','plastic']));
  assert.equal(warehousePanels.cells.length,4);
  warehousePanels.root.traverse(o=>{
    if(!o.isMesh)return;
    const b=new T.Box3().setFromObject(o);
    assert.ok(b.min.x>h.x-h.width/2+.3&&b.max.x<h.x+h.width/2-.3,'equipment inside end walls');
    assert.ok(b.min.z>h.z-h.depth/2+.3&&b.max.z<h.z-2.5,'equipment clears centre aisle');
    assert.ok(b.max.y<h.height,'equipment below roof');
  });
  const seen=new Set();
  for(let t=0;t<56;t+=.13){
    warehousePanels.update(t);
    for(const cell of warehousePanels.cells){
      const visible=cell.products.filter(p=>p.object.visible);
      for(let i=0;i<visible.length;i++){
        const p=visible[i];assert.equal(p.object.position.y,warehousePanels.top);
        if(p.finished.visible)seen.add(p.type);
        for(let j=0;j<i;j++)assert.ok(p.object.position.distanceTo(visible[j].object.position)>1,'panels stay separated at presses');
      }
      assert.ok(cell.outbound.position.x>=cell.end&&cell.outbound.position.x<=cell.end+2.2);
    }
  }
  assert.equal(seen.size,4,'all four finished panel types are visible');
}));
