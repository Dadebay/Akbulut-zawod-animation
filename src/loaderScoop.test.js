import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildRawInfeed} from './industrial/rawInfeed.js';
import {LOADER_STOCK} from './industrial/siteLayout.js';
import {JOURNEY_STEPS,JOURNEY_STAGE as S,journeyAt} from './journey.js';

test('loader takes a shallow bite with its bucket while the wheels stay outside the pile',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const infeed=buildRawInfeed(kit),{loader}=infeed;
    const stock=scene.children.find(o=>o.isGroup&&o.position.x===LOADER_STOCK[0]&&o.position.z===LOADER_STOCK[2]);
    const original=stock.children.filter(o=>o.isInstancedMesh).map(field=>({field,matrices:field.instanceMatrix.array.slice()}));
    scene.updateMatrixWorld(true);
    const edge=new T.Box3().setFromObject(stock).max.x,step=JOURNEY_STEPS[S.scoop];
    let touched=false;
    for(let i=0;i<=180;i++){
      const p=i/180,j=journeyAt(step.start+p*(step.duration-.0001));infeed.update(j);scene.updateMatrixWorld(true);
      const bucket=new T.Box3().setFromObject(loader.bucket);
      assert.ok(bucket.min.x>=edge-.9,`bucket buries ${(edge-bucket.min.x).toFixed(2)} m at ${p}`);
      assert.ok(bucket.min.y>=.02,`bucket digs into pavement at ${p}`);
      for(const wheel of loader.wheels)assert.ok(new T.Box3().setFromObject(wheel).min.x>edge+.5,'front tyre enters stockpile');
      if(loader.cargo.visible)assert.ok(bucket.min.x<edge,'load only appears after the cutting edge reaches material');
      if(bucket.min.x<edge)touched=true;
    }
    assert.ok(touched,'bucket must reach the stock, not stop in mid-air');
    const position=loader.g.position.clone(),lip=loader.lip.getWorldPosition(new T.Vector3());
    infeed.update(journeyAt(JOURNEY_STEPS[S.carry].start));scene.updateMatrixWorld(true);
    assert.ok(loader.g.position.distanceTo(position)<.001,'no position jump into carry');
    assert.ok(loader.lip.getWorldPosition(new T.Vector3()).distanceTo(lip)<.001,'no bucket jump into carry');
    assert.equal(stock.scale.y,1,'the whole heap must not sink during scooping');
    let changed=0,total=0;
    for(const {field,matrices} of original)for(let i=0;i<field.count;i++){
      total++;
      const before=matrices.slice(i*16,i*16+16),after=field.instanceMatrix.array.slice(i*16,i*16+16);
      if(before.some((v,j)=>Math.abs(v-after[j])>1e-6)){
        changed++;
        assert.ok(before[12]>3&&Math.abs(before[14])<2,'only the bucket-facing mouth loses material');
      }
    }
    assert.ok(changed>0&&changed<total*.1,'a small local bite is removed');
    infeed.update(journeyAt(step.start));
    for(const {field,matrices} of original)assert.deepEqual(field.instanceMatrix.array,matrices,'tour rewind restores stock');
  }finally{kit.dispose();globalThis.document=previous;}
});
