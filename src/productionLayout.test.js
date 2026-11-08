import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OBB} from 'three/addons/math/OBB.js';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {buildMaterialFlow} from './industrial/materialFlow.js';
import {BOARD_START,BOARD_END,BOARD_DRYER,BOARD_ROUTE,BEUMER_LINE,BAG_ROUTE,EMPTY_PRODUCTION_BAY,PROCESS_STATIONS} from './industrial/processPlan.js';
import {BOARD_DUST_FILTER,BOARD_DUST_PICKUP,BOARD_PANEL_ROW,BOARD_PAPER_STANDS,BOARD_SPLICER_DECK} from './industrial/boardLineHall.js';
import {REAR_SERVICE_YARD} from './industrial/rearServiceYard.js';
import {CEILING_PACK} from './industrial/ceilingPalletizer.js';
import {BOARD_PACK} from './industrial/boardPalletizer.js';
import {BEUMER_BAG_FEED} from './industrial/beumerLine.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    buildMaterialFlow(kit,{pallet:(parent,pos)=>kit.group(pos,parent,true)});
    run(production,scene);
  }finally{kit.dispose();globalThis.document=previous;}
}

test('third roof bay remains clear outside the marked potolok packing cell',()=>fixture((production,scene)=>{
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
      for(let p=o;p;p=p.parent)if(p.name==='ceiling-pallet-packaging')return;
      const b=new T.Box3().setFromObject(o);
      if(!empty.intersectsBox(b))return;
      let owner=o;while(owner&&!owner.name)owner=owner.parent;
      collisions.push({name:owner?.name,min:b.min.toArray(),max:b.max.toArray()});
    });
    assert.deepEqual(collisions,[],'only the requested potolok cell uses the railway-side floor');
  }
}));

test('board line loops through the dryer and ends at its own packer beside GP-001',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const dryer=production.root.getObjectByName('machine-GK'),position=dryer.getWorldPosition(new T.Vector3());
  assert.equal(position.z,BOARD_DRYER.z);assert.equal(position.x,BOARD_DRYER.x);
  assert.ok(position.z-2.5>-29.83&&position.z+2.5<BOARD_START[2]-1.3,'dryer clears the wet setting line');
  const box=new T.Box3().setFromObject(production.root.getObjectByName('GK-dryer-box'));
  assert.ok(Math.abs(box.max.x-box.min.x-BOARD_DRYER.length)<.3,'31 m drying box');
  assert.ok(box.max.x<=BOARD_DRYER.entryX+.2&&box.min.x>=BOARD_DRYER.exitX-.2,'dryer mouths match the drying timeline');
  const hall=REAR_SERVICE_YARD.buildings.find(b=>b.controlWindow),glass=hall.controlWindow,cutter=production.root.getObjectByName('board-cutter').getWorldPosition(new T.Vector3());
  assert.ok(BOARD_START[2]-1.9>-20.17&&BOARD_START[2]+1.9<-10.5,'the wet end runs under the south roof');
  assert.ok(BOARD_START[0]<glass.west&&cutter.x>glass.east,'the setting belt passes the control-room glazing');
  assert.ok(glass.west-BOARD_START[0]>12,'an open stretch of setting belt runs in front of the control room');
  assert.equal(cutter.z,BOARD_START[2]);
  for(let i=1;i<BOARD_ROUTE.length;i++){
    const [a,b]=[BOARD_ROUTE[i-1],BOARD_ROUTE[i]];
    assert.ok((a[0]===b[0])!==(a[2]===b[2]),'each leg is straight and axis-aligned');
  }
  assert.ok(BOARD_ROUTE[1][0]>BOARD_DRYER.entryX&&BOARD_ROUTE[3][0]<BOARD_DRYER.exitX,'the westbound leg spans the whole dryer');
  assert.ok(BOARD_END[2]>EMPTY_PRODUCTION_BAY.south,'the board line stays in the occupied bays');
  assert.equal(production.root.getObjectByName('interior-panel-lamination'),undefined,'the obsolete lamination line remains absent');
  const beumer=new T.Box3().setFromObject(production.root.getObjectByName('beumer-line'));
  assert.equal(production.root.getObjectByName('interior-ribbon-mixer'),undefined,'the GR ribbon mixer made way for the BEUMER line');
  const tower=production.root.getObjectByName('beumer-stacker-tower').getWorldPosition(new T.Vector3());
  const gp=PROCESS_STATIONS.find(station=>station.id==='GP');
  assert.ok(Math.abs(tower.x-gp.world[0])<.01&&Math.abs(tower.z-gp.world[2])<.01,'BEUMER stacker stands at GP-001');
  assert.ok(beumer.max.x<BOARD_END[0]-1,'BEUMER ends before the board packer');
  assert.notEqual(BOARD_END[2],BEUMER_LINE.z,'dry boards bypass the BEUMER bag rollers');
  const boardPacker=production.root.getObjectByName('board-packaging-cell');
  assert.ok(boardPacker&&boardPacker.parent.name==='board-finish-line','the board packer is an independent work cell');
  const discharge=production.root.getObjectByName('board-dryer-discharge');
  const rollerBoxes=[];discharge.traverse(object=>{if(object.isMesh)rollerBoxes.push(new T.Box3().setFromObject(object));});
  for(const name of ['beumer-bag-gantry']){
    const gantry=production.root.getObjectByName(name);
    gantry.traverse(object=>{if(object.isMesh){
      const box=new T.Box3().setFromObject(object);
      assert.ok(rollerBoxes.every(roller=>!box.intersectsBox(roller)),`${name} clears the dryer return conveyor`);
    }});
  }
  const feed=production.flows.find(f=>f.material==='slurry');
  assert.ok(feed,'wet preparation remains connected');
  const start=feed.path.getPoint(0).add(production.root.position),end=feed.path.getPoint(1).add(production.root.position);
  assert.ok(start.z>-10.5,'slurry comes from the attached process buildings');
  assert.equal(end.x,BOARD_START[0]);assert.equal(end.z,BOARD_START[2]);
}));

test('the BEUMER feed enters the process tower service deck and carries bags from that opening',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const [source,transfer,stacker]=BAG_ROUTE,high=REAR_SERVICE_YARD.buildings.find(b=>b.name==='process-high-roof-block');
  assert.ok(source[0]>high.x-high.width/2&&source[0]<high.x+high.width/2,'bag source is inside the factory width');
  assert.ok(source[2]>high.z-high.depth/2&&source[2]<high.z+high.depth/2,'bag source enters the factory footprint');
  assert.ok(Math.abs(source[2]+8)<1e-8&&Math.abs(source[1]-6.55)<1e-8,'belt enters at the level-six front service deck');
  assert.deepEqual(BEUMER_BAG_FEED.map(p=>[p[0],p[2]]),BAG_ROUTE.slice(1).map(p=>[p[0],p[2]]),'moving bags follow the exact inclined belt centre line');
  assert.equal(transfer[0],stacker[0],'the long belt stays straight in plan');
  assert.equal(source[2],transfer[2],'a level transverse transfer connects the factory to the straight belt');
  const belt=new T.Box3().setFromObject(production.root.getObjectByName('beumer-bag-feed'));
  const outlet=new T.Box3().setFromObject(production.root.getObjectByName('beumer-factory-bag-outlet'));
  const corner=new T.Box3().setFromObject(production.root.getObjectByName('beumer-bag-transfer-corner'));
  assert.ok(outlet.intersectsBox(corner),'the factory outlet meets the transfer corner');
  assert.ok(belt.intersectsBox(corner),'the inclined belt meets the same transfer corner');
  assert.equal(stacker[0],BEUMER_LINE.west+1.5,'the lower end remains on the GP-001 stacker');
}));

test('BEUMER bags clear the inlet casing and enter fully before the pallet handoff',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const tower=production.root.getObjectByName('beumer-stacker-tower'),solids=[];
  tower.traverse(object=>{if(object.isMesh)solids.push(new T.Box3().setFromObject(object));});
  const bag=production.products.find(product=>product.kind==='bags');
  for(let i=0;i<=80;i++){
    bag.object.rotation.y=bag.motion.pose(bag.motion.duration-2+i/40,bag.object.position);
    const bounds=new T.Box3().setFromObject(bag.object);
    assert.ok(solids.every(solid=>!solid.intersectsBox(bounds)),`bag clears the casing at inlet sample ${i}`);
  }
  const received=new T.Box3().setFromObject(bag.object);
  assert.ok(received.max.z<BEUMER_LINE.z+.8,'the trailing edge passes the front panel before handoff');
  const orientedBounds=object=>{
    object.geometry.computeBoundingBox();
    return new OBB().fromBox3(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
  };
  const casing=[];tower.traverse(object=>{if(object.isMesh)casing.push(orientedBounds(object));});
  production.root.getObjectByName('beumer-bag-feed').traverse(object=>{
    if(!object.isMesh)return;
    const bounds=orientedBounds(object);
    assert.ok(casing.every(solid=>!solid.intersectsOBB(bounds)),'the belt, guides and walkway also clear the casing');
  });
}));

test('potolok packer stays in its marked block and shares a level roller entrance with the board line',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const cell=new T.Box3().setFromObject(production.root.getObjectByName('ceiling-pallet-packaging'));
  assert.ok(cell.min.x>=CEILING_PACK.west-.02&&cell.max.x<=CEILING_PACK.east+.02);
  assert.ok(cell.min.z>=CEILING_PACK.south-.02&&cell.max.z<=CEILING_PACK.north+.02);
  assert.equal(cell.intersectsBox(new T.Box3().setFromObject(production.root.getObjectByName('beumer-line'))),false,'BEUMER remains separate');
  assert.equal(BOARD_PACK.stagingXs[0],CEILING_PACK.feedX+1.25,'whole board pallets travel past the seam onto the potolok feeder');
  assert.equal(BOARD_PACK.stagingZ,CEILING_PACK.z,'both conveyors share a centre line');
  assert.ok(CEILING_PACK.tileFeedX>CEILING_PACK.feedX+1,'potolok sheets enter after the shared pallet merge');
  for(const name of ['board-pallet-wrapper','board-pallet-stock-area']){
    const box=new T.Box3().setFromObject(production.root.getObjectByName(name));
    assert.ok(box.max.x<CEILING_PACK.west,`${name} stays outside the potolok machinery`);
  }
  for(const name of ['ceiling-packaging-pick-frame','ceiling-packaging-lift','ceiling-packaging-wrapper','ceiling-packaging-pallet-slot'])
    assert.ok(production.root.getObjectByName(name),`${name} is present`);
}));

test('liner rolls feed the board former without occupying the former right-hand bay',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  for(const [i,x] of BOARD_PAPER_STANDS.entries()){
    assert.ok(x>-43&&x<BOARD_START[0],'liner roll stands near the board former');
    assert.ok(x>BOARD_SPLICER_DECK.west&&x<BOARD_SPLICER_DECK.east,'splicer deck covers each stand');
    const stand=production.root.getObjectByName(`board-paper-stand-${i+1}`);
    assert.ok(Math.abs(stand.getWorldPosition(new T.Vector3()).x-x)<.01,'stand follows the relocated feed');
  }
}));

test('obsolete GR floor equipment and its marker are absent beside the BEUMER line',()=>fixture(production=>{
  assert.equal(PROCESS_STATIONS.some(station=>station.id==='GR'),false);
  for(const name of ['machine-GR','interior-additive-pan','interior-vibrating-classifier','interior-manual-bag-dump','interior-bulk-bag-filler']){
    assert.equal(production.root.getObjectByName(name),undefined,`${name} is removed`);
  }
  assert.ok(production.root.getObjectByName('beumer-line'),'BEUMER packaging remains');
}));

test('dryer shifts above-left of the relocated filter while its services and conveyors stay clear',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const dryer=new T.Box3().setFromObject(production.root.getObjectByName('GK-dryer-box'));
  const filter=new T.Box3().setFromObject(production.root.getObjectByName('board-dust-filter'));
  const panels=new T.Box3().setFromObject(production.root.getObjectByName('board-electrical-row'));
  const discharge=new T.Box3().setFromObject(production.root.getObjectByName('board-dryer-discharge'));
  const staging=new T.Box3().setFromObject(production.root.getObjectByName('board-packaging-staging'));
  assert.ok(BOARD_DUST_FILTER.x<BOARD_DRYER.x&&BOARD_DUST_FILTER.z<BOARD_DRYER.z,'filter sits to the right and below the dryer in the plan');
  assert.ok(discharge.min.z-filter.max.z>1,'filter and its stair clear the return roller line');
  assert.ok(staging.min.x-filter.max.x>1||filter.min.x-staging.max.x>1,'filter clears the independent board staging area');
  assert.ok(!dryer.intersectsBox(filter),'dryer and filter are separate');
  assert.ok(Math.abs((panels.min.x+panels.max.x)/2-(BOARD_PANEL_ROW.west+BOARD_PANEL_ROW.east)/2)<.01,'electrical row follows the dryer inlet');
  assert.ok(BOARD_DRYER.entryX+BOARD_DRYER.entryApron<BOARD_ROUTE[1][0],'wet approach still joins the inlet');
}));

test('moved filter duct joins the blue return at point 2 and board pallets travel left of point 3',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  assert.ok(BOARD_DUST_FILTER.x>0,'yellow filter platform moves toward the left side of the plan');
  const hood=production.root.getObjectByName('board-dust-pickup-hood');
  const hoodWorld=hood.getWorldPosition(new T.Vector3());
  assert.ok(Math.abs(hoodWorld.x-BOARD_DUST_PICKUP.x)<1e-6&&Math.abs(hoodWorld.z-BOARD_DUST_PICKUP.z)<1e-6);
  const duct=production.root.getObjectByName('board-dust-extraction-duct');
  const points=duct.children.find(o=>o.geometry?.type==='TubeGeometry').geometry.parameters.path.points;
  const end=points.at(-1);
  assert.ok(Math.abs(end.x+8-BOARD_DUST_PICKUP.x)<1e-6&&Math.abs(end.z-25-BOARD_DUST_PICKUP.z)<1e-6,'the long pipe terminates at the pickup hood');
  assert.ok(points.every(p=>p.x+8>BOARD_START[0]+5),'the pipe does not continue toward the BEUMER side');
  assert.ok(BOARD_PACK.stagingXs.every(x=>x>BOARD_END[0]),'finished pallets move left in the reference view');
  assert.ok(BOARD_PACK.stagingXs.every((x,i,a)=>i===0||a[i-1]>x),'farthest slot fills first without crossing occupied pallets');
  const transfer=new T.Box3().setFromObject(production.root.getObjectByName('board-left-transfer'));
  const wrapper=new T.Box3().setFromObject(production.root.getObjectByName('board-pallet-wrapper'));
  assert.ok(wrapper.min.x<BOARD_END[0]&&transfer.min.x<=wrapper.max.x+.01&&transfer.max.x>=CEILING_PACK.feedX-.01,'the wrapper and powered rollers reach the common feeder');
  const feeder=new T.Box3().setFromObject(production.root.getObjectByName('ceiling-packaging-roller-bed'));
  assert.ok(Math.abs(transfer.max.x-feeder.min.x)<.25,'roller ends meet without the photographed floor gap');
  assert.ok(Math.abs(transfer.max.y-feeder.max.y)<.015,'joined rollers support pallets at the same height');
}));

test('first line joins both open dryer mouths at the lowest roller deck',()=>fixture((production,scene)=>{
  scene.updateMatrixWorld(true);
  const dryer=production.root.getObjectByName('machine-GK');
  const entry=production.root.getObjectByName('GK-infeed-roller-decks');
  const exit=production.root.getObjectByName('GK-outfeed-roller-decks');
  const approach=new T.Box3().setFromObject(production.root.getObjectByName('board-dryer-approach'));
  const discharge=new T.Box3().setFromObject(production.root.getObjectByName('board-dryer-discharge'));
  assert.ok(Math.abs(approach.min.x-(BOARD_DRYER.entryX+BOARD_DRYER.entryApron))<.01,'line meets the entry roller frame');
  assert.ok(Math.abs(discharge.max.x-(BOARD_DRYER.exitX-BOARD_DRYER.exitApron))<.01,'line resumes at the exit roller frame');
  for(const frame of [entry,exit]){
    const tops=[];
    frame.traverse(o=>{
      const p=o.geometry?.parameters;
      if(o.isMesh&&p?.height>3.9&&p?.height<4.1&&Math.abs(p?.radiusTop-.035)<.001)
        tops.push(o.getWorldPosition(new T.Vector3()).y+p.radiusTop);
    });
    assert.ok(tops.length>0,'each mouth has visible deck rollers');
    assert.ok(Math.abs(Math.min(...tops)-BOARD_ROUTE[2][1])<.01,'lowest rollers support the same board height as the line');
  }
  for(const [x,direction] of [[BOARD_DRYER.entryX+.75,-1],[BOARD_DRYER.exitX-.75,1]]){
    const ray=new T.Raycaster(new T.Vector3(x,1.3,BOARD_DRYER.z),new T.Vector3(direction,0,0),0,1.5);
    assert.equal(ray.intersectObject(dryer,true).length,0,'dryer mouth stays open along the board path');
  }
}));

test('all five dryer decks merge onto the single blue discharge line',()=>fixture((production)=>{
  const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
  const options={preview:true,active,showInterior:true},inside=new Set(),discharged=new Set();
  const base=BOARD_ROUTE[2][1],outlet=BOARD_DRYER.exitX-BOARD_DRYER.exitApron;
  for(let step=0;step<90;step++){
    production.updateMotion(step===0?0:.5,options);
    for(const p of production.products){
      if(p.kind!=='panel'||!p.object.visible||Math.abs(p.object.position.z-25-BOARD_DRYER.z)>.01)continue;
      const x=p.object.position.x+8;
      if(x>BOARD_DRYER.exitX+2&&x<BOARD_DRYER.entryX-2){
        inside.add(p.deckIndex);
        assert.ok(Math.abs(p.object.position.y-(base+p.deckIndex*BOARD_DRYER.deckPitch))<.01,'board rides its assigned dryer deck');
      }
      // The complete 2.4 m sheet must leave the curved rollers before it
      // becomes level on the common discharge conveyor.
      if(x<outlet-1.25&&x>outlet-5){
        discharged.add(p.deckIndex);
        assert.ok(Math.abs(p.object.position.y-base)<.01,'each deck lands on the same blue belt');
      }
    }
  }
  assert.deepEqual([...inside].sort(),[0,1,2,3,4]);
  assert.deepEqual([...discharged].sort(),[0,1,2,3,4]);
}));
