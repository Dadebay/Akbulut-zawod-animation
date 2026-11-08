import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {BAG_STOCK} from './industrial/bagStock.js';

test('both BEUMER corner tables have a clear rotating footprint between the straight conveyors',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const turns=[];production.root.traverse(object=>{if(object.name==='beumer-bag-turntable')turns.push(object);});
    assert.equal(turns.length,2);
    const runs=['beumer-roller-conveyor','beumer-bag-outfeed','beumer-bag-north-transfer','beumer-bag-stock-conveyor'];
    for(const turn of turns){
      const centre=turn.getWorldPosition(new T.Vector3());
      const clearance=new T.Box3(new T.Vector3(centre.x-.75,.95,centre.z-.75),new T.Vector3(centre.x+.75,1.25,centre.z+.75));
      for(const name of runs)production.root.getObjectByName(name).traverse(object=>{
        if(object.isMesh)assert.ok(!clearance.intersectsBox(new T.Box3().setFromObject(object)),`${name} must stop outside the rotating table`);
      });
      const deck=turn.getObjectByName('beumer-bag-turntable-deck');
      assert.ok(deck?.userData.dynamic,'each corner has its own moving roller deck');
    }
  }finally{kit.dispose();globalThis.document=previous;}
});

test('BEUMER bags fill a pallet and travel on supported rollers into separate stock',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    const options={preview:true,active,showInterior:true},stock=production.bagStock;
    const pad=new T.Box3().setFromObject(production.root.getObjectByName('beumer-bag-stock-area'));
    const boardStock=new T.Box3().setFromObject(production.root.getObjectByName('board-pallet-stock-area'));
    assert.equal(pad.intersectsBox(boardStock),false,'bag stock has its own bay');
    assert.equal(stock.stocked.length,2,'finished pallets are visible when the factory opens');
    assert.ok(production.root.getObjectByName('beumer-bag-north-transfer'));
    assert.ok(production.root.getObjectByName('beumer-bag-stock-conveyor'));
    production.updateMotion(0,options);
    const decks=[];production.root.traverse(object=>{if(object.name==='beumer-bag-turntable-deck')decks.push(object);});
    const turningCorners=new Set();
    let movingPack,paused=false;
    for(let i=0;i<1250&&stock.stocked.length<3;i++){
      production.updateMotion(.2,options);
      if(stock.moving)stock.moving.motion.turns.forEach((corner,index)=>{
        if(stock.moving.time<=corner.start||stock.moving.time>=corner.start+corner.duration)return;
        assert.ok(Math.abs(decks[index].rotation.y-stock.moving.pack.root.rotation.y)<1e-8,'the pallet rotates with its corner table');
        turningCorners.add(index);
      });
      if(stock.moving&&!paused){
        movingPack=stock.moving.pack;
        const before=movingPack.root.position.clone();
        active.get('GP').status='offline';production.updateMotion(.5,options);
        assert.ok(movingPack.root.position.equals(before),'an offline paletizer stops the same loaded pallet');
        active.get('GP').status='running';paused=true;
      }
    }
    assert.ok(paused,'the completed pallet leaves the BEUMER output');
    assert.equal(turningCorners.size,2,'the same pallet uses both rotating corners');
    assert.equal(stock.stocked.length,3,'the marked stock row fills its last position');
    assert.equal(stock.stocked[2],movingPack,'the same pallet reaches stock');
    assert.equal(stock.accepted,BAG_STOCK.bagsPerPallet,'each arriving bag joins that pallet');
    assert.equal(movingPack.root.userData.bagCount,BAG_STOCK.bagsPerPallet);
    assert.equal(movingPack.root.userData.massKg,BAG_STOCK.bagsPerPallet*25);
    assert.equal(movingPack.wrap.visible,true);
    scene.updateMatrixWorld(true);
    const position=movingPack.root.getWorldPosition(new T.Vector3());
    assert.ok(Math.abs(position.x-BAG_STOCK.slots[2])<1e-6&&Math.abs(position.z-BAG_STOCK.stockZ)<1e-6);
    assert.ok(Math.abs(new T.Box3().setFromObject(movingPack.root).min.y-1.18)<.015,'rollers support the stored pallet');
    const count=stock.accepted;
    for(let i=0;i<25;i++)production.updateMotion(.2,options);
    assert.equal(stock.accepted,count,'a full stock row blocks more incoming bags');
  }finally{kit.dispose();globalThis.document=previous;}
});
