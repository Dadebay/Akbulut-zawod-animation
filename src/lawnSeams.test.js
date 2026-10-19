import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createKit} from './industrial/kit.js';
import {createVegetation} from './industrial/vegetation.js';
import {buildOldCampus} from './industrial/oldCampus.js';

test('joined pavilion lawns have one level surface across former patch edges',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,key)=>o[key]??(()=>{})})})};
  const scene=new T.Scene(),k=createKit(scene,{tablet:true});
  try{
    buildOldCampus(k,createVegetation(k));scene.updateMatrixWorld(true);
    const grass=[];scene.traverse(o=>{if(o.isMesh&&o.material===k.m.grass)grass.push(o);});
    const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,3);
    for(const [cx,cz,dx,dz] of [[32.4,-65,1,0],[40.5,-62,1,0],[50,-63.2,0,1],[76,-70,1,0],[31,-72.5,1,0]]){
      for(let i=-5;i<=5;i++){
        const x=cx+dx*(i*.07+.013),z=cz+dz*(i*.07+.013);
        ray.ray.origin.set(x,2,z);
        const hits=ray.intersectObjects(grass,false).filter(h=>h.face.normal.y>.9&&h.point.y>.1);
        assert.equal(hits.length,1,`a single lawn, without gaps or overlays, at ${x}, ${z}`);
        assert.ok(Math.abs(hits[0].point.y-.2)<1e-6,`no step at ${x}, ${z}`);
        assert.equal(hits[0].object.castShadow,false,'lawn edges cannot cast seam shadows');
      }
    }
    // The joined surface must still follow the angled kerb, not fill the road.
    for(const [x,z] of [[34,-73],[39,-70.6],[50,-66],[70,-73]]){
      ray.ray.origin.set(x,2,z);
      assert.equal(ray.intersectObjects(grass,false).filter(h=>h.point.y>.1).length,0,'asphalt stays outside the lawn');
    }
  }finally{k.dispose();globalThis.document=previous;}
});
