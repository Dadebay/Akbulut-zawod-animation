import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';

test('receiver fence clears the supply pallet and both moving product streams',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);scene.updateMatrixWorld(true);
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
  }finally{kit.dispose();globalThis.document=previous;}
});
