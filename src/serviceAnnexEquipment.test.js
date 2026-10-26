import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildProduction} from './industrial/production.js';
import {REAR_SERVICE_YARD} from './industrial/rearServiceYard.js';
import {prepareCadInteriors} from './industrial/cadInteriors.js';

test('marked annexes contain equipment inside the real shells with connected services and a clear aisle',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const p=buildProduction(k);p.root.position.set(8,0,-25);scene.updateMatrixWorld(true);
    const entries=p.interiorInventory.filter(e=>e.enclosure),bounds=[];
    assert.equal(entries.filter(e=>e.enclosure==='rear-hall-link').length,9);
    assert.equal(entries.filter(e=>e.enclosure==='rear-service-room').length,4);
    const aisle=new T.Box3(new T.Vector3(-14.55,.1,-5.4),new T.Vector3(-7.8,2.4,-3.6));
    for(const e of entries){
      const building=REAR_SERVICE_YARD.buildings.find(b=>b.name===e.enclosure);
      const envelope=new T.Box3(new T.Vector3(building.x-building.width/2+.18,.04,building.z-building.depth/2+.18),new T.Vector3(building.x+building.width/2-.18,building.height-.14,building.z+building.depth/2-.18));
      const g=p.root.getObjectByName(`interior-${e.id}`),b=new T.Box3().setFromObject(g);
      assert.ok(envelope.containsBox(b),`${e.id}: inside shell ${b.min.toArray()} / ${b.max.toArray()}`);
      assert.equal(b.intersectsBox(aisle),false,`${e.id}: door-to-door aisle`);
      assert.equal(e.illustrative,true);
      for(const [name,other] of bounds)assert.equal(b.intersectsBox(other),false,`${e.id} overlaps ${name}`);
      bounds.push([g.name,b]);
      for(const port of Object.values(g.userData.ports||{})){
        if(e.id==='annex-water-tank'&&port.name==='fill')continue; // Capped refill connection.
        assert.ok(port.connected||port.open,`${e.id}.${port.name}: connected or an air intake`);
      }
    }
    let connections=0;
    p.root.traverse(g=>{
      if((g.name.startsWith('interior-')||g.name.startsWith('machine-'))&&!g.userData.equipment?.enclosure){
        const b=new T.Box3().setFromObject(g);
        for(const [name,other] of bounds)assert.equal(b.intersectsBox(other),false,`${name} overlaps existing ${g.name}`);
      }
      const c=g.userData.connection;if(!c||!c.fromMachine.startsWith('interior-annex-'))return;
      connections++;
      const path=g.geometry.parameters.path,points=path.getSpacedPoints(Math.ceil(path.getLength()/.1)).map(v=>v.applyMatrix4(g.matrixWorld));
      const annex=REAR_SERVICE_YARD.buildings.find(b=>b.name==='rear-hall-link');
      for(const v of points){
        assert.ok(v.x>annex.x-annex.width/2+.1&&v.x<annex.x+annex.width/2-.1&&v.z>annex.z-annex.depth/2+.1&&v.z<annex.z+annex.depth/2-.1&&v.y<annex.height-.1,'service pipe remains inside');
        assert.equal(aisle.containsPoint(v),false,'no low pipe across the entrance aisle');
      }
      for(const [name,b] of bounds){
        if(name===c.fromMachine||name===c.toMachine)continue;
        assert.equal(points.some(v=>b.clone().expandByScalar(-.06).containsPoint(v)),false,`${c.fromMachine} → ${c.toMachine} crosses ${name}`);
      }
    });
    assert.equal(connections,6,'water, compressed-air and ventilation circuits');
    const cad=prepareCadInteriors(k,p.root);
    for(const id of ['annex-vent-fan-1','annex-vent-fan-2'])assert.ok(cad.slots.some(s=>s.machine.userData.equipment.id===id),`${id}: detailed CAD shell`);
    assert.ok(p.root.getObjectByName('rear-hall-link-interior-floor'),'annex floor survives cutaway');
  }finally{k.dispose();globalThis.document=previous;}
});
