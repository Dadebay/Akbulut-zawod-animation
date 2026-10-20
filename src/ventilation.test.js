import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {buildSite} from './industrial/site.js';
import {poolSurfaces,batchAssemblies} from './industrial/surfaceBatching.js';

test('all facade fans rotate after batching while their housings remain fixed',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createLinearGradient:()=>({addColorStop(){}}),
    measureText:text=>({width:text.length*20}),
  },{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    const site=buildSite(k),vents=scene.getObjectByName('production-hall-ventilation');
    // Exercise the actual fan geometry through the production batching path.
    scene.attach(vents);
    for(const child of [...scene.children])if(child!==vents)scene.remove(child);
    const fans=[...vents.children],rotors=fans.map(f=>f.getObjectByName(`${f.name}-rotor`));
    assert.equal(rotors.length,10);assert.ok(rotors.every(Boolean));
    const fixed=fans.map(f=>f.quaternion.clone());
    poolSurfaces(k);k.optimize({preserveRepeated:true});const refresh=batchAssemblies(k);
    const matrices=()=>{
      const result=[];
      scene.traverse(o=>{if(o.isBatchedMesh)for(let i=0;i<o.instanceCount;i++){
        const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);result.push(matrix);
      }});
      return result;
    };
    refresh();const before=matrices();
    site.updateVentilation(.1);refresh();const after=matrices();
    assert.ok(after.filter((m,i)=>!m.equals(before[i])).length>=10,'rendered blades change orientation');
    assert.ok(after.filter((m,i)=>m.equals(before[i])).length>=10,'fixed grilles stay in place');
    for(const [i,rotor] of rotors.entries()){
      assert.notEqual(rotor.rotation.z,0);
      assert.ok(fans[i].quaternion.equals(fixed[i]));
    }
    const firstAngle=rotors[0].rotation.z;
    site.updateVentilation(0);refresh();
    assert.equal(rotors[0].rotation.z,firstAngle,'zero elapsed time does not advance the fan');
    site.updateVentilation(.1);refresh();
    assert.ok(Math.abs(rotors[0].rotation.z-firstAngle*2)<1e-9,'successive frames keep a steady speed');
  }finally{k.dispose();globalThis.document=previous;}
});
