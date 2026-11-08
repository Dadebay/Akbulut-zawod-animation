import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {CEILING_PACK} from './industrial/ceilingPalletizer.js';

test('independent potolok cell stacks, straps and dispatches panels inside the marked area',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(k);production.root.position.set(8,0,-25);
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    const options={preview:true,active,showInterior:true},cell=production.ceilingPalletizing;
    assert.equal(cell.staged.length,1,'a completed pallet occupies the first dispatch slot');
    production.updateMotion(.5,options);
    const before=cell.head.position.clone();
    active.get('GK').status='offline';production.updateMotion(1,options);
    assert.ok(cell.head.position.equals(before),'the ceiling pickup stops with its own line');
    active.get('GK').status='running';active.get('GP').status='offline';
    production.updateMotion(4,options);
    assert.equal(cell.accepted,1,'BEUMER status does not stop the independent potolok packer');
    for(let i=0;i<400&&cell.phase!=='full';i++)production.updateMotion(.2,options);
    assert.equal(cell.phase,'full');
    assert.equal(cell.accepted,CEILING_PACK.sheets);
    assert.equal(cell.staged.length,2);
    scene.updateMatrixWorld(true);
    for(const [i,pack] of cell.staged.entries()){
      const pos=pack.root.getWorldPosition(new T.Vector3());
      assert.ok(Math.abs(pos.x-CEILING_PACK.dispatchX)<1e-6);
      assert.ok(Math.abs(pos.z-CEILING_PACK.slotsZ[i])<1e-6);
      assert.equal(pack.root.userData.panelCount,CEILING_PACK.sheets);
      assert.equal(pack.root.userData.complete,true);
      assert.equal(pack.straps.visible,true);
      assert.ok(Math.abs(new T.Box3().setFromObject(pack.root).min.y-1.18)<.01,'pallet feet ride at the roller contact height');
      for(let n=1;n<pack.layers.length;n++){
        const lower=new T.Box3().setFromObject(pack.layers[n-1]);
        const upper=new T.Box3().setFromObject(pack.layers[n]);
        assert.ok(Math.abs(lower.max.y-upper.min.y)<1e-5,'stacked panels touch without overlap');
      }
    }
  }finally{k.dispose();globalThis.document=previous;}
});
