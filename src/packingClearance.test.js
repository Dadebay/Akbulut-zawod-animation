import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {JOURNEY_STAGE as S} from './journey.js';

test('receiver fence clears the supply pallet and both moving product streams',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);scene.updateMatrixWorld(true);
    const station=production.root.getObjectByName('machine-GP');
    assert.ok(new T.Box3().setFromObject(station).max.y<3,'receiver has no four-post portal around the arms');
    const fence=production.root.getObjectByName('GP-receiver-guards'),barriers=[];
    fence.traverse(o=>{if(o.isMesh)barriers.push(new T.Box3().setFromObject(o));});
    const clear=(bounds,label,margin=.12)=>{
      const envelope=bounds.clone().expandByScalar(margin);
      for(const barrier of barriers)assert.equal(envelope.intersectsBox(barrier),false,label);
    };
    const supply=production.root.getObjectByName('ceiling-supply-pallet');
    const feeder=production.root.getObjectByName('ceiling-vacuum-feeder');
    clear(new T.Box3().setFromObject(supply),'supply pallet intersects the wire fence',.2);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    let carried=false,feed=false;
    for(let time=0;time<180;time+=.1){
      production.updateMotion(.1,{preview:true,active,showInterior:true});
      production.root.updateMatrixWorld(true);
      clear(new T.Box3().setFromObject(feeder),'vacuum feed intersects the wire fence');
      for(const product of production.products){
        if(!product.motion||!product.object.visible)continue;
        const box=new T.Box3().setFromObject(product.object);
        clear(box,`${product.kind} intersects the wire fence at ${time.toFixed(1)}s`);
        carried||=Boolean(product.palletizing);feed||=product.kind==='ceiling';
      }
    }
    assert.ok(carried&&feed,'exercise robot handling and the ceiling feed');
    const arms=production.palletizing.arms;
    assert.equal(arms.length,2,'two independent palletizing arms share the receiver');
    for(const arm of arms){
      assert.ok(arm.status.stackCount>0,'each arm fills its own pallet');
      assert.equal(arm.layers.filter(layer=>layer.visible).length,arm.status.stackCount,'each placed sheet has one visible layer');
    }
    assert.equal(production.palletizing.status.stackCount,arms.reduce((sum,arm)=>sum+arm.status.stackCount,0));
  }finally{kit.dispose();globalThis.document=previous;}
});

test('packing chapter shows both pallets filling from arriving boards',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const kit=createKit(new T.Scene(),{tablet:true});
  try{
    const production=buildProduction(kit);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    for(let second=0;second<24;second++)production.updateMotion(1,{preview:false,stage:S.pack,active,showInterior:true});
    assert.ok(production.palletizing.arms.every(arm=>arm.status.stackCount>0));
  }finally{kit.dispose();globalThis.document=previous;}
});

test('both ceiling lines produce every finish and have matching finished stock',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);
    const expected=new Set(['white','green','yellow','metal','plastic']),stock=new Set();
    const seen=new Map(production.ceilingLines.map(({layout})=>[layout.id,new Set()]));
    production.root.traverse(o=>{if(o.userData.panelType&&!o.userData.dynamic)stock.add(o.userData.panelType);});
    assert.deepEqual(stock,expected);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    for(let time=0;time<420;time++){
      production.updateMotion(1,{preview:true,active,showInterior:true});
      for(const p of production.products){
        if(p.kind!=='ceiling'||!p.object.visible||!p.variants.holes.visible)continue;
        seen.get(p.lineId).add(p.object.userData.panelType);
        assert.equal(p.variants.cut.visible,false,'plain and decorated sheets cannot overlap');
        assert.equal(p.variants.finish.variants.filter(g=>g.visible).length,1);
      }
    }
    for(const [id,finishes] of seen)assert.deepEqual(finishes,expected,`${id} makes every ceiling finish`);
  }finally{kit.dispose();globalThis.document=previous;}
});
