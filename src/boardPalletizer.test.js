import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {BOARD_END,BEUMER_LINE} from './industrial/processPlan.js';
import {BOARD_PACK} from './industrial/boardPalletizer.js';
import {CEILING_PACK} from './industrial/ceilingPalletizer.js';

test('optimized board loading keeps the visible lift under the pallet and aligns each arriving sheet',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    const cell=production.palletizing,pack=cell.current;
    const lift=production.root.getObjectByName('board-packaging-lift-platform');
    kit.optimize({preserveRepeated:true});
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    const options={preview:true,active,showInterior:true};
    production.updateMotion(0,options);
    assert.equal(pack.layers.filter(layer=>layer.visible).length,1,'only the arriving sheet is visible');
    assert.equal(pack.layers[0].rotation.y,Math.PI/2,'the handoff preserves the incoming sheet orientation');
    const initialHeight=pack.layers[0].getWorldPosition(new T.Vector3()).y;
    production.updateMotion(.6,options);scene.updateMatrixWorld(true);
    assert.ok(pack.layers[0].rotation.y>0&&pack.layers[0].rotation.y<Math.PI/2,'alignment happens gradually');
    assert.ok(pack.layers[0].getWorldPosition(new T.Vector3()).y<initialHeight,'the rendered sheet settles onto the pallet');
    let lowered=false;
    for(let i=0;i<1200&&cell.phase!=='strapping';i++){
      production.updateMotion(.05,options);scene.updateMatrixWorld(true);
      const deck=new T.Box3().setFromObject(lift,true),load=new T.Box3().setFromObject(pack.root,true);
      assert.ok(Math.abs(load.min.y-deck.max.y)<1e-6,'the rendered lift follows the pallet throughout filling');
      lowered||=pack.root.position.y<-.02;
      assert.equal(pack.layers.filter(layer=>layer.visible).length,pack.count+(cell.phase==='placing'?1:0));
    }
    assert.ok(lowered);assert.equal(pack.count,BOARD_PACK.sheets);assert.equal(cell.phase,'strapping');
    for(let i=1;i<pack.layers.length;i++){
      const below=new T.Box3().setFromObject(pack.layers[i-1],true),above=new T.Box3().setFromObject(pack.layers[i],true);
      assert.ok(Math.abs(above.min.y-below.max.y)<1e-6,'the rendered sheets touch without intersecting');
    }
    assert.equal(pack.straps.visible,false);assert.equal(pack.film.visible,false);
    production.updateMotion(BOARD_PACK.strapSeconds,options);
    assert.equal(pack.straps.visible,true,'straps appear only after the pallet is full');
  }finally{kit.dispose();globalThis.document=previous;}
});

test('the board wrapper joins both conveyor centre lines without overlapping rollers or a cabinet in the path',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const object=name=>production.root.getObjectByName(name),bounds=name=>new T.Box3().setFromObject(object(name));
    const centre=object('board-pallet-wrapper').getWorldPosition(new T.Vector3());
    assert.equal(centre.x,BOARD_END[0],'the receiving conveyor enters the centre of the turntable');
    assert.equal(centre.z,BOARD_PACK.stagingZ,'the outgoing conveyor shares the turntable centre line');
    const wrapper=bounds('board-pallet-wrapper'),side=bounds('board-side-transfer'),cross=bounds('board-left-transfer');
    assert.ok(side.min.z>=wrapper.max.z-.001&&side.min.z-wrapper.max.z<.1,'the incoming rollers end at the table edge');
    assert.ok(cross.min.x>=wrapper.max.x-.001&&cross.min.x-wrapper.max.x<.1,'the outgoing rollers start at the table edge');
    const cabinet=bounds('board-packaging-drive-cabinet');
    assert.ok(!cabinet.intersectsBox(side)&&!cabinet.intersectsBox(cross),'the blue cabinet stands outside the transport route');
    const dispenser=bounds('board-wrapper-portal');
    assert.ok(dispenser.max.x<centre.x-.7,'the dispenser stands beside the unused edge, clear of the entry');
    const [x,,z]=BOARD_END;
    const pocket=new T.Box3(new T.Vector3(x-1.36,.68,z-1.36),new T.Vector3(x+1.36,1.38,z+1.36));
    production.root.traverse(part=>{
      if(!part.isMesh)return;
      for(let owner=part;owner&&owner!==production.root;owner=owner.parent)if(owner.userData.dynamic)return;
      assert.ok(!pocket.intersectsBox(new T.Box3().setFromObject(part)),'fixed rollers and hood legs stay outside the moving lift pocket');
    });
  }finally{kit.dispose();globalThis.document=previous;}
});

test('dry boards are wrapped, carried as the same pallets and lined up in stock',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    const options={preview:true,active,showInterior:true},cell=production.palletizing;
    const forklift=production.root.getObjectByName('board-pallet-forklift-model');
    assert.ok(forklift&&forklift.getObjectByName('board-carrier-forks'),'the stock carrier uses the shared forklift model');
    production.updateMotion(0,options);
    assert.equal(cell.accepted,1,'the first dry board reaches the receiver');
    assert.equal(cell.phase,'placing');
    assert.equal(production.root.getObjectByName('board-packaging-gantry'),undefined,'the marked overhead frame has been removed');
    production.updateMotion(.3,options);
    const sheet=cell.current.layers[0],pausedSheet=sheet.position.clone(),pausedYaw=sheet.rotation.y;
    const pausedBoard=production.products.find(p=>p.kind==='panel'&&p.object.visible).object.position.clone();
    active.get('GP').status='offline';production.updateMotion(.6,options);
    assert.ok(sheet.position.equals(pausedSheet)&&sheet.rotation.y===pausedYaw,'sheet placement holds when packaging is offline');
    assert.equal(production.products.find(p=>p.kind==='panel'&&p.object.visible).object.position.distanceTo(pausedBoard),0,'board conveyor stops with the receiver');
    active.get('GP').status='running';
    let firstCarried,firstAtJoint,pausedCarrier=false,facesWest=false,facesEast=false;
    for(let i=0;i<2400&&cell.stocked.length<3;i++){
      production.updateMotion(.1,options);
      if(cell.carrierPhase==='travel'&&Math.abs(forklift.rotation.y+Math.PI)<1e-8)facesWest=true;
      if(cell.carrierPhase==='return'&&Math.abs(forklift.rotation.y)<1e-8)facesEast=true;
      if(cell.staged.length&&!firstAtJoint){
        firstAtJoint=cell.staged[0];scene.updateMatrixWorld(true);
        const pos=firstAtJoint.root.getWorldPosition(new T.Vector3());
        assert.ok(Math.abs(pos.x-(CEILING_PACK.feedX+1.25))<1e-6&&Math.abs(pos.z-CEILING_PACK.z)<1e-6,'the whole board package crosses onto the joined potolok feeder');
        assert.ok(Math.abs(new T.Box3().setFromObject(firstAtJoint.root).min.y-1.178)<.015,'joined rollers support the package without a height jump');
      }
      if(cell.carried&&!firstCarried)firstCarried=cell.carried;
      if(cell.carried&&!pausedCarrier){
        const vehicle=cell.carrier.position.clone(),load=cell.carried.root.getWorldPosition(new T.Vector3());
        active.get('GP').status='offline';production.updateMotion(.5,options);
        assert.ok(cell.carrier.position.equals(vehicle),'carrier stops with the packaging line');
        assert.ok(cell.carried.root.getWorldPosition(new T.Vector3()).equals(load),'the lifted pallet does not slide during a stop');
        active.get('GP').status='running';pausedCarrier=true;
      }
    }
    assert.equal(cell.stocked.length,3,'the carrier fills all three marked stock pads');
    assert.ok(facesWest&&facesEast,'forklift faces its travel direction instead of sliding sideways');
    assert.equal(firstAtJoint,firstCarried,'the same package travels across the join and onto the carrier');
    assert.equal(cell.accepted,3*BOARD_PACK.sheets,'each accepted board belongs to one package');
    assert.equal(cell.stocked[0],firstCarried,'the carrier deposits the exact pallet it picked up');
    scene.updateMatrixWorld(true);
    for(const [i,pack] of cell.stocked.entries()){
      const pos=pack.root.getWorldPosition(new T.Vector3());
      assert.ok(Math.abs(pos.x-BOARD_PACK.stockXs[i])<1e-6&&Math.abs(pos.z-BOARD_PACK.stockZ)<1e-6,'package reaches the stock row');
      assert.equal(pack.root.userData.boardCount,BOARD_PACK.sheets);
      assert.ok(pack.root.userData.massKg>0&&pack.root.userData.massKg<=BOARD_PACK.maxKg,'lift load is bounded');
      assert.equal(pack.straps.visible,true,'complete package is strapped');
      assert.equal(pack.film.visible,true,'the photographed wrapper adds stretch film');
      assert.equal(pack.root.userData.wrapped,true);
      assert.ok(Math.abs(new T.Box3().setFromObject(pack.root).min.y-.18)<.015,'stock pad supports the pallet above floor');
      for(let n=1;n<pack.layers.length;n++){
        const below=new T.Box3().setFromObject(pack.layers[n-1]),above=new T.Box3().setFromObject(pack.layers[n]);
        assert.ok(Math.abs(above.min.y-below.max.y)<1e-5,'sheets are stacked in contact without overlap');
      }
    }
    assert.notEqual(BOARD_END[2],BEUMER_LINE.z,'boards finish outside the BEUMER bag line');
    const accepted=cell.accepted,parked=production.products.filter(p=>p.kind==='panel'&&p.object.visible).map(p=>p.object.position.clone());
    for(let i=0;i<30;i++)production.updateMotion(.1,options);
    assert.equal(cell.accepted,accepted,'full staging blocks additional packages');
    production.products.filter(p=>p.kind==='panel'&&p.object.visible).forEach((p,i)=>assert.ok(p.object.position.distanceTo(parked[i])<1e-8,'upstream boards wait on rollers'));
  }finally{kit.dispose();globalThis.document=previous;}
});
