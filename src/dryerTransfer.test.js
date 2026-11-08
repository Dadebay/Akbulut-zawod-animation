import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {BOARD_DRYER,BOARD_ROUTE} from './industrial/processPlan.js';
import {dryerTransferRuns,dryerRampProfile} from './industrial/dryerTransfer.js';

test('five curved branches physically meet the same floor line and carry every deck through the merge',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),kit=createKit(scene,{tablet:true});
  try{
    const production=buildProduction(kit);production.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const D=BOARD_DRYER,base=BOARD_ROUTE[2][1];
    const transfers=dryerTransferRuns().map(run=>({...run,seen:new Set(),tongues:Array.from({length:D.decks},(_,i)=>production.root.getObjectByName(`${run.name}-tongue-${i+1}`))}));
    for(const run of transfers)for(let deck=0;deck<D.decks;deck++){
      for(const end of ['floor','deck']){
        const roller=production.root.getObjectByName(`${run.name}-level-${deck+1}-${end}-joint`);
        assert.ok(roller,'every branch has a physical roller at both ends');
        const point=roller.getWorldPosition(new T.Vector3());
        assert.ok(Math.abs(point.x-run[`${end}X`])<1e-6);
        assert.ok(Math.abs(point.y+.035-(base-.005+(end==='deck'?deck*D.deckPitch:0)))<1e-6,'branch rollers join the exact floor/deck level');
      }
    }
    assert.equal(production.root.getObjectByName('GK-outfeed-lift'),undefined,'the vertical lift has been replaced by converging branches');
    kit.optimize({preserveRepeated:true});
    const active=new Map(['CR','TY','BS','GR','GK','GP'].map(id=>[id,{status:'running'}]));
    const options={preview:true,active,showInterior:true},floorIn=new Set(),floorOut=new Set();
    for(let step=0;step<1000;step++){
      production.updateMotion(step===0?0:.1,options);scene.updateMatrixWorld(true);
      for(const run of transfers){
        assert.equal(run.tongues.filter(t=>t.visible).length,1,'only one roller tongue occupies the common throat');
        for(const p of production.products){
          if(p.kind!=='panel'||!p.object.visible||Math.abs(p.object.position.z-25-D.z)>.01)continue;
          const x=p.object.position.x+8,t=(x-run.floorX)/(run.deckX-run.floorX);
          if(t<0||t>1)continue;
          run.seen.add(p.deckIndex);
          assert.equal(run.tongues[p.deckIndex].visible,true,'the selected branch supports the current sheet');
          if(p.deckIndex>0&&t>.3&&t<.7)assert.ok(Math.abs(p.object.rotation.z)>.01,'the sheet follows the inclined path');
          for(let i=0;i<=24;i++){
            const underside=new T.Vector3(-1.2+i*.1,.005,0).applyMatrix4(p.object.matrixWorld);
            const u=(underside.x-run.floorX)/(run.deckX-run.floorX);
            const surface=dryerRampProfile(u,p.deckIndex).height-.005;
            assert.ok(underside.y>=surface-1e-5,'the rigid sheet stays above the rollers along its entire length');
          }
        }
      }
      for(const p of production.products){
        if(p.kind!=='panel'||!p.object.visible||Math.abs(p.object.position.z-25-D.z)>.01)continue;
        const x=p.object.position.x+8;
        if(x>D.entryX+D.entryApron+1.2&&x<D.entryX+D.entryApron+4){floorIn.add(p.deckIndex);assert.equal(p.object.position.y,base);}
        if(x<D.exitX-D.exitApron-1.2&&x>D.exitX-D.exitApron-4){floorOut.add(p.deckIndex);assert.equal(p.object.position.y,base);}
      }
    }
    for(const run of transfers)assert.deepEqual([...run.seen].sort(),[0,1,2,3,4]);
    assert.deepEqual([...floorIn].sort(),[0,1,2,3,4]);assert.deepEqual([...floorOut].sort(),[0,1,2,3,4]);
    const positions=production.products.map(p=>p.object.position.clone());active.get('GK').status='offline';production.updateMotion(.7,options);
    production.products.forEach((p,i)=>{if(p.kind==='panel')assert.ok(p.object.position.equals(positions[i]),'stopped sheets hold their position');});
  }finally{kit.dispose();globalThis.document=previous;}
});
