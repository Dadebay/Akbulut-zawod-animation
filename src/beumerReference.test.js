import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OBB} from 'three/addons/math/OBB.js';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {BEUMER_SECONDARY_FEED} from './industrial/beumerLine.js';
import {localPoint} from './industrial/processPlan.js';

function fixture(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);
    run(production,scene,kit);
  }finally{kit.dispose();globalThis.document=previous;}
}

test('photo-based BEUMER assemblies leave both elevated feed entrances open',()=>fixture((production,scene)=>{
  const root=production.root;
  for(const name of ['beumer-drawer-casing','beumer-open-lift-frame','beumer-pallet-magazine',
    'beumer-empty-pallet-shuttle','beumer-service-platform','beumer-service-stairs',
    'beumer-cabinet-cooler','beumer-film-reel-unit','beumer-safety-light-curtain'])
    assert.ok(root.getObjectByName(name),`${name} is present`);
  scene.updateMatrixWorld(true);
  const housing=root.getObjectByName('beumer-layer-housing'),casing=[],oriented=[];
  const obb=object=>{object.geometry.computeBoundingBox();return new OBB().fromBox3(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);};
  housing.traverse(object=>{if(object.isMesh){casing.push(new T.Box3().setFromObject(object));oriented.push(obb(object));}});
  const bag=production.products.find(product=>product.kind==='bags').object;
  const [start,end]=BEUMER_SECONDARY_FEED.map(point=>new T.Vector3(...point));
  for(let i=0;i<=40;i++){
    const point=end.clone().lerp(start,i*.0025);point.y+=.07;
    bag.position.set(...localPoint(point.toArray()));bag.rotation.y=Math.PI/2;
    const bounds=new T.Box3().setFromObject(bag);
    assert.ok(casing.every(solid=>!solid.intersectsBox(bounds)),'a full bag clears the secondary receiving pocket');
  }
  root.getObjectByName('beumer-secondary-bag-feed').traverse(object=>{
    if(!object.isMesh)return;
    const bounds=obb(object);
    assert.ok(oriented.every(solid=>!solid.intersectsOBB(bounds)),'the secondary belt and walkway clear the open housing');
  });
}));

test('the initial pallet and its bag visibility remain movable after scene optimization',()=>fixture((production,scene,kit)=>{
  const stock=production.bagStock,pack=stock.current;
  kit.optimize({preserveRepeated:true});scene.updateMatrixWorld(true);
  assert.ok(pack.root.matrixAutoUpdate,'render optimization must not freeze the pallet lift');
  assert.ok(pack.bags.every(bag=>!bag.visible),'unfilled bags stay hidden after batching');
  const before=new T.Box3().setFromObject(pack.root,true).min.y;
  for(let i=0;i<8;i++)assert.ok(stock.accept());
  const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
  production.updateMotion(.25,{preview:true,active,showInterior:true});scene.updateMatrixWorld(true);
  const after=new T.Box3().setFromObject(pack.root,true).min.y;
  assert.ok(Math.abs(before-after-.2)<1e-6,'the visible pallet lowers one layer with the lift');
  assert.equal(pack.bags.filter(bag=>bag.visible).length,pack.count);
  const lift=new T.Box3().setFromObject(production.root.getObjectByName('beumer-pallet-lift-deck'),true);
  assert.ok(Math.abs(after-lift.max.y)<.012,'the optimized pallet remains on its moving rollers');
}));

test('the loaded pallet clears the open BEUMER mechanisms and the heads pause with GP',()=>fixture((production,scene)=>{
  const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
  const options={preview:true,active,showInterior:true};
  production.updateMotion(0,options);production.updateMotion(.2,options);
  const heads=['beumer-stacking-head','beumer-layer-pusher','beumer-bag-gantry-carriage','beumer-pallet-lift-deck'].map(name=>production.root.getObjectByName(name));
  const positions=heads.map(head=>head.position.clone());
  active.get('GP').status='offline';production.updateMotion(.4,options);
  heads.forEach((head,index)=>assert.ok(head.position.equals(positions[index]),'the mechanism holds its position when GP stops'));
  active.get('GP').status='running';
  const stock=production.bagStock;
  const pallet=stock.current.root,parts=[];
  const lift=production.root.getObjectByName('beumer-pallet-lift-deck');
  for(let i=0;i<100&&!stock.lowering;i++){
    if(stock.canAccept())stock.accept();
    production.updateMotion(.05,options);
    assert.ok(Math.abs(lift.position.y-pallet.position.y)<1e-8,'the receiving pallet stays attached to its elevated roller lift');
  }
  assert.ok(stock.lowering,'a full pallet descends before it enters the floor conveyor');
  assert.ok(pallet.position.y>1.8,'the load is assembled at the elevated infeed');
  production.root.getObjectByName('beumer-line').traverse(object=>{if(object.isMesh)parts.push(object);});
  let samples=0,previousHeight=pallet.position.y;
  while((stock.moving||stock.lowering)&&samples<500){
    production.updateMotion(.05,options);scene.updateMatrixWorld(true);
    const load=new T.Box3().setFromObject(pallet,true);
    assert.ok(previousHeight-pallet.position.y<=.8*.05+1e-8,'the load lowers at the controlled lift speed');
    previousHeight=pallet.position.y;
    if(stock.lowering){
      const deck=new T.Box3().setFromObject(lift,true);
      assert.ok(Math.abs(load.min.y-deck.max.y)<.012,'the load rides on top of the rollers throughout lowering');
    }
    // Roller contact is intentional; check above the supported pallet bottom.
    load.min.y+=.012;
    for(const object of parts){
      const solid=new T.Box3().setFromObject(object,true);
      if(solid.max.y<=1.19)continue;
      assert.ok(!solid.intersectsBox(load),`${object.parent.name} clears the moving loaded pallet`);
    }
    samples++;
  }
  assert.ok(samples>50&&samples<500,'the same pallet travels through the complete packing cell');
  assert.equal(stock.stocked.at(-1).root,pallet);
}));
